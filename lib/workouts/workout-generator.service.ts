import { asc, eq, inArray } from 'drizzle-orm';

import { generateStructuredCompletion } from '@/lib/ai/openrouter.service';
import { db } from '@/lib/db';
import {
  exerciseMuscles,
  exercises,
  muscles,
  workoutBlocks,
  workoutExercises,
  workouts,
} from '@/lib/db/schema';
import {
  type GeneratedWorkout,
  generatedWorkoutJsonSchema,
  generatedWorkoutSchema,
  validateGeneratedWorkoutBusinessRules,
} from '@/lib/workouts/generated-workout';
import {
  type CandidateExercise,
  selectWorkoutCandidates,
  type WorkoutFocus,
  type WorkoutGoal,
  type WorkoutLevel,
} from '@/lib/workouts/workout-candidate-selector';
import {
  getRecentWorkoutExerciseIds,
  getWorkoutById,
} from '@/lib/workouts/workout.repository';

export type { WorkoutFocus, WorkoutGoal, WorkoutLevel } from '@/lib/workouts/workout-candidate-selector';

export type GenerateWorkoutInput = {
  goal: WorkoutGoal;
  durationMinutes: number;
  level: WorkoutLevel;
  focus: WorkoutFocus;
  intensity: number;
};

type CatalogExercise = CandidateExercise;

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

function isCore(exercise: CatalogExercise) {
  return (
    hasPattern(exercise, ['plank', 'rotate', 'fallout', 'core']) ||
    hasPrimaryMuscleRegion(exercise, 'core')
  );
}

function targetExerciseCount(durationMinutes: number) {
  if (durationMinutes <= 20) return 3;
  if (durationMinutes <= 35) return 6;
  if (durationMinutes <= 50) return 8;
  return 10;
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

async function loadExerciseCatalog() {
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

  const muscleRows = await db
    .select({
      exerciseId: exerciseMuscles.exerciseId,
      slug: muscles.slug,
      bodyRegion: muscles.bodyRegion,
      role: exerciseMuscles.role,
      activation: exerciseMuscles.activation,
    })
    .from(exerciseMuscles)
    .innerJoin(muscles, eq(exerciseMuscles.muscleId, muscles.id))
    .where(inArray(exerciseMuscles.exerciseId, catalogRows.map(({ id }) => id)))
    .orderBy(asc(muscles.slug));
  const musclesByExerciseId = new Map<string, CatalogExercise['muscles']>();

  for (const muscle of muscleRows) {
    const exerciseMuscleList = musclesByExerciseId.get(muscle.exerciseId) ?? [];
    exerciseMuscleList.push({
      slug: muscle.slug,
      bodyRegion: muscle.bodyRegion,
      role: muscle.role,
      activation: Number(muscle.activation),
    });
    musclesByExerciseId.set(muscle.exerciseId, exerciseMuscleList);
  }

  return catalogRows.map((exercise) => ({
    ...exercise,
    muscles: musclesByExerciseId.get(exercise.id) ?? [],
  }));

}

function generateDeterministicPlan(
  input: GenerateWorkoutInput,
  compatibleExercises: CatalogExercise[],
): GeneratedWorkout {
  const selectedExercises = compatibleExercises.slice(
    0,
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

  return {
    name: getWorkoutName(input.goal, input.focus),
    estimatedDurationMinutes,
    blocks: [
      { name: 'Warm-up', type: 'warm_up', rounds: 1, items: blockItems.warm_up },
      { name: 'Main', type: 'main', rounds: 1, items: blockItems.main },
      { name: 'Core', type: 'core', rounds: 1, items: blockItems.core },
    ].map(({ name, type, rounds, items }) => ({
      name,
      type,
      rounds,
      exercises: items.map(({ exercise, prescription }) => ({
        exerciseId: exercise.id,
        sets: prescription.sets,
        reps: prescription.reps ?? null,
        repsPerSide: exercise.unilateral,
        durationSeconds: prescription.durationSeconds ?? null,
        restSeconds: prescription.restSeconds,
        notes: null,
      })),
    })),
  };
}

function buildWorkoutPrompts(
  input: GenerateWorkoutInput,
  compatibleExercises: CatalogExercise[],
) {
  const systemPrompt = `You are a TRX workout planner working with a closed exercise catalog.
You must only use exercises from the provided exercise catalog. Never invent exercises or exercise IDs.
Return only data matching the supplied JSON schema, without explanations.
Use each exercise at most once and do not prescribe equipment other than TRX.
Respect the requested goal, level, focus, intensity, and approximate duration. The estimated duration must be within 5 minutes of the requested duration.
For full_body workouts, balance upper-body push and pull, lower-body, and core movements when the catalog permits.
Use practical blocks such as warm_up, main, and core. Use 1-10 rounds. Every exercise needs 1-10 sets or null, either 1-100 reps or 5-600 durationSeconds, and 0-300 restSeconds or null.
Keep names and notes concise. Set repsPerSide appropriately for unilateral work.`;
  const catalog = compatibleExercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    primaryPattern: exercise.primaryPattern,
    family: exercise.family,
    difficulty: exercise.difficulty,
    unilateral: exercise.unilateral,
    muscles: exercise.muscles.map(({ slug, role, activation }) => ({
      slug,
      role,
      activation,
    })),
  }));

  return {
    systemPrompt,
    userPrompt: JSON.stringify({ preferences: input, exerciseCatalog: catalog }),
  };
}

async function generateOpenRouterPlan(
  input: GenerateWorkoutInput,
  compatibleExercises: CatalogExercise[],
) {
  const prompts = buildWorkoutPrompts(input, compatibleExercises);
  const completion = await generateStructuredCompletion({
    ...prompts,
    schemaName: 'trx_workout',
    jsonSchema: generatedWorkoutJsonSchema,
  });
  const workout = generatedWorkoutSchema.parse(completion.data);

  validateGeneratedWorkoutBusinessRules(
    workout,
    new Set(compatibleExercises.map(({ id }) => id)),
    input.durationMinutes,
  );

  return { workout, model: completion.model };
}

async function persistGeneratedWorkout(
  input: GenerateWorkoutInput,
  generatedWorkout: GeneratedWorkout,
) {
  const workoutId = await db.transaction(async (tx) => {
    const [workout] = await tx
      .insert(workouts)
      .values({
        name: generatedWorkout.name,
        goal: input.goal,
        level: input.level,
        focus: input.focus,
        requestedDurationMinutes: input.durationMinutes,
        estimatedDurationMinutes: generatedWorkout.estimatedDurationMinutes,
        status: 'generated',
      })
      .returning({ id: workouts.id });
    const blocks = await tx
      .insert(workoutBlocks)
      .values(
        generatedWorkout.blocks.map((block, index) => ({
          workoutId: workout.id,
          name: block.name,
          type: block.type,
          position: index + 1,
          rounds: block.rounds,
        })),
      )
      .returning({ id: workoutBlocks.id, position: workoutBlocks.position });
    const blockIdByPosition = new Map(
      blocks.map((block) => [block.position, block.id]),
    );
    const exerciseValues = generatedWorkout.blocks.flatMap((block, blockIndex) =>
      block.exercises.map((exercise, exerciseIndex) => ({
          blockId: blockIdByPosition.get(blockIndex + 1)!,
          exerciseId: exercise.exerciseId,
          position: exerciseIndex + 1,
          sets: exercise.sets,
          reps: exercise.reps,
          repsPerSide: exercise.repsPerSide,
          durationSeconds: exercise.durationSeconds,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
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

function summarizeGenerationError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'unknown error';
  }

  return error.message.slice(0, 200);
}

export async function generateWorkout(input: GenerateWorkoutInput) {
  const [catalog, recentWorkouts] = await Promise.all([
    loadExerciseCatalog(),
    getRecentWorkoutExerciseIds(10),
  ]);
  const compatibleExercises = selectWorkoutCandidates({
    input,
    catalog,
    recentWorkouts,
  });

  if (compatibleExercises.length === 0) {
    throw new WorkoutGenerationError(
      'NO_COMPATIBLE_EXERCISES',
      'No compatible exercises available',
    );
  }

  if (process.env.NODE_ENV === 'development') {
    console.info(
      'Candidate pool:\n' +
        compatibleExercises
          .map(
            (exercise) =>
              `- ${exercise.name} score=${exercise.score} recent=${exercise.recentCount} group=${exercise.variationGroup}`,
          )
          .join('\n'),
    );
  }
  let generatedWorkout: GeneratedWorkout;
  let openRouterModel: string | null = null;

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const result = await generateOpenRouterPlan(input, compatibleExercises);
      generatedWorkout = result.workout;
      openRouterModel = result.model;
    } catch (error) {
      console.warn(
        'OpenRouter generation failed, using deterministic fallback:',
        summarizeGenerationError(error),
      );
      generatedWorkout = generateDeterministicPlan(input, compatibleExercises);
    }
  } else {
    console.warn(
      'OpenRouter generation failed, using deterministic fallback: API key not configured',
    );
    generatedWorkout = generateDeterministicPlan(input, compatibleExercises);
  }

  const workout = await persistGeneratedWorkout(input, generatedWorkout);

  if (openRouterModel) {
    console.info(`Workout generated using OpenRouter model: ${openRouterModel}`);
  }

  return workout;
}
