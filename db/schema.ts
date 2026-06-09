import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";

// Application users / CRM team members.
// roles: 'admin' | 'atendente'   (the legacy "vendedor" role was removed)
// status: 'active' | 'invited' | 'suspended'
export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash"),
  fullName: text("full_name").notNull().default(""),
  role: text().notNull().default("atendente"),
  status: text().notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM clients / leads. Each lead has a responsible attendant (assignedToUserId)
// which drives visibility: attendants only see leads assigned to them, admins see
// all of them. assignedToName/assignedToEmail (stored in the attendant_name /
// attendant_email columns) are denormalised copies of that attendant for display.
// ownerId is kept for backward compatibility (the member who first registered the
// lead) and is also honoured by the visibility rule so legacy leads stay visible.
// stage: 'atendimento_ia' | 'atendendo' | 'vendido_ia' | 'vendido_atendente' | 'perda'
// source: 'whatsapp' | 'website' | 'instagram' | 'facebook' | 'indicacao' | 'outro'
// attendantType: 'ia' | 'humano'
export const leads = pgTable("leads", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  phone: text().notNull().default(""),
  email: text().notNull().default(""),
  source: text().notNull().default("whatsapp"),
  birthday: text(),
  notes: text().notNull().default(""),
  stage: text().notNull().default("atendimento_ia"),
  attendantType: text("attendant_type").notNull().default("ia"),
  // Denormalised name/email of the responsible attendant (assigned_to_name / _email).
  attendantName: text("attendant_name").notNull().default(""),
  attendantEmail: text("attendant_email"),
  tags: jsonb().notNull().default([]),
  needsHuman: boolean("needs_human").notNull().default(false),
  cartAbandoned: boolean("cart_abandoned").notNull().default(false),
  resolved: boolean().notNull().default(false),
  lastMessagePreview: text("last_message_preview").notNull().default(""),
  saleValue: numeric("sale_value"),
  saleDate: text("sale_date"),
  renewalDate: text("renewal_date"),
  lossReason: text("loss_reason"),
  // Responsible attendant. This is the canonical assignment that drives visibility.
  assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  // Owner: the member who registered the lead. Kept for back-compat / fallback.
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages exchanged on a lead's conversation.
// senderType: 'cliente' | 'ia' | 'humano'
// messageType: 'text' | 'image' | 'audio' | 'document'
export const messages = pgTable("messages", {
  id: uuid().primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  content: text().notNull().default(""),
  senderType: text("sender_type").notNull().default("humano"),
  senderName: text("sender_name").notNull().default(""),
  messageType: text("message_type").notNull().default("text"),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Post-sale / marketing automations attached to a lead.
// type: 'renewal_90d' | 'birthday' | 'cart_recovery' | 'follow_up'
// status: 'pending' | 'sent' | 'completed' | 'failed'
export const automations = pgTable("automations", {
  id: uuid().primaryKey().defaultRandom(),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  type: text().notNull().default("follow_up"),
  status: text().notNull().default("pending"),
  triggerDate: text("trigger_date"),
  messageContent: text("message_content"),
  notes: text(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
