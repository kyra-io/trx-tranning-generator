import { z } from 'zod';

const nullableBoundedInteger = (minimum: number, maximum: number) =>
  z.number().int().min(minimum).max(maximum).nullable();

export const generatedWorkoutExerciseSchema = z
  .object({
    exerciseId: z.string().min(1),
    sets: nullableBoundedInteger(1, 10),
    reps: nullableBoundedInteger(1, 100),
    repsPerSide: z.boolean(),
    durationSeconds: nullableBoundedInteger(5, 600),
    restSeconds: nullableBoundedInteger(0, 300),
    notes: z.string().max(500).nullable(),
  })
  .strict()
  .refine(
    ({ reps, durationSeconds }) => reps !== null || durationSeconds !== null,
    { message: 'Each exercise must specify reps or durationSeconds' },
  );

export const generatedWorkoutSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    estimatedDurationMinutes: z.number().int().min(1).max(120),
    blocks: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(200),
            type: z.string().trim().min(1).max(50),
            rounds: z.number().int().min(1).max(10),
            exercises: z.array(generatedWorkoutExerciseSchema).min(1).max(20),
          })
          .strict(),
      )
      .min(1)
      .max(10),
  })
  .strict();

export type GeneratedWorkout = z.infer<typeof generatedWorkoutSchema>;

export const generatedWorkoutJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 200 },
    estimatedDurationMinutes: { type: 'integer', minimum: 1, maximum: 120 },
    blocks: {
      type: 'array',
      minItems: 1,
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          type: { type: 'string', minLength: 1, maxLength: 50 },
          rounds: { type: 'integer', minimum: 1, maximum: 10 },
          exercises: {
            type: 'array',
            minItems: 1,
            maxItems: 20,
            items: {
              type: 'object',
              properties: {
                exerciseId: { type: 'string', minLength: 1 },
                sets: { type: ['integer', 'null'], minimum: 1, maximum: 10 },
                reps: { type: ['integer', 'null'], minimum: 1, maximum: 100 },
                repsPerSide: { type: 'boolean' },
                durationSeconds: {
                  type: ['integer', 'null'],
                  minimum: 5,
                  maximum: 600,
                },
                restSeconds: {
                  type: ['integer', 'null'],
                  minimum: 0,
                  maximum: 300,
                },
                notes: { type: ['string', 'null'], maxLength: 500 },
              },
              required: [
                'exerciseId',
                'sets',
                'reps',
                'repsPerSide',
                'durationSeconds',
                'restSeconds',
                'notes',
              ],
              additionalProperties: false,
            },
          },
        },
        required: ['name', 'type', 'rounds', 'exercises'],
        additionalProperties: false,
      },
    },
  },
  required: ['name', 'estimatedDurationMinutes', 'blocks'],
  additionalProperties: false,
} as const;

export function validateGeneratedWorkoutBusinessRules(
  workout: GeneratedWorkout,
  allowedExerciseIds: ReadonlySet<string>,
  requestedDurationMinutes: number,
) {
  const usedExerciseIds = new Set<string>();

  for (const block of workout.blocks) {
    for (const exercise of block.exercises) {
      if (!allowedExerciseIds.has(exercise.exerciseId)) {
        throw new Error(`Exercise ${exercise.exerciseId} is not allowed`);
      }

      if (usedExerciseIds.has(exercise.exerciseId)) {
        throw new Error(`Exercise ${exercise.exerciseId} is duplicated`);
      }

      usedExerciseIds.add(exercise.exerciseId);
    }
  }

  const minimumDuration = Math.max(1, requestedDurationMinutes - 5);
  const maximumDuration = requestedDurationMinutes + 5;

  if (
    workout.estimatedDurationMinutes < minimumDuration ||
    workout.estimatedDurationMinutes > maximumDuration
  ) {
    throw new Error(
      `Estimated duration must be between ${minimumDuration} and ${maximumDuration} minutes`,
    );
  }
}
