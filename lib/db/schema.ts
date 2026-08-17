import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const exercises = pgTable('exercises', {
  id: uuid('id').defaultRandom().primaryKey(),

  slug: varchar('slug', { length: 150 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),

  family: varchar('family', { length: 100 }),
  primaryPattern: varchar('primary_pattern', { length: 50 }).notNull(),

  difficulty: integer('difficulty').notNull(),

  unilateral: boolean('unilateral').notNull().default(false),

  instructions: text('instructions'),
  notes: text('notes'),

  sourceName: varchar('source_name', { length: 200 }),
  sourceUrl: text('source_url'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const muscles = pgTable('muscles', {
  id: uuid('id').defaultRandom().primaryKey(),

  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),

  bodyRegion: varchar('body_region', { length: 100 }),
  svgRegion: varchar('svg_region', { length: 100 }),
});

export const exerciseMuscles = pgTable(
  'exercise_muscles',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, {
        onDelete: 'cascade',
      }),

    muscleId: uuid('muscle_id')
      .notNull()
      .references(() => muscles.id, {
        onDelete: 'cascade',
      }),

    role: varchar('role', { length: 30 }).notNull(),

    activation: numeric('activation', {
      precision: 3,
      scale: 2,
    }).notNull(),
  },
  (table) => [
    unique().on(table.exerciseId, table.muscleId),
  ],
);

export const exerciseImages = pgTable('exercise_images', {
  id: uuid('id').defaultRandom().primaryKey(),

  exerciseId: uuid('exercise_id')
    .notNull()
    .references(() => exercises.id, {
      onDelete: 'cascade',
    }),

  type: varchar('type', { length: 30 }).notNull(),

  url: text('url').notNull(),

  sortOrder: integer('sort_order').notNull().default(0),
});

export const workouts = pgTable('workouts', {
  id: uuid('id').defaultRandom().primaryKey(),

  name: varchar('name', { length: 200 }).notNull(),
  goal: varchar('goal', { length: 50 }).notNull(),
  level: varchar('level', { length: 50 }).notNull(),
  focus: varchar('focus', { length: 50 }).notNull(),

  requestedDurationMinutes: integer('requested_duration_minutes').notNull(),
  estimatedDurationMinutes: integer('estimated_duration_minutes'),

  status: varchar('status', { length: 50 }).notNull().default('generated'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const workoutBlocks = pgTable(
  'workout_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    workoutId: uuid('workout_id')
      .notNull()
      .references(() => workouts.id, {
        onDelete: 'cascade',
      }),

    name: varchar('name', { length: 200 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    position: integer('position').notNull(),
    rounds: integer('rounds').notNull().default(1),
  },
  (table) => [
    unique().on(table.workoutId, table.position),
  ],
);

export const workoutExercises = pgTable(
  'workout_exercises',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    blockId: uuid('block_id')
      .notNull()
      .references(() => workoutBlocks.id, {
        onDelete: 'cascade',
      }),

    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),

    position: integer('position').notNull(),
    sets: integer('sets'),
    reps: integer('reps'),
    repsPerSide: boolean('reps_per_side').notNull().default(false),
    durationSeconds: integer('duration_seconds'),
    restSeconds: integer('rest_seconds'),
    notes: text('notes'),
  },
  (table) => [
    unique().on(table.blockId, table.position),
  ],
);

export const workoutFeedback = pgTable('workout_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),

  workoutId: uuid('workout_id')
    .notNull()
    .unique()
    .references(() => workouts.id, {
      onDelete: 'cascade',
    }),

  difficulty: varchar('difficulty', { length: 50 }).notNull(),
  notes: text('notes'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
