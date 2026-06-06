// Shared authentication helpers for Netlify Functions.
// Uses only Node's built-in crypto: scrypt for password hashing and an
// HMAC-signed token (JWT-like) for stateless sessions. No external auth deps.
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { getStore } from "@netlify/blobs";

const SESSION_COOKIE = "cortez_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

// ─── Signing secret ──────────────────────────────────────────────────────────
// Prefer the AUTH_JWT_SECRET environment variable. If it is not configured,
// fall back to a secret generated once and persisted in Netlify Blobs, so the
// app works out of the box while remaining server-private and stable across
// deploys.
let cachedSecret: string | null = null;

async function getSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  const fromEnv = Netlify.env.get("AUTH_JWT_SECRET");
  if (fromEnv) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }
  const store = getStore("auth-config");
  let secret = (await store.get("jwt_secret", { type: "text" })) as string | null;
  if (!secret) {
    secret = randomBytes(48).toString("hex");
    await store.set("jwt_secret", secret);
  }
  cachedSecret = secret;
  return cachedSecret;
}

// ─── Password hashing (scrypt) ───────────────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [saltHex, hashHex] = stored.split(":");
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = scryptSync(password, salt, expected.length);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// ─── Session tokens (HMAC-signed, base64url) ─────────────────────────────────
function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export interface SessionPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
}

export async function signSession(
  payload: Omit<SessionPayload, "exp">,
): Promise<string> {
  const secret = await getSecret();
  const exp = Math.floor(nowSeconds()) + SESSION_MAX_AGE;
  const body = b64url(JSON.stringify({ ...payload, exp }));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const secret = await getSecret();
  const [body, sig] = token.split(".");
  const expected = b64url(createHmac("sha256", secret).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString()) as SessionPayload;
    if (!payload.exp || payload.exp < nowSeconds()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Date.now is fine inside functions (runtime), unlike workflow scripts.
function nowSeconds(): number {
  return Date.now() / 1000;
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────
export function sessionCookie(token: string): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE}`,
  ].join("; ");
}

export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

export function readSessionToken(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=");
  }
  return null;
}

export async function getSessionUser(req: Request): Promise<SessionPayload | null> {
  return verifySession(readSessionToken(req));
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}
