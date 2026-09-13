CREATE TABLE "scan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"image_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"label" jsonb,
	"raw" jsonb,
	"ravelry" jsonb,
	"skeins" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'captured' NOT NULL,
	"matched_yarn_id" uuid,
	"merge_into_match" boolean DEFAULT true NOT NULL,
	"location_id" uuid,
	"notes" text,
	"error" text,
	"committed_yarn_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"default_location_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scan_items" ADD CONSTRAINT "scan_items_session_id_scan_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."scan_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_items" ADD CONSTRAINT "scan_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_items" ADD CONSTRAINT "scan_items_matched_yarn_id_yarns_id_fk" FOREIGN KEY ("matched_yarn_id") REFERENCES "public"."yarns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_items" ADD CONSTRAINT "scan_items_location_id_storage_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_items" ADD CONSTRAINT "scan_items_committed_yarn_id_yarns_id_fk" FOREIGN KEY ("committed_yarn_id") REFERENCES "public"."yarns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_sessions" ADD CONSTRAINT "scan_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_sessions" ADD CONSTRAINT "scan_sessions_default_location_id_storage_locations_id_fk" FOREIGN KEY ("default_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action;