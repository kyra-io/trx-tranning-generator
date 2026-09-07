CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DELETE FROM "workouts";--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "profile_id" uuid NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_name_lower_unique" ON "profiles" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workouts_profile_id_created_at_idx" ON "workouts" USING btree ("profile_id","created_at");
