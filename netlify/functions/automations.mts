import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { automations } from "../../db/schema.js";
import { getSessionUser, json } from "../lib/auth.mjs";
import { isAdmin } from "../lib/crm.mjs";

type Automation = typeof automations.$inferSelect;

function publicAutomation(a: Automation) {
  return {
    id: a.id,
    lead_id: a.leadId,
    type: a.type,
    status: a.status,
    trigger_date: a.triggerDate,
    message_content: a.messageContent,
    notes: a.notes,
    owner_id: a.ownerId,
    created_date: a.createdAt,
    updated_date: a.updatedAt,
  };
}

// Post-sale / marketing automations. Attendants see the automations they
// generated; admins see all of them.
export default async (req: Request, context: Context) => {
  const session = await getSessionUser(req);
  if (!session) return json({ error: "Não autenticado." }, { status: 401 });

  const id = context.params.id;

  try {
    if (req.method === "GET" && !id) return list(session);
    if (req.method === "POST" && !id) return create(req, session);
    if (req.method === "PATCH" && id) return update(id, req, session);
    if (req.method === "DELETE" && id) return remove(id, session);
    return json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("automations error", err);
    return json({ error: "Internal error" }, { status: 500 });
  }
};

async function list(session): Promise<Response> {
  const rows = isAdmin(session)
    ? await db.select().from(automations)
    : await db.select().from(automations).where(eq(automations.ownerId, session.sub));
  return json(rows.map(publicAutomation));
}

async function create(req: Request, session): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const [created] = await db
    .insert(automations)
    .values({
      leadId: body.lead_id ? String(body.lead_id) : null,
      type: body.type ? String(body.type) : "follow_up",
      status: body.status ? String(body.status) : "pending",
      triggerDate: body.trigger_date ? String(body.trigger_date) : null,
      messageContent: body.message_content ? String(body.message_content) : null,
      notes: body.notes ? String(body.notes) : null,
      ownerId: session.sub,
    })
    .returning();
  return json(publicAutomation(created), { status: 201 });
}

async function canModify(id: string, session): Promise<Automation | null> {
  const row = (await db.select().from(automations).where(eq(automations.id, id)))[0];
  if (!row) return null;
  if (!isAdmin(session) && row.ownerId !== session.sub) return null;
  return row;
}

async function update(id: string, req: Request, session): Promise<Response> {
  if (!(await canModify(id, session))) {
    return json({ error: "Automação não encontrada." }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status !== undefined) patch.status = String(body.status);
  if (body.type !== undefined) patch.type = String(body.type);
  if (body.trigger_date !== undefined) patch.triggerDate = body.trigger_date ? String(body.trigger_date) : null;
  if (body.message_content !== undefined) patch.messageContent = body.message_content ? String(body.message_content) : null;
  if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes) : null;

  const [updated] = await db
    .update(automations)
    .set(patch)
    .where(eq(automations.id, id))
    .returning();
  return json(publicAutomation(updated));
}

async function remove(id: string, session): Promise<Response> {
  if (!(await canModify(id, session))) {
    return json({ error: "Automação não encontrada." }, { status: 404 });
  }
  await db.delete(automations).where(eq(automations.id, id));
  return json({ ok: true });
}

export const config: Config = {
  path: ["/api/automations", "/api/automations/:id"],
};
