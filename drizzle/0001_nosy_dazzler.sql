CREATE TABLE "workout_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar(50) NOT NULL,
	"position" integer NOT NULL,
	"rounds" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "workout_blocks_workout_id_position_unique" UNIQUE("workout_id","position")
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"sets" integer,
	"reps" integer,
	"reps_per_side" boolean DEFAULT false NOT NULL,
	"duration_seconds" integer,
	"rest_seconds" integer,
	"notes" text,
	CONSTRAINT "workout_exercises_block_id_position_unique" UNIQUE("block_id","position")
);
--> statement-breakpoint
CREATE TABLE "workout_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"difficulty" varchar(50) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_feedback_workout_id_unique" UNIQUE("workout_id")
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"goal" varchar(50) NOT NULL,
	"level" varchar(50) NOT NULL,
	"focus" varchar(50) NOT NULL,
	"requested_duration_minutes" integer NOT NULL,
	"estimated_duration_minutes" integer,
	"status" varchar(50) DEFAULT 'generated' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "workout_blocks" ADD CONSTRAINT "workout_blocks_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_block_id_workout_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."workout_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_feedback" ADD CONSTRAINT "workout_feedback_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;