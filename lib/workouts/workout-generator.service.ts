import { asc, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  exerciseMuscles,
  exercises,
  muscles,
  workoutBlocks,
  workoutExercises,
  workouts,
} from '@/lib/db/schema';
import { getWorkoutById } from '@/lib/workouts/workout.repository';

export type WorkoutGoal =
  | 'strength'
  | 'hypertrophy'
  | 'general_fitness';
export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutFocus =
  | 'full_body'
  | 'upper_body'
  | 'lower_body'
  | 'core';

export type GenerateWorkoutInput = {
  goal: WorkoutGoal;
  durationMinutes: number;
  level: WorkoutLevel;
  focus: WorkoutFocus;
  intensity: number;
};

type CatalogExercise = Pick<
  typeof exercises.$inferSelect,
  | 'id'
  | 'slug'
  | 'name'
  | 'family'
  | 'primaryPattern'
  | 'difficulty'
  | 'unilateral'
> & {
  muscles: Array<{
    slug: string;
    bodyRegion: string | null;
    role: string;
  }>;
};

type Prescription = {
  sets: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds: number;
};

export class WorkoutGenerationError extends Error {
  constructor(
    public readonly code:
      | 'NO_EXERCISES_AVAILABLE'
      | 'NO_COMPATIBLE_EXERCISES',
    message: string,
  ) {
    super(message);
    this.name = 'WorkoutGenerationError';
  }
}

const maximumDifficulty: Record<WorkoutLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const focusPatterns: Record<WorkoutFocus, string[]> = {
  full_body: ['pull', 'push', 'squat', 'lunge', 'hinge', 'plank', 'rotate'],
  upper_body: ['push', 'pull', 'rotate', 'plank'],
  lower_body: ['squat', 'lunge', 'hinge'],
  core: ['plank', 'rotate'],
};

function normalize(value: string | null) {
  return value?.trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_') ?? '';
}

function hasPattern(exercise: CatalogExercise, patterns: string[]) {
  const primaryPattern = normalize(exercise.primaryPattern);
  const family = normalize(exercise.family);

  return patterns.some(
    (pattern) =>
      primaryPattern === pattern ||
      family === pattern ||
      family.includes(pattern),
  );
}

function hasPrimaryMuscleRegion(exercise: CatalogExercise, region: string) {
  return exercise.muscles.some(
    (muscle) =>
      normalize(muscle.bodyRegion) === region && muscle.role === 'primary',
  );
}

function isLowerBody(exercise: CatalogExercise) {
  return (
    hasPattern(exercise, ['squat', 'lunge', 'hinge']) ||
    hasPrimaryMuscleRegion(exercise, 'lower_body')
  );
}

function isCore(exercise: CatalogExercise) {
  return (
    hasPattern(exercise, ['plank', 'rotate', 'fallout', 'core']) ||
    hasPrimaryMuscleRegion(exercise, 'core')
  );
}

function matchesFocus(exercise: CatalogExercise, focus: WorkoutFocus) {
  if (focus === 'full_body') {
    return true;
  }

  if (hasPattern(exercise, focusPatterns[focus])) {
    return true;
  }

  if (focus === 'upper_body') {
    return (
      hasPrimaryMuscleRegion(exercise, 'upper_body') ||
      hasPrimaryMuscleRegion(exercise, 'arms')
    );
  }

  if (focus === 'lower_body') {
    return isLowerBody(exercise);
  }

  return isCore(exercise);
}

function targetExerciseCount(durationMinutes: number) {
  if (durationMinutes <= 20) return 3;
  if (durationMinutes <= 35) return 6;
  if (durationMinutes <= 50) return 8;
  return 10;
}

function selectExercises(
  compatibleExercises: CatalogExercise[],
  focus: WorkoutFocus,
  count: number,
) {
  const selected: CatalogExercise[] = [];
  const selectedIds = new Set<string>();
  const priorities: Array<(exercise: CatalogExercise) => boolean> =
    focus === 'full_body'
      ? [
          (exercise) => hasPattern(exercise, ['pull']),
          (exercise) => hasPattern(exercise, ['push']),
          isLowerBody,
          isCore,
        ]
      : focusPatterns[focus].map(
          (pattern) => (exercise) => hasPattern(exercise, [pattern]),
        );

  const addFirstMatch = (predicate: (exercise: CatalogExercise) => boolean) => {
    const exercise = compatibleExercises.find(
      (candidate) => !selectedIds.has(candidate.id) && predicate(candidate),
    );

    if (exercise && selected.length < count) {
      selected.push(exercise);
      selectedIds.add(exercise.id);
    }
  };

  priorities.forEach(addFirstMatch);
  compatibleExercises
    .filter((exercise) => matchesFocus(exercise, focus))
    .forEach((exercise) => addFirstMatch((candidate) => candidate.id === exercise.id));
  compatibleExercises.forEach((exercise) =>
    addFirstMatch((candidate) => candidate.id === exercise.id),
  );

  for (let index = 0; selected.length < count; index += 1) {
    selected.push(compatibleExercises[index % compatibleExercises.length]);
  }

  return selected;
}

function getPrescription(
  goal: WorkoutGoal,
  intensity: number,
  exercise: CatalogExercise,
): Prescription {
  const usesDuration = isCore(exercise) && hasPattern(exercise, ['plank']);

  if (goal === 'strength') {
    const reps = intensity >= 8 ? 10 : intensity <= 4 ? 6 : 8;
    const restSeconds = intensity >= 8 ? 50 : intensity <= 4 ? 75 : 60;

    return usesDuration
      ? { sets: 3, durationSeconds: reps * 4, restSeconds }
      : { sets: 3, reps, restSeconds };
  }

  if (goal === 'hypertrophy') {
    const reps = intensity >= 8 ? 15 : intensity <= 4 ? 8 : 12;
    const restSeconds = intensity >= 8 ? 35 : intensity <= 4 ? 60 : 45;

    return usesDuration
      ? { sets: 3, durationSeconds: reps * 3, restSeconds }
      : { sets: 3, reps, restSeconds };
  }

  const sets = intensity <= 4 ? 2 : 3;
  const reps = intensity >= 8 ? 15 : intensity <= 4 ? 10 : 12;
  const restSeconds = intensity >= 8 ? 20 : intensity <= 4 ? 45 : 30;

  return usesDuration
    ? {
        sets,
        durationSeconds: intensity >= 8 ? 40 : 30,
        restSeconds,
      }
    : { sets, reps, restSeconds };
}

function estimateDurationMinutes(
  items: Array<{ exercise: CatalogExercise; prescription: Prescription }>,
) {
  const exerciseSeconds = items.reduce((total, item) => {
    const workSecondsPerSet =
      item.prescription.durationSeconds ??
      (item.prescription.reps ?? 0) * 4 * (item.exercise.unilateral ? 2 : 1);
    const recoverySeconds =
      item.prescription.restSeconds * (item.prescription.sets - 0.5);

    return (
      total +
      workSecondsPerSet * item.prescription.sets +
      recoverySeconds
    );
  }, 0);
  const transitionSeconds = Math.max(0, items.length - 1) * 30 + 120;

  return Math.max(1, Math.round((exerciseSeconds + transitionSeconds) / 60));
}

function getWorkoutName(goal: WorkoutGoal, focus: WorkoutFocus) {
  const focusNames: Record<WorkoutFocus, string> = {
    full_body: 'Full Body',
    upper_body: 'Upper Body',
    lower_body: 'Lower Body',
    core: 'Core',
  };
  const goalNames: Record<WorkoutGoal, string> = {
    strength: 'Strength',
    hypertrophy: 'Hypertrophy',
    general_fitness: 'Fitness',
  };

  return `${focusNames[focus]} ${goalNames[goal]}`;
}

export async function generateWorkout(input: GenerateWorkoutInput) {
  const catalogRows = await db
    .select({
      id: exercises.id,
      slug: exercises.slug,
      name: exercises.name,
      family: exercises.family,
      primaryPattern: exercises.primaryPattern,
      difficulty: exercises.difficulty,
      unilateral: exercises.unilateral,
    })
    .from(exercises)
    .orderBy(asc(exercises.slug));

  if (catalogRows.length === 0) {
    throw new WorkoutGenerationError(
      'NO_EXERCISES_AVAILABLE',
      'No exercises available',
    );
  }

  const compatibleRows = catalogRows.filter(
    (exercise) => exercise.difficulty <= maximumDifficulty[input.level],
  );

  if (compatibleRows.length === 0) {
    throw new WorkoutGenerationError(
      'NO_COMPATIBLE_EXERCISES',
      'No compatible exercises available',
    );
  }

  const muscleRows = await db
    .select({
      exerciseId: exerciseMuscles.exerciseId,
      slug: muscles.slug,
      bodyRegion: muscles.bodyRegion,
      role: exerciseMuscles.role,
    })
    .from(exerciseMuscles)
    .innerJoin(muscles, eq(exerciseMuscles.muscleId, muscles.id))
    .where(inArray(exerciseMuscles.exerciseId, compatibleRows.map(({ id }) => id)))
    .orderBy(asc(muscles.slug));
  const musclesByExerciseId = new Map<string, CatalogExercise['muscles']>();

  for (const muscle of muscleRows) {
    const exerciseMuscleList = musclesByExerciseId.get(muscle.exerciseId) ?? [];
    exerciseMuscleList.push({
      slug: muscle.slug,
      bodyRegion: muscle.bodyRegion,
      role: muscle.role,
    });
    musclesByExerciseId.set(muscle.exerciseId, exerciseMuscleList);
  }

  const compatibleExercises = compatibleRows.map((exercise) => ({
    ...exercise,
    muscles: musclesByExerciseId.get(exercise.id) ?? [],
  }));
  const selectedExercises = selectExercises(
    compatibleExercises,
    input.focus,
    targetExerciseCount(input.durationMinutes),
  );
  const generatedItems = selectedExercises.map((exercise) => ({
    exercise,
    prescription: getPrescription(input.goal, input.intensity, exercise),
  }));
  const coreIndex = Math.max(
    0,
    generatedItems.findLastIndex(({ exercise }) => isCore(exercise)),
  );
  const warmUpIndex = generatedItems.findIndex(
    ({ exercise }, index) => index !== coreIndex && !isCore(exercise),
  );
  const resolvedWarmUpIndex = warmUpIndex === -1 ? (coreIndex === 0 ? 1 : 0) : warmUpIndex;
  const blockItems = {
    warm_up: [generatedItems[resolvedWarmUpIndex]],
    main: generatedItems.filter(
      (_, index) => index !== resolvedWarmUpIndex && index !== coreIndex,
    ),
    core: [generatedItems[coreIndex]],
  };
  const estimatedDurationMinutes = estimateDurationMinutes(generatedItems);

  const workoutId = await db.transaction(async (tx) => {
    const [workout] = await tx
      .insert(workouts)
      .values({
        name: getWorkoutName(input.goal, input.focus),
        goal: input.goal,
        level: input.level,
        focus: input.focus,
        requestedDurationMinutes: input.durationMinutes,
        estimatedDurationMinutes,
        status: 'generated',
      })
      .returning({ id: workouts.id });
    const blocks = await tx
      .insert(workoutBlocks)
      .values([
        {
          workoutId: workout.id,
          name: 'Warm-up',
          type: 'warm_up',
          position: 1,
          rounds: 1,
        },
        {
          workoutId: workout.id,
          name: 'Main',
          type: 'main',
          position: 2,
          rounds: 1,
        },
        {
          workoutId: workout.id,
          name: 'Core',
          type: 'core',
          position: 3,
          rounds: 1,
        },
      ])
      .returning({ id: workoutBlocks.id, type: workoutBlocks.type });
    const blockByType = new Map(blocks.map((block) => [block.type, block.id]));
    const exerciseValues = Object.entries(blockItems).flatMap(
      ([blockType, items]) =>
        items.map(({ exercise, prescription }, index) => ({
          blockId: blockByType.get(blockType)!,
          exerciseId: exercise.id,
          position: index + 1,
          sets: prescription.sets,
          reps: prescription.reps,
          repsPerSide: exercise.unilateral,
          durationSeconds: prescription.durationSeconds,
          restSeconds: prescription.restSeconds,
        })),
    );

    await tx.insert(workoutExercises).values(exerciseValues);

    return workout.id;
  });
  const workout = await getWorkoutById(workoutId);

  if (!workout) {
    throw new Error('Generated workout could not be loaded');
  }

  return workout;
}
