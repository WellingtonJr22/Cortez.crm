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
// roles: 'admin' | 'atendente' | 'vendedor'
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

// CRM clients / leads. Every lead is owned by the team member who registered it
// (ownerId). Attendants only see their own leads; admins see all of them. The
// owner's email is also denormalised into createdBy for display/back-compat.
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
  // Owner: the attendant who registered the lead. Drives visibility.
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
