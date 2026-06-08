import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { leads, messages } from "../../db/schema.js";
import { getSessionUser, json } from "../lib/auth.mjs";
import { canSeeLead } from "../lib/crm.mjs";

type Message = typeof messages.$inferSelect;

function publicMessage(m: Message) {
  return {
    id: m.id,
    lead_id: m.leadId,
    content: m.content,
    sender_type: m.senderType,
    sender_name: m.senderName,
    message_type: m.messageType,
    file_url: m.fileUrl,
    created_date: m.createdAt,
  };
}

// Chat messages for a lead's conversation. A user may only read or post messages
// on a lead they are allowed to see (own/assigned, or any lead for an admin).
export default async (req: Request) => {
  const session = await getSessionUser(req);
  if (!session) return json({ error: "Não autenticado." }, { status: 401 });

  try {
    if (req.method === "GET") return list(req, session);
    if (req.method === "POST") return create(req, session);
    return json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("messages error", err);
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
  const rows = await db.select().from(messages).where(eq(messages.leadId, leadId));
  return json(rows.map(publicMessage));
}

async function create(req: Request, session): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const leadId = String(body.lead_id || "");
  const lead = await requireVisibleLead(leadId, session);
  if (!lead) return json({ error: "Lead não encontrado." }, { status: 404 });

  const [created] = await db
    .insert(messages)
    .values({
      leadId,
      content: body.content != null ? String(body.content) : "",
      senderType: body.sender_type ? String(body.sender_type) : "humano",
      senderName: body.sender_name ? String(body.sender_name) : "",
      messageType: body.message_type ? String(body.message_type) : "text",
      fileUrl: body.file_url ? String(body.file_url) : null,
    })
    .returning();

  return json(publicMessage(created), { status: 201 });
}

export const config: Config = {
  path: "/api/messages",
};
