CREATE TABLE "lead_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"lead_id" uuid NOT NULL,
	"contact_type" text DEFAULT 'call' NOT NULL,
	"contact_date" timestamp DEFAULT now(),
	"customer_feedback" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"next_action_type" text,
	"next_action_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL;