import type { Config, Context } from "@netlify/functions";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { getSessionUser, json } from "../lib/auth.mjs";

type DbUser = typeof users.$inferSelect;

const ROLES = ["admin", "atendente", "vendedor"];
const STATUSES = ["active", "invited", "suspended"];

function publicUser(u: DbUser) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.fullName,
    role: u.role,
    status: u.status,
    created_at: u.createdAt,
  };
}

export default async (req: Request, context: Context) => {
  const session = await getSessionUser(req);
  if (!session) return json({ error: "Não autenticado." }, { status: 401 });

  const id = context.params.id;

  try {
    if (req.method === "GET" && !id) return list();

    // All mutations require an admin.
    if (session.role !== "admin") {
      return json({ error: "Apenas administradores." }, { status: 403 });
    }

    if (req.method === "POST" && !id) return invite(req);
    if (req.method === "PATCH" && id) return update(id, req, session.sub);
    if (req.method === "DELETE" && id) return remove(id, session.sub);

    return json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("users error", err);
    return json({ error: "Internal error" }, { status: 500 });
  }
};

async function list(): Promise<Response> {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  return json(rows.map(publicUser));
}

async function invite(req: Request): Promise<Response> {
  const { email, role } = (await req
    .json()
    .catch(() => ({}))) as { email?: string; role?: string };
  const normEmail = String(email || "").trim().toLowerCase();
  if (!normEmail) return json({ error: "Email inválido." }, { status: 400 });
  const finalRole = ROLES.includes(role) ? role : "atendente";

  const existing = (
    await db.select().from(users).where(eq(users.email, normEmail))
  )[0];
  if (existing) return json({ error: "Usuário já existe." }, { status: 409 });

  // Invited users have no password until they complete signup with this email.
  const [created] = await db
    .insert(users)
    .values({
      email: normEmail,
      fullName: normEmail.split("@")[0],
      role: finalRole,
      status: "invited",
    })
    .returning();
  return json(publicUser(created), { status: 201 });
}

async function update(id: string, req: Request, selfId: string): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    role?: string;
    status?: string;
    full_name?: string;
  };
  const patch: Partial<DbUser> = {};

  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) {
      return json({ error: "Função inválida." }, { status: 400 });
    }
    if (id === selfId && body.role !== "admin") {
      return json({ error: "Você não pode rebaixar sua própria conta." }, { status: 400 });
    }
    patch.role = body.role;
  }

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return json({ error: "Status inválido." }, { status: 400 });
    }
    if (id === selfId && body.status !== "active") {
      return json({ error: "Você não pode suspender sua própria conta." }, { status: 400 });
    }
    patch.status = body.status;
  }

  if (body.full_name !== undefined) patch.fullName = String(body.full_name);

  if (Object.keys(patch).length === 0) {
    return json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, id))
    .returning();
  if (!updated) return json({ error: "Usuário não encontrado." }, { status: 404 });
  return json(publicUser(updated));
}

async function remove(id: string, selfId: string): Promise<Response> {
  if (id === selfId) {
    return json({ error: "Você não pode remover a própria conta." }, { status: 400 });
  }
  const target = (await db.select().from(users).where(eq(users.id, id)))[0];
  if (!target) return json({ error: "Usuário não encontrado." }, { status: 404 });

  // Never remove the last remaining admin.
  if (target.role === "admin") {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, "admin"));
    if (Number(count) <= 1) {
      return json({ error: "Não é possível remover o último administrador." }, { status: 400 });
    }
  }

  await db.delete(users).where(eq(users.id, id));
  return json({ ok: true });
}

export const config: Config = {
  path: ["/api/users", "/api/users/:id"],
};
