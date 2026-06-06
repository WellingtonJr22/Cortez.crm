import type { Config, Context } from "@netlify/functions";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import {
  hashPassword,
  verifyPassword,
  signSession,
  getSessionUser,
  sessionCookie,
  clearSessionCookie,
  json,
} from "../lib/auth.mjs";

type DbUser = typeof users.$inferSelect;

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

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default async (req: Request, context: Context) => {
  const action = context.params.action;

  try {
    if (action === "signup" && req.method === "POST") return signup(req);
    if (action === "login" && req.method === "POST") return login(req);
    if (action === "logout" && req.method === "POST") return logout();
    if (action === "me" && req.method === "GET") return me(req);
    return json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("auth error", err);
    return json({ error: "Internal error" }, { status: 500 });
  }
};

async function signup(req: Request): Promise<Response> {
  const { email, password, full_name } = (await req
    .json()
    .catch(() => ({}))) as { email?: string; password?: string; full_name?: string };
  const normEmail = String(email || "").trim().toLowerCase();
  if (!isEmail(normEmail) || !password || String(password).length < 6) {
    return json(
      { error: "Email válido e senha (mín. 6 caracteres) são obrigatórios." },
      { status: 400 },
    );
  }

  // Is this the very first account? If so it becomes the admin.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  const isFirstUser = Number(count) === 0;

  const existing = (
    await db.select().from(users).where(eq(users.email, normEmail))
  )[0];

  // Claim a pending invite: a row exists for this email but has no password yet.
  if (existing) {
    if (existing.passwordHash) {
      return json({ error: "Este email já está cadastrado." }, { status: 409 });
    }
    const [claimed] = await db
      .update(users)
      .set({
        passwordHash: hashPassword(password),
        fullName: full_name?.trim() || existing.fullName || normEmail.split("@")[0],
        status: "active",
      })
      .where(eq(users.id, existing.id))
      .returning();
    return issueSession(claimed, 201);
  }

  const [created] = await db
    .insert(users)
    .values({
      email: normEmail,
      passwordHash: hashPassword(password),
      fullName: full_name?.trim() || normEmail.split("@")[0],
      // First user is admin; everyone else self-registers as atendente.
      role: isFirstUser ? "admin" : "atendente",
      status: "active",
    })
    .returning();

  return issueSession(created, 201);
}

async function login(req: Request): Promise<Response> {
  const { email, password } = (await req
    .json()
    .catch(() => ({}))) as { email?: string; password?: string };
  const normEmail = String(email || "").trim().toLowerCase();
  if (!normEmail || !password) {
    return json({ error: "Email e senha são obrigatórios." }, { status: 400 });
  }

  const user = (
    await db.select().from(users).where(eq(users.email, normEmail))
  )[0];
  if (!user || !verifyPassword(String(password), user.passwordHash)) {
    return json({ error: "Email ou senha incorretos." }, { status: 401 });
  }
  if (user.status === "suspended") {
    return json({ error: "Conta suspensa. Contate um administrador." }, { status: 403 });
  }
  if (!user.passwordHash) {
    return json({ error: "Conta ainda não ativada. Conclua o cadastro." }, { status: 403 });
  }

  return issueSession(user, 200);
}

function logout(): Response {
  return json(
    { ok: true },
    { headers: { "Set-Cookie": clearSessionCookie() } },
  );
}

async function me(req: Request): Promise<Response> {
  const session = await getSessionUser(req);
  if (!session) return json({ error: "Não autenticado." }, { status: 401 });

  const user = (
    await db.select().from(users).where(eq(users.id, session.sub))
  )[0];
  if (!user || user.status === "suspended") {
    return json({ error: "Não autenticado." }, { status: 401 });
  }
  return json({ user: publicUser(user) });
}

async function issueSession(user: DbUser, status: number): Promise<Response> {
  const token = await signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  return json(
    { user: publicUser(user) },
    { status, headers: { "Set-Cookie": sessionCookie(token) } },
  );
}

export const config: Config = {
  path: "/api/auth/:action",
};
