CREATE TABLE "exercise_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_muscles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"muscle_id" uuid NOT NULL,
	"role" varchar(30) NOT NULL,
	"activation" numeric(3, 2) NOT NULL,
	CONSTRAINT "exercise_muscles_exercise_id_muscle_id_unique" UNIQUE("exercise_id","muscle_id")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(150) NOT NULL,
	"name" varchar(200) NOT NULL,
	"family" varchar(100),
	"primary_pattern" varchar(50) NOT NULL,
	"difficulty" integer NOT NULL,
	"unilateral" boolean DEFAULT false NOT NULL,
	"instructions" text,
	"notes" text,
	"source_name" varchar(200),
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "muscles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"body_region" varchar(100),
	"svg_region" varchar(100),
	CONSTRAINT "muscles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "exercise_images" ADD CONSTRAINT "exercise_images_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_muscle_id_muscles_id_fk" FOREIGN KEY ("muscle_id") REFERENCES "public"."muscles"("id") ON DELETE cascade ON UPDATE no action;