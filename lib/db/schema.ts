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
