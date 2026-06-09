// Shared helpers for the CRM data functions (leads, messages, automations).
// Centralises JSON serialization (DB camelCase → the snake_case / *_date shape
// the React app expects), the role-based visibility rule and the server-side
// assignment rules. Security note: roles and assignment targets are ALWAYS
// resolved from the authenticated session and validated against the database —
// the client cannot grant itself visibility or reassign a lead it does not own
// just by changing the request body.
//   • admins see every lead and may assign any active attendant
//   • attendants see only the leads assigned to them and may never reassign
import { or, eq, and } from "drizzle-orm";
import type { SessionPayload } from "./auth.mjs";
import { db } from "../../db/index.js";
import { leads, users } from "../../db/schema.js";

type Lead = typeof leads.$inferSelect;

export function isAdmin(session: SessionPayload): boolean {
  return session.role === "admin";
}

// Drizzle WHERE clause limiting non-admins to the leads assigned to them. A lead
// is "theirs" when it is assigned to them (assignedToUserId — the canonical rule)
// or, for leads created before assignment existed, when they registered it
// (ownerId) or a conversation was forwarded to their email (attendantEmail).
// Admins pass `undefined` so the caller selects every row.
export function visibleLeadsWhere(session: SessionPayload) {
  if (isAdmin(session)) return undefined;
  return or(
    eq(leads.assignedToUserId, session.sub),
    eq(leads.ownerId, session.sub),
    eq(leads.attendantEmail, session.email),
  );
}

export function canSeeLead(session: SessionPayload, lead: Lead): boolean {
  if (isAdmin(session)) return true;
  return (
    lead.assignedToUserId === session.sub ||
    lead.ownerId === session.sub ||
    lead.attendantEmail === session.email
  );
}

// Serialize a lead to the shape the frontend consumes (snake_case, *_date timestamps).
// The responsible attendant is exposed both as assigned_to_* (canonical) and the
// legacy attendant_* keys so existing UI keeps working.
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
    // Canonical assignment fields.
    assigned_to_user_id: l.assignedToUserId,
    assigned_to_name: l.attendantName,
    assigned_to_email: l.attendantEmail,
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
// nullable columns so Postgres receives clean values. NOTE: the assignment
// columns (assignedToUserId / attendantName / attendantEmail) are intentionally
// NOT written here — they are resolved server-side by resolveAssignment().
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
  text("notes", "notes");
  text("last_message_preview", "lastMessagePreview");
  nullable("birthday", "birthday");
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

type AssignmentPatch = Pick<
  Lead,
  "assignedToUserId" | "attendantName" | "attendantEmail"
>;

export type AssignmentResult =
  | { ok: true; patch: Partial<AssignmentPatch> }
  | { ok: false; error: string; status: number };

// Resolve who a lead is assigned to, enforced from the trusted session:
//   • Attendant on CREATE  → always assigned to themselves.
//   • Attendant on UPDATE  → cannot change the assignment (returns empty patch).
//   • Admin                → may set `assigned_to_user_id` to any ACTIVE attendant,
//                            or clear it (null) to leave the lead unassigned. The
//                            attendant's name/email are copied from the database,
//                            never trusted from the request body.
// `mode` distinguishes create vs update so an attendant self-assigns on create
// but keeps the existing owner on update.
export async function resolveAssignment(
  session: SessionPayload,
  body: Record<string, unknown>,
  mode: "create" | "update",
): Promise<AssignmentResult> {
  if (!isAdmin(session)) {
    // Attendants never assign to anyone else.
    if (mode === "update") return { ok: true, patch: {} };
    const self = await getUserById(session.sub);
    return {
      ok: true,
      patch: {
        assignedToUserId: session.sub,
        attendantName: self?.fullName || session.email,
        attendantEmail: session.email,
      },
    };
  }

  // Admin: only touch assignment when the client explicitly sent the field.
  if (!("assigned_to_user_id" in body)) return { ok: true, patch: {} };

  const target = body.assigned_to_user_id;
  if (target === null || target === "" || target === undefined) {
    return {
      ok: true,
      patch: { assignedToUserId: null, attendantName: "", attendantEmail: null },
    };
  }

  const attendant = await getUserById(String(target));
  if (!attendant) {
    return { ok: false, error: "Atendente não encontrado.", status: 400 };
  }
  if (attendant.role !== "atendente" || attendant.status !== "active") {
    return {
      ok: false,
      error: "Só é possível atribuir a um atendente ativo.",
      status: 400,
    };
  }
  return {
    ok: true,
    patch: {
      assignedToUserId: attendant.id,
      attendantName: attendant.fullName || attendant.email,
      attendantEmail: attendant.email,
    },
  };
}

async function getUserById(id: string) {
  return (await db.select().from(users).where(eq(users.id, id)))[0] || null;
}

// Active attendants available to be assigned (used by the lead/chat pickers).
export async function listActiveAttendants() {
  return db
    .select()
    .from(users)
    .where(and(eq(users.role, "atendente"), eq(users.status, "active")));
}
