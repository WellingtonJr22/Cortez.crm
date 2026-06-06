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

  const [created] = await db
    .insert(leads)
    .values({
      ...patch,
      name,
      // The creator owns the lead; this is what drives attendant visibility.
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

  const patch = leadPatchFromBody(
    (await req.json().catch(() => ({}))) as Record<string, unknown>,
  );
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
