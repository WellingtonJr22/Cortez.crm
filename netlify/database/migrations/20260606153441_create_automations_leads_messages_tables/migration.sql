CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"lead_id" uuid,
	"type" text DEFAULT 'follow_up' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"trigger_date" text,
	"message_content" text,
	"notes" text,
	"owner_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'whatsapp' NOT NULL,
	"birthday" text,
	"notes" text DEFAULT '' NOT NULL,
	"stage" text DEFAULT 'atendimento_ia' NOT NULL,
	"attendant_type" text DEFAULT 'ia' NOT NULL,
	"attendant_name" text DEFAULT '' NOT NULL,
	"attendant_email" text,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"needs_human" boolean DEFAULT false NOT NULL,
	"cart_abandoned" boolean DEFAULT false NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"last_message_preview" text DEFAULT '' NOT NULL,
	"sale_value" numeric,
	"sale_date" text,
	"renewal_date" text,
	"loss_reason" text,
	"owner_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"lead_id" uuid NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"sender_type" text DEFAULT 'humano' NOT NULL,
	"sender_name" text DEFAULT '' NOT NULL,
	"message_type" text DEFAULT 'text' NOT NULL,
	"file_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_lead_id_leads_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_lead_id_leads_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE;