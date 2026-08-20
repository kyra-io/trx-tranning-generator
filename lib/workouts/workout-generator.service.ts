import { asc, eq, inArray } from 'drizzle-orm';

// import { generateStructuredCompletion } from '@/lib/ai/openrouter.service';
import { generateStructuredCompletion } from '@/lib/ai/amalia.service';
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
  getDurationTolerance,
  validateGeneratedWorkoutBusinessRules,
  type WorkoutBlockType,
  WORKOUT_GENERATION_LIMITS,
} from '@/lib/workouts/generated-workout';
import {
  type CandidateExercise,
  selectWorkoutCandidates,
  type WorkoutFocus,
  type WorkoutGoal,
  type WorkoutLevel,
} from '@/lib/workouts/workout-candidate-selector';
import {
  getRecentWorkoutContext,
  getWorkoutById,
  type RecentWorkoutContext,
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

const RECENT_WORKOUT_LIMIT = 5;
const FALLBACK_HISTORY_LIMIT = 10;
const maximumDifficulty: Record<WorkoutLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
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

function isTimedExercise(exercise: CatalogExercise) {
  const pattern = normalize(exercise.primaryPattern);
  return ['plank', 'fallout', 'rotate'].some((value) => pattern.includes(value));
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

async function loadExerciseCatalog(): Promise<CatalogExercise[]> {
  const catalogRows = await db
    .select({
      id: exercises.id,
      slug: exercises.slug,
      name: exercises.name,
      family: exercises.family,
      primaryPattern: exercises.primaryPattern,
      force: exercises.force,
      mechanic: exercises.mechanic,
      category: exercises.category,
      variationGroup: exercises.variationGroup,
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

export function getEligibleExerciseCatalog(
  catalog: CatalogExercise[],
  level: WorkoutLevel,
) {
  return catalog.filter(
    (exercise) => exercise.difficulty <= maximumDifficulty[level],
  );
}

function fallbackPrescription(
  input: GenerateWorkoutInput,
  exercise: CatalogExercise,
  useBlockRounds: boolean,
) {
  const timed = isTimedExercise(exercise);
  const reps = input.goal === 'strength'
    ? (input.intensity >= 8 ? 10 : 8)
    : input.goal === 'hypertrophy'
      ? (input.intensity >= 8 ? 15 : 12)
      : (input.intensity >= 8 ? 15 : 10);
  const restSeconds = input.goal === 'strength'
    ? (input.intensity >= 8 ? 60 : 75)
    : input.goal === 'hypertrophy'
      ? 45
      : (input.intensity >= 8 ? 20 : 30);

  return {
    exerciseId: exercise.id,
    sets: useBlockRounds ? null : (input.intensity <= 3 ? 2 : 3),
    reps: timed ? null : reps,
    repsPerSide: exercise.unilateral,
    durationSeconds: timed ? (input.intensity >= 8 ? 40 : 30) : null,
    restSeconds,
    notes: null,
  };
}

function targetExerciseCount(durationMinutes: number) {
  if (durationMinutes <= 20) return 4;
  if (durationMinutes <= 35) return 6;
  if (durationMinutes <= 50) return 8;
  return 10;
}

export function generateDeterministicPlan(
  input: GenerateWorkoutInput,
  candidates: CatalogExercise[],
): GeneratedWorkout {
  const selected = candidates.slice(0, targetExerciseCount(input.durationMinutes));
  const warmupCount = input.durationMinutes >= 45 ? 2 : 1;
  const warmupExercises = selected.slice(0, warmupCount);
  const workExercises = selected.slice(warmupCount);

  if (warmupExercises.length === 0 || workExercises.length === 0) {
    throw new WorkoutGenerationError(
      'NO_COMPATIBLE_EXERCISES',
      'No compatible exercises available',
    );
  }

  let blockType: WorkoutBlockType;
  if (input.goal === 'general_fitness') blockType = 'circuit';
  else if (input.goal === 'hypertrophy') blockType = 'superset';
  else blockType = workExercises.length <= 3 ? 'straight_sets' : 'superset';

  const chunks: CatalogExercise[][] = [];
  const chunkSize = blockType === 'straight_sets'
    ? Math.min(3, workExercises.length)
    : blockType === 'superset' ? 2 : workExercises.length;
  for (let index = 0; index < workExercises.length; index += chunkSize) {
    chunks.push(workExercises.slice(index, index + chunkSize));
  }

  return {
    name: getWorkoutName(input.goal, input.focus),
    estimatedDurationMinutes: input.durationMinutes,
    warmup: {
      exercises: warmupExercises.map((exercise) => ({
        ...fallbackPrescription(input, exercise, false),
        sets: 1,
        reps: isTimedExercise(exercise) ? null : 8,
        durationSeconds: isTimedExercise(exercise) ? 30 : null,
        restSeconds: 15,
      })),
    },
    blocks: chunks.slice(0, WORKOUT_GENERATION_LIMITS.blockCount.maximum).map(
      (blockExercises, index) => {
        const usesRounds = blockType !== 'straight_sets';
        return {
          name: chunks.length === 1
            ? getWorkoutName(input.goal, input.focus)
            : `${input.focus === 'full_body' ? 'Strength' : getWorkoutName(input.goal, input.focus)} ${index + 1}`,
          type: blockType,
          rounds: usesRounds ? (input.intensity >= 8 ? 4 : 3) : 1,
          exercises: blockExercises.map((exercise) =>
            fallbackPrescription(input, exercise, usesRounds),
          ),
        };
      },
    ),
  };
}

export function buildWorkoutPrompts(
  input: GenerateWorkoutInput,
  eligibleExercises: CatalogExercise[],
  recentWorkouts: RecentWorkoutContext[],
) {
  const tolerance = getDurationTolerance(input.durationMinutes);
  const systemPrompt = `You are responsible for designing a complete TRX workout from a closed exercise catalog.
Choose the exercises, their order and prescriptions, and the workout's block structure yourself.

Priorities, in order:
1. Match the requested goal, level, focus, intensity, and duration.
2. Create a coherent, purposeful, and balanced training session.
3. Choose an appropriate structure: straight sets, supersets, circuits, intervals, EMOM, AMRAP, or an optional finisher.
4. Use movement patterns, force, mechanics, category, difficulty, and muscles to select exercises.
5. Create meaningful variation from recent workouts. Repetition is allowed when it is a sound programming choice; novelty is secondary to coherence.
6. Keep the total duration realistic and within the stated tolerance.
7. Use only exercise IDs from the supplied eligible catalog.

Warm-up is mandatory, proportional to the session, and represented separately. Core is not a mandatory phase; include core work only when it serves the requested workout. Avoid multiple near-identical variation groups unless there is a clear programming reason. Prefer each exercise once, but a purposeful repeat is allowed; never repeat it accidentally in consecutive positions.

Interpret strength as generally favoring compound work, moderate/lower reps, and longer rest; hypertrophy as generally favoring more volume, compound plus isolation work, and useful supersets; general fitness permits more circuits, conditioning, and intervals. These are tendencies, not templates. Intensity may alter difficulty within the eligible catalog, volume, density, rest, unilateral work, and structure.

For straight_sets, use exercise sets and normally set block rounds to 1. For supersets, circuits, intervals, EMOM, and AMRAP, use block rounds and set exercise sets to null so volume is not counted twice. A prescription must contain reps, durationSeconds, or both. EMOM and AMRAP must use timed prescriptions and concise notes that make the format clear. Return only data matching the JSON schema.`;
  const exerciseCatalog = eligibleExercises.map((exercise) => ({
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    primaryPattern: exercise.primaryPattern,
    force: exercise.force,
    mechanic: exercise.mechanic,
    category: exercise.category,
    difficulty: exercise.difficulty,
    unilateral: exercise.unilateral,
    variationGroup: exercise.variationGroup,
    muscles: exercise.muscles.map(({ slug, role }) => ({ slug, role })),
  }));
  const history = recentWorkouts.map((workout) => ({
    goal: workout.goal,
    focus: workout.focus,
    exercises: workout.exerciseSlugs,
    blockTypes: workout.blockTypes,
  }));

  return {
    systemPrompt,
    userPrompt: JSON.stringify({
      preferences: input,
      durationToleranceMinutes: tolerance,
      eligibleExerciseCatalog: exerciseCatalog,
      recentWorkouts: history,
    }),
  };
}

async function generateOpenRouterPlan(
  input: GenerateWorkoutInput,
  eligibleExercises: CatalogExercise[],
  recentWorkouts: RecentWorkoutContext[],
) {
  const completion = await generateStructuredCompletion({
    ...buildWorkoutPrompts(input, eligibleExercises, recentWorkouts),
    schemaName: 'trx_workout_plan',
    jsonSchema: generatedWorkoutJsonSchema,
  });
  const workout = generatedWorkoutSchema.parse(completion.data);

  validateGeneratedWorkoutBusinessRules(
    workout,
    new Set(eligibleExercises.map(({ id }) => id)),
    input.durationMinutes,
  );
  return { workout, model: completion.model };
}

async function persistGeneratedWorkout(
  input: GenerateWorkoutInput,
  generatedWorkout: GeneratedWorkout,
) {
  const persistedBlocks = [
    {
      name: 'Warm-up',
      type: 'warm_up',
      rounds: 1,
      exercises: generatedWorkout.warmup.exercises,
    },
    ...generatedWorkout.blocks,
  ];
  const workoutId = await db.transaction(async (tx) => {
    const [workout] = await tx.insert(workouts).values({
      name: generatedWorkout.name,
      goal: input.goal,
      level: input.level,
      focus: input.focus,
      requestedDurationMinutes: input.durationMinutes,
      estimatedDurationMinutes: generatedWorkout.estimatedDurationMinutes,
      status: 'generated',
    }).returning({ id: workouts.id });
    const blocks = await tx.insert(workoutBlocks).values(
      persistedBlocks.map((block, index) => ({
        workoutId: workout.id,
        name: block.name,
        type: block.type,
        position: index + 1,
        rounds: block.rounds,
      })),
    ).returning({ id: workoutBlocks.id, position: workoutBlocks.position });
    const blockIdByPosition = new Map(
      blocks.map((block) => [block.position, block.id]),
    );
    const exerciseValues = persistedBlocks.flatMap((block, blockIndex) =>
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
  if (!workout) throw new Error('Generated workout could not be loaded');
  return workout;
}

function summarizeGenerationError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 200) : 'unknown error';
}

function logGenerationSummary({
  eligibleCount,
  recentCount,
  model,
  workout,
  fallbackUsed,
}: {
  eligibleCount: number;
  recentCount: number;
  model: string | null;
  workout: GeneratedWorkout;
  fallbackUsed: boolean;
}) {
  if (process.env.NODE_ENV !== 'development') return;
  console.info('Workout generation', {
    eligibleExercises: eligibleCount,
    recentWorkouts: recentCount,
    openRouterModel: model,
    blocks: workout.blocks.length,
    totalExercises: workout.warmup.exercises.length +
      workout.blocks.reduce((total, block) => total + block.exercises.length, 0),
    fallbackUsed,
  });
}

export async function generateWorkout(input: GenerateWorkoutInput) {
  const [catalog, recentWorkouts] = await Promise.all([
    loadExerciseCatalog(),
    getRecentWorkoutContext(FALLBACK_HISTORY_LIMIT),
  ]);
  const eligibleExercises = getEligibleExerciseCatalog(catalog, input.level);
  const plannerHistory = recentWorkouts.slice(0, RECENT_WORKOUT_LIMIT);

  if (eligibleExercises.length < 2) {
    throw new WorkoutGenerationError(
      'NO_COMPATIBLE_EXERCISES',
      'No compatible exercises available',
    );
  }

  let generatedWorkout: GeneratedWorkout;
  let openRouterModel: string | null = null;
  let fallbackUsed = false;

  try {
    const result = await generateOpenRouterPlan(
      input,
      eligibleExercises,
      plannerHistory,
    );
    generatedWorkout = result.workout;
    openRouterModel = result.model;
  } catch (error) {
    fallbackUsed = true;
    console.warn(
      'OpenRouter generation failed, using deterministic fallback:',
      summarizeGenerationError(error),
    );
    const fallbackCandidates = selectWorkoutCandidates({
      input,
      catalog,
      recentWorkouts,
    });
    generatedWorkout = generateDeterministicPlan(input, fallbackCandidates);
  }

  logGenerationSummary({
    eligibleCount: eligibleExercises.length,
    recentCount: plannerHistory.length,
    model: openRouterModel,
    workout: generatedWorkout,
    fallbackUsed,
  });
  return persistGeneratedWorkout(input, generatedWorkout);
}
