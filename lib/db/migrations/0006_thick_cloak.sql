CREATE TABLE "metered_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reported_to_stripe_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "priority" varchar(10);--> statement-breakpoint
ALTER TABLE "metered_usage" ADD CONSTRAINT "metered_usage_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;