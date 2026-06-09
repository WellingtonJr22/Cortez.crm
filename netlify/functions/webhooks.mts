import type { Config } from "@netlify/functions";
import { sql, eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "../../db/index.js";
import { leads, messages } from "../../db/schema.js";
import { json } from "../lib/auth.mjs";

// Inbound WhatsApp webhook. WhatsApp providers (Z-API, Evolution, Wati, n8n…)
// POST here whenever a customer sends a message. The URL shown in Settings →
// WhatsApp API points at this endpoint.
//
// Assignment rule (mirrors the request):
//   • Known phone number → the message is appended and the lead keeps its
//     current responsible attendant (assigned_to_user_id is untouched).
//   • New phone number   → a new lead is created WITHOUT a responsible attendant
//     (assigned_to_user_id = null). An admin can then assign it from Chat.
//
// Security: this endpoint is unauthenticated by users, so it is protected by a
// shared secret. Set WHATSAPP_WEBHOOK_SECRET in Netlify and send it back as the
// `x-webhook-secret` header (or `?secret=` query param). When the secret is not
// configured the endpoint is closed (503) rather than left open.

function secretOk(req: Request): boolean {
  const expected = Netlify.env.get("WHATSAPP_WEBHOOK_SECRET");
  if (!expected) return false; // not configured → endpoint disabled
  const url = new URL(req.url);
  const provided =
    req.headers.get("x-webhook-secret") || url.searchParams.get("secret") || "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Not found" }, { status: 404 });
  }
  if (!Netlify.env.get("WHATSAPP_WEBHOOK_SECRET")) {
    return json(
      { error: "Webhook não configurado (defina WHATSAPP_WEBHOOK_SECRET)." },
      { status: 503 },
    );
  }
  if (!secretOk(req)) {
    return json({ error: "Assinatura inválida." }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Accept the common field names used by the various providers.
    const rawPhone = String(
      body.phone ?? body.from ?? body.number ?? body.sender ?? "",
    );
    const digits = rawPhone.replace(/\D/g, "");
    if (!digits) return json({ error: "Telefone ausente." }, { status: 400 });

    const content = String(
      body.content ?? body.message ?? body.text ?? body.body ?? "",
    );
    const name = String(body.name ?? body.push_name ?? body.sender_name ?? "").trim();
    const messageType = String(body.message_type ?? body.type ?? "text");
    const preview = content.slice(0, 120);

    // Match an existing lead by the phone's digits, ignoring formatting.
    const existing = (
      await db
        .select()
        .from(leads)
        .where(sql`regexp_replace(${leads.phone}, '\\D', '', 'g') = ${digits}`)
    )[0];

    let leadId: string;
    let created = false;

    if (existing) {
      leadId = existing.id;
      await db
        .update(leads)
        .set({
          lastMessagePreview: preview || existing.lastMessagePreview,
          needsHuman: existing.attendantType === "humano" ? existing.needsHuman : true,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, existing.id));
    } else {
      // New conversation → unassigned lead handled by the AI stage by default.
      const [lead] = await db
        .insert(leads)
        .values({
          name: name || digits,
          phone: digits,
          source: "whatsapp",
          stage: "atendimento_ia",
          attendantType: "ia",
          needsHuman: false,
          lastMessagePreview: preview,
          assignedToUserId: null,
        })
        .returning();
      leadId = lead.id;
      created = true;
    }

    if (content) {
      await db.insert(messages).values({
        leadId,
        content,
        senderType: "cliente",
        senderName: name,
        messageType,
      });
    }

    return json({ ok: true, lead_id: leadId, created }, { status: created ? 201 : 200 });
  } catch (err) {
    console.error("webhook error", err);
    return json({ error: "Internal error" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/v1/webhooks/message-received",
};
