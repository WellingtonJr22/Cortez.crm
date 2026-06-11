import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { leadActivities, leads } from "../../db/schema.js";
import { getSessionUser, json } from "../lib/auth.mjs";
import { canSeeLead } from "../lib/crm.mjs";

type LeadActivity = typeof leadActivities.$inferSelect;

function publicActivity(a: LeadActivity) {
  return {
    id: a.id,
    lead_id: a.leadId,
    contact_type: a.contactType,
    contact_date: a.contactDate,
    customer_feedback: a.customerFeedback,
    summary: a.summary,
    next_action_type: a.nextActionType,
    next_action_date: a.nextActionDate,
    status: a.status,
    owner_id: a.ownerId,
    created_date: a.createdAt,
    updated_date: a.updatedAt,
  };
}

// Parse an incoming date string/timestamp into a Date, or null when absent/invalid.
function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Per-client service history (Histórico de Atendimento). A user may only read or
// write activities on a lead they are allowed to see (own/assigned, or any lead
// for an admin) — the same visibility rule used by messages.
export default async (req: Request, context: Context) => {
  const session = await getSessionUser(req);
  if (!session) return json({ error: "Não autenticado." }, { status: 401 });

  const id = context.params.id;

  try {
    if (req.method === "GET" && !id) return list(req, session);
    if (req.method === "POST" && !id) return create(req, session);
    if (req.method === "PATCH" && id) return update(id, req, session);
    if (req.method === "DELETE" && id) return remove(id, session);
    return json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("lead-activities error", err);
    return json({ error: "Internal error" }, { status: 500 });
  }
};

async function requireVisibleLead(leadId: string, session) {
  if (!leadId) return null;
  const lead = (await db.select().from(leads).where(eq(leads.id, leadId)))[0];
  if (!lead || !canSeeLead(session, lead)) return null;
  return lead;
}

async function list(req: Request, session): Promise<Response> {
  const leadId = new URL(req.url).searchParams.get("lead_id") || "";
  const lead = await requireVisibleLead(leadId, session);
  if (!lead) return json([]);
  const rows = await db
    .select()
    .from(leadActivities)
    .where(eq(leadActivities.leadId, leadId));
  return json(rows.map(publicActivity));
}

async function create(req: Request, session): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const leadId = String(body.lead_id || "");
  const lead = await requireVisibleLead(leadId, session);
  if (!lead) return json({ error: "Lead não encontrado." }, { status: 404 });

  const [created] = await db
    .insert(leadActivities)
    .values({
      leadId,
      contactType: body.contact_type ? String(body.contact_type) : "call",
      contactDate: toDate(body.contact_date) ?? new Date(),
      customerFeedback:
        body.customer_feedback != null ? String(body.customer_feedback) : "",
      summary: body.summary != null ? String(body.summary) : "",
      nextActionType: body.next_action_type
        ? String(body.next_action_type)
        : null,
      nextActionDate: toDate(body.next_action_date),
      status: body.status ? String(body.status) : "pending",
      ownerId: session.sub,
    })
    .returning();

  return json(publicActivity(created), { status: 201 });
}

// An activity can be modified if its lead is visible to the session.
async function requireModifiable(id: string, session): Promise<LeadActivity | null> {
  const row = (await db.select().from(leadActivities).where(eq(leadActivities.id, id)))[0];
  if (!row) return null;
  const lead = await requireVisibleLead(row.leadId, session);
  if (!lead) return null;
  return row;
}

async function update(id: string, req: Request, session): Promise<Response> {
  if (!(await requireModifiable(id, session))) {
    return json({ error: "Atividade não encontrada." }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.contact_type !== undefined) patch.contactType = String(body.contact_type);
  if (body.contact_date !== undefined) patch.contactDate = toDate(body.contact_date);
  if (body.customer_feedback !== undefined)
    patch.customerFeedback = body.customer_feedback == null ? "" : String(body.customer_feedback);
  if (body.summary !== undefined) patch.summary = body.summary == null ? "" : String(body.summary);
  if (body.next_action_type !== undefined)
    patch.nextActionType = body.next_action_type ? String(body.next_action_type) : null;
  if (body.next_action_date !== undefined)
    patch.nextActionDate = toDate(body.next_action_date);
  if (body.status !== undefined) patch.status = String(body.status);

  const [updated] = await db
    .update(leadActivities)
    .set(patch)
    .where(eq(leadActivities.id, id))
    .returning();
  return json(publicActivity(updated));
}

async function remove(id: string, session): Promise<Response> {
  if (!(await requireModifiable(id, session))) {
    return json({ error: "Atividade não encontrada." }, { status: 404 });
  }
  await db.delete(leadActivities).where(eq(leadActivities.id, id));
  return json({ ok: true });
}

export const config: Config = {
  path: ["/api/lead-activities", "/api/lead-activities/:id"],
};
