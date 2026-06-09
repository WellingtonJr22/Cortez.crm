import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { leads } from "../../db/schema.js";
import { getSessionUser, json } from "../lib/auth.mjs";
import {
  visibleLeadsWhere,
  canSeeLead,
  publicLead,
  leadPatchFromBody,
  resolveAssignment,
} from "../lib/crm.mjs";

// CRM leads (clients). Attendants only see/modify the leads they own or are
// assigned to; admins have full access to every lead.
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
    console.error("leads error", err);
    return json({ error: "Internal error" }, { status: 500 });
  }
};

async function list(session): Promise<Response> {
  const where = visibleLeadsWhere(session);
  const rows = where
    ? await db.select().from(leads).where(where)
    : await db.select().from(leads);
  return json(rows.map(publicLead));
}

async function create(req: Request, session): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = leadPatchFromBody(body);
  const name = String(patch.name ?? "").trim();
  if (!name) return json({ error: "Nome é obrigatório." }, { status: 400 });

  // Who the lead is assigned to is decided on the server from the session:
  // an attendant always gets their own leads; an admin may pick any active
  // attendant (or leave it unassigned).
  const assignment = await resolveAssignment(session, body, "create");
  if (!assignment.ok) {
    return json({ error: assignment.error }, { status: assignment.status });
  }

  const [created] = await db
    .insert(leads)
    .values({
      ...patch,
      ...assignment.patch,
      name,
      // The creator is recorded as owner (back-compat / fallback visibility).
      ownerId: session.sub,
      createdBy: session.email,
    })
    .returning();

  return json(publicLead(created), { status: 201 });
}

async function update(id: string, req: Request, session): Promise<Response> {
  const existing = (await db.select().from(leads).where(eq(leads.id, id)))[0];
  if (!existing || !canSeeLead(session, existing)) {
    return json({ error: "Lead não encontrado." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = leadPatchFromBody(body) as Record<string, unknown>;

  // Reassignment is admin-only and validated server-side; attendants keep the
  // existing responsible attendant no matter what the request body claims.
  const assignment = await resolveAssignment(session, body, "update");
  if (!assignment.ok) {
    return json({ error: assignment.error }, { status: assignment.status });
  }
  Object.assign(patch, assignment.patch);
  patch.updatedAt = new Date();

  const [updated] = await db
    .update(leads)
    .set(patch)
    .where(eq(leads.id, id))
    .returning();
  return json(publicLead(updated));
}

async function remove(id: string, session): Promise<Response> {
  const existing = (await db.select().from(leads).where(eq(leads.id, id)))[0];
  if (!existing || !canSeeLead(session, existing)) {
    return json({ error: "Lead não encontrado." }, { status: 404 });
  }
  await db.delete(leads).where(eq(leads.id, id));
  return json({ ok: true });
}

export const config: Config = {
  path: ["/api/leads", "/api/leads/:id"],
};
