import { z } from 'zod';

import type {
  WorkoutEquipment,
  WorkoutEquipmentPlan,
} from './workout-equipment';
import { WORKOUT_EQUIPMENT_COUNT_TOLERANCE } from './workout-equipment';

export const WORKOUT_BLOCK_TYPES = [
  'straight_sets',
  'superset',
  'circuit',
  'interval',
  'emom',
  'amrap',
  'finisher',
] as const;

export type WorkoutBlockType = (typeof WORKOUT_BLOCK_TYPES)[number];

export const WORKOUT_GENERATION_LIMITS = {
  blockCount: { minimum: 1, maximum: 5 },
  rounds: { minimum: 1, maximum: 6 },
  exercisesPerBlock: { minimum: 1, maximum: 8 },
  warmupExercises: { minimum: 1, maximum: 4 },
  sets: { minimum: 1, maximum: 6 },
  reps: { minimum: 1, maximum: 50 },
  durationSeconds: { minimum: 10, maximum: 180 },
  restSeconds: { minimum: 0, maximum: 180 },
  durationToleranceRatio: 0.1,
  minimumDurationToleranceMinutes: 3,
} as const;

const nullableBoundedInteger = (minimum: number, maximum: number) =>
  z.number().int().min(minimum).max(maximum).nullable();

export const generatedWorkoutExerciseSchema = z
  .object({
    exerciseId: z.string().min(1),
    sets: nullableBoundedInteger(
      WORKOUT_GENERATION_LIMITS.sets.minimum,
      WORKOUT_GENERATION_LIMITS.sets.maximum,
    ),
    reps: nullableBoundedInteger(
      WORKOUT_GENERATION_LIMITS.reps.minimum,
      WORKOUT_GENERATION_LIMITS.reps.maximum,
    ),
    repsPerSide: z.boolean(),
    durationSeconds: nullableBoundedInteger(
      WORKOUT_GENERATION_LIMITS.durationSeconds.minimum,
      WORKOUT_GENERATION_LIMITS.durationSeconds.maximum,
    ),
    restSeconds: nullableBoundedInteger(
      WORKOUT_GENERATION_LIMITS.restSeconds.minimum,
      WORKOUT_GENERATION_LIMITS.restSeconds.maximum,
    ),
    notes: z.string().max(300).nullable(),
  })
  .strict()
  .refine(
    ({ reps, durationSeconds }) => reps !== null || durationSeconds !== null,
    { message: 'Each exercise must specify reps or durationSeconds' },
  );

const generatedWorkoutBlockSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    type: z.enum(WORKOUT_BLOCK_TYPES),
    rounds: z.number().int()
      .min(WORKOUT_GENERATION_LIMITS.rounds.minimum)
      .max(WORKOUT_GENERATION_LIMITS.rounds.maximum),
    exercises: z.array(generatedWorkoutExerciseSchema)
      .min(WORKOUT_GENERATION_LIMITS.exercisesPerBlock.minimum)
      .max(WORKOUT_GENERATION_LIMITS.exercisesPerBlock.maximum),
  })
  .strict();

export const generatedWorkoutSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    estimatedDurationMinutes: z.number().int().min(1).max(120),
    warmup: z.object({
      exercises: z.array(generatedWorkoutExerciseSchema)
        .min(WORKOUT_GENERATION_LIMITS.warmupExercises.minimum)
        .max(WORKOUT_GENERATION_LIMITS.warmupExercises.maximum),
    }).strict(),
    blocks: z.array(generatedWorkoutBlockSchema)
      .min(WORKOUT_GENERATION_LIMITS.blockCount.minimum)
      .max(WORKOUT_GENERATION_LIMITS.blockCount.maximum),
  })
  .strict();

export type GeneratedWorkout = z.infer<typeof generatedWorkoutSchema>;

function buildExerciseJsonSchema(allowedExerciseIds?: readonly string[]) {
  const uniqueExerciseIds = allowedExerciseIds
    ? [...new Set(allowedExerciseIds)]
    : null;

  if (uniqueExerciseIds?.length === 0) {
    throw new Error('At least one allowed exercise ID is required');
  }

  return {
    type: 'object',
    properties: {
      exerciseId: uniqueExerciseIds
        ? { type: 'string', enum: uniqueExerciseIds }
        : { type: 'string', minLength: 1 },
      sets: { type: ['integer', 'null'], ...WORKOUT_GENERATION_LIMITS.sets },
      reps: { type: ['integer', 'null'], ...WORKOUT_GENERATION_LIMITS.reps },
      repsPerSide: { type: 'boolean' },
      durationSeconds: {
        type: ['integer', 'null'],
        ...WORKOUT_GENERATION_LIMITS.durationSeconds,
      },
      restSeconds: {
        type: ['integer', 'null'],
        ...WORKOUT_GENERATION_LIMITS.restSeconds,
      },
      notes: { type: ['string', 'null'], maxLength: 300 },
    },
    required: [
      'exerciseId', 'sets', 'reps', 'repsPerSide',
      'durationSeconds', 'restSeconds', 'notes',
    ],
    additionalProperties: false,
  } as const;
}

export function buildGeneratedWorkoutJsonSchema(
  allowedExerciseIds?: readonly string[],
) {
  const exerciseJsonSchema = buildExerciseJsonSchema(allowedExerciseIds);

  return {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      estimatedDurationMinutes: { type: 'integer', minimum: 1, maximum: 120 },
      warmup: {
        type: 'object',
        properties: {
          exercises: {
            type: 'array',
            minItems: WORKOUT_GENERATION_LIMITS.warmupExercises.minimum,
            maxItems: WORKOUT_GENERATION_LIMITS.warmupExercises.maximum,
            items: exerciseJsonSchema,
          },
        },
        required: ['exercises'],
        additionalProperties: false,
      },
      blocks: {
        type: 'array',
        minItems: WORKOUT_GENERATION_LIMITS.blockCount.minimum,
        maxItems: WORKOUT_GENERATION_LIMITS.blockCount.maximum,
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            type: { type: 'string', enum: WORKOUT_BLOCK_TYPES },
            rounds: {
              type: 'integer',
              ...WORKOUT_GENERATION_LIMITS.rounds,
            },
            exercises: {
              type: 'array',
              minItems: WORKOUT_GENERATION_LIMITS.exercisesPerBlock.minimum,
              maxItems: WORKOUT_GENERATION_LIMITS.exercisesPerBlock.maximum,
              items: exerciseJsonSchema,
            },
          },
          required: ['name', 'type', 'rounds', 'exercises'],
          additionalProperties: false,
        },
      },
    },
    required: ['name', 'estimatedDurationMinutes', 'warmup', 'blocks'],
    additionalProperties: false,
  } as const;
}

export const generatedWorkoutJsonSchema = buildGeneratedWorkoutJsonSchema();

export type GeneratedWorkoutValidationCode =
  | 'UNKNOWN_EXERCISE_ID'
  | 'MISSING_EQUIPMENT'
  | 'INVALID_EQUIPMENT_COUNTS'
  | 'INVALID_EXERCISE_TOTAL'
  | 'DUPLICATE_EXERCISE'
  | 'INVALID_DURATION';

export class GeneratedWorkoutValidationError extends Error {
  constructor(
    public readonly code: GeneratedWorkoutValidationCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'GeneratedWorkoutValidationError';
  }
}

export function getDurationTolerance(requestedDurationMinutes: number) {
  return Math.max(
    WORKOUT_GENERATION_LIMITS.minimumDurationToleranceMinutes,
    Math.round(
      requestedDurationMinutes *
        WORKOUT_GENERATION_LIMITS.durationToleranceRatio,
    ),
  );
}

export function validateGeneratedWorkoutBusinessRules(
  workout: GeneratedWorkout,
  allowedExerciseIds: ReadonlySet<string>,
  requestedDurationMinutes: number,
  equipmentByExerciseId?: ReadonlyMap<string, string>,
  equipmentPlan?: WorkoutEquipmentPlan,
) {
  const exerciseIds = [
    ...workout.warmup.exercises,
    ...workout.blocks.flatMap((block) => block.exercises),
  ].map((exercise) => exercise.exerciseId);

  for (const exerciseId of exerciseIds) {
    if (!allowedExerciseIds.has(exerciseId)) {
      throw new GeneratedWorkoutValidationError(
        'UNKNOWN_EXERCISE_ID',
        `Exercise ${exerciseId} is not allowed`,
        { exerciseId },
      );
    }
  }

  if (equipmentByExerciseId) {
    const availableEquipment = new Set(equipmentByExerciseId.values());
    const selectedEquipment = new Set(
      exerciseIds.flatMap((exerciseId) => {
        const equipment = equipmentByExerciseId.get(exerciseId);
        return equipment ? [equipment] : [];
      }),
    );
    const missingEquipment = [...availableEquipment].filter(
      (equipment) => !selectedEquipment.has(equipment),
    );

    if (missingEquipment.length > 0) {
      throw new GeneratedWorkoutValidationError(
        'MISSING_EQUIPMENT',
        `Workout must include equipment: ${missingEquipment.join(', ')}`,
        { missingEquipment },
      );
    }

    const equipmentCounts = exerciseIds.reduce((counts, exerciseId) => {
      const equipment = equipmentByExerciseId.get(exerciseId);
      if (equipment) counts.set(equipment, (counts.get(equipment) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
    if (equipmentPlan) {
      const minimumExerciseEntries =
        equipmentPlan.targetExerciseEntries -
        equipmentPlan.exerciseEntryTolerance;
      const maximumExerciseEntries =
        equipmentPlan.targetExerciseEntries +
        equipmentPlan.exerciseEntryTolerance;
      if (
        exerciseIds.length < minimumExerciseEntries ||
        exerciseIds.length > maximumExerciseEntries
      ) {
        throw new GeneratedWorkoutValidationError(
          'INVALID_EXERCISE_TOTAL',
          `Workout must contain between ${minimumExerciseEntries} and ${maximumExerciseEntries} exercise entries; received ${exerciseIds.length}`,
          {
            targetTotal: equipmentPlan.targetExerciseEntries,
            minimumTotal: minimumExerciseEntries,
            maximumTotal: maximumExerciseEntries,
            receivedTotal: exerciseIds.length,
          },
        );
      }
    }

    const selectedCounts = [...availableEquipment].map(
      (equipment) => equipmentCounts.get(equipment) ?? 0,
    );
    const maximumCountDifference = equipmentPlan
      ?.maximumEquipmentCountDifference ??
      WORKOUT_EQUIPMENT_COUNT_TOLERANCE;
    if (
      Math.max(...selectedCounts) - Math.min(...selectedCounts) >
      maximumCountDifference
    ) {
      const receivedCounts = Object.fromEntries(
        [...availableEquipment].map((equipment) => [
          equipment,
          equipmentCounts.get(equipment) ?? 0,
        ]),
      );
      throw new GeneratedWorkoutValidationError(
        'INVALID_EQUIPMENT_COUNTS',
        `Workout equipment counts may differ by at most ${maximumCountDifference}; received ${formatEquipmentCounts(receivedCounts)}`,
        { maximumCountDifference, receivedCounts },
      );
    }
  }

  for (let index = 1; index < exerciseIds.length; index += 1) {
    if (exerciseIds[index] === exerciseIds[index - 1]) {
      throw new GeneratedWorkoutValidationError(
        'DUPLICATE_EXERCISE',
        `Exercise ${exerciseIds[index]} is duplicated consecutively`,
        { exerciseId: exerciseIds[index] },
      );
    }
  }

  const occurrences = new Map<string, number>();
  for (const exerciseId of exerciseIds) {
    occurrences.set(exerciseId, (occurrences.get(exerciseId) ?? 0) + 1);
  }
  const overusedExercise = [...occurrences].find(([, count]) => count > 2);
  if (overusedExercise) {
    throw new GeneratedWorkoutValidationError(
      'DUPLICATE_EXERCISE',
      `Exercise ${overusedExercise[0]} is used more than twice`,
      { exerciseId: overusedExercise[0], occurrences: overusedExercise[1] },
    );
  }

  const tolerance = getDurationTolerance(requestedDurationMinutes);
  const minimumDuration = Math.max(1, requestedDurationMinutes - tolerance);
  const maximumDuration = requestedDurationMinutes + tolerance;

  if (
    workout.estimatedDurationMinutes < minimumDuration ||
    workout.estimatedDurationMinutes > maximumDuration
  ) {
    throw new GeneratedWorkoutValidationError(
      'INVALID_DURATION',
      `Estimated duration must be between ${minimumDuration} and ${maximumDuration} minutes`,
      {
        minimumDuration,
        maximumDuration,
        receivedDuration: workout.estimatedDurationMinutes,
      },
    );
  }
}

function formatEquipmentCounts(
  counts: Partial<Record<WorkoutEquipment, number>> | Record<string, unknown>,
) {
  return Object.entries(counts)
    .map(([equipment, count]) => `${equipment}=${count}`)
    .join(', ');
}
