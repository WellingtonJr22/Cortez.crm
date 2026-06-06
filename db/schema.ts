import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

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
