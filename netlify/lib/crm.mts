// Shared helpers for the CRM data functions (leads, messages, automations).
// Centralises JSON serialization (DB camelCase → the snake_case / *_date shape
// the React app expects) and the role-based visibility rule:
//   • admins see everything
//   • everyone else sees only the leads they own or are assigned to
import { or, eq } from "drizzle-orm";
import type { SessionPayload } from "./auth.mjs";
import { leads } from "../../db/schema.js";

type Lead = typeof leads.$inferSelect;

export function isAdmin(session: SessionPayload): boolean {
  return session.role === "admin";
}

// Drizzle WHERE clause limiting non-admins to their own leads. A lead is "theirs"
// when they registered it (ownerId) or a conversation was assigned to their email
// (attendantEmail, set when a chat is transferred/forwarded). Admins pass `undefined`
// so the caller selects every row.
export function visibleLeadsWhere(session: SessionPayload) {
  if (isAdmin(session)) return undefined;
  return or(eq(leads.ownerId, session.sub), eq(leads.attendantEmail, session.email));
}

export function canSeeLead(session: SessionPayload, lead: Lead): boolean {
  if (isAdmin(session)) return true;
  return lead.ownerId === session.sub || lead.attendantEmail === session.email;
}

// Serialize a lead to the shape the frontend consumes (snake_case, *_date timestamps).
export function publicLead(l: Lead) {
  return {
    id: l.id,
    name: l.name,
    phone: l.phone,
    email: l.email,
    source: l.source,
    birthday: l.birthday,
    notes: l.notes,
    stage: l.stage,
    attendant_type: l.attendantType,
    attendant_name: l.attendantName,
    attendant_email: l.attendantEmail,
    tags: l.tags,
    needs_human: l.needsHuman,
    cart_abandoned: l.cartAbandoned,
    resolved: l.resolved,
    last_message_preview: l.lastMessagePreview,
    sale_value: l.saleValue,
    sale_date: l.saleDate,
    renewal_date: l.renewalDate,
    loss_reason: l.lossReason,
    created_by: l.createdBy,
    owner_id: l.ownerId,
    created_date: l.createdAt,
    updated_date: l.updatedAt,
  };
}

// Map an incoming lead payload (snake_case from the app) onto Drizzle columns,
// keeping only writable fields and normalising empty strings for the numeric /
// nullable columns so Postgres receives clean values.
const emptyToNull = (v: unknown) =>
  v === "" || v === undefined ? null : v;

export function leadPatchFromBody(body: Record<string, unknown>): Partial<Lead> {
  const patch: Record<string, unknown> = {};
  const text = (k: string, col: string) => {
    if (body[k] !== undefined) patch[col] = body[k] === null ? "" : String(body[k]);
  };
  const nullable = (k: string, col: string) => {
    if (body[k] !== undefined) patch[col] = emptyToNull(body[k]);
  };
  const bool = (k: string, col: string) => {
    if (body[k] !== undefined) patch[col] = Boolean(body[k]);
  };

  text("name", "name");
  text("phone", "phone");
  text("email", "email");
  text("source", "source");
  text("stage", "stage");
  text("attendant_type", "attendantType");
  text("attendant_name", "attendantName");
  text("notes", "notes");
  text("last_message_preview", "lastMessagePreview");
  nullable("birthday", "birthday");
  nullable("attendant_email", "attendantEmail");
  nullable("sale_value", "saleValue");
  nullable("sale_date", "saleDate");
  nullable("renewal_date", "renewalDate");
  nullable("loss_reason", "lossReason");
  bool("needs_human", "needsHuman");
  bool("cart_abandoned", "cartAbandoned");
  bool("resolved", "resolved");
  if (body.tags !== undefined) {
    patch.tags = Array.isArray(body.tags) ? body.tags : [];
  }

  return patch as Partial<Lead>;
}
