import { asc, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  exerciseImages,
  exerciseMuscles,
  exercises,
  muscles,
  workoutBlocks,
  workoutExercises,
  workoutFeedback,
  workouts,
} from '@/lib/db/schema';
import {
  calculateWorkoutMuscleSummary,
  type WorkoutMuscleSummary,
} from '@/lib/workouts/workout-muscle-summary';

type WorkoutSummary = Pick<
  typeof workouts.$inferSelect,
  | 'id'
  | 'name'
  | 'goal'
  | 'level'
  | 'focus'
  | 'requestedDurationMinutes'
  | 'estimatedDurationMinutes'
  | 'status'
  | 'createdAt'
  | 'startedAt'
  | 'completedAt'
>;

type ExerciseImage = Pick<
  typeof exerciseImages.$inferSelect,
  'id' | 'type' | 'url' | 'sortOrder'
>;

type ExerciseMuscle = Pick<
  typeof muscles.$inferSelect,
  'id' | 'slug' | 'name' | 'bodyRegion' | 'svgRegion'
> & {
  role: string;
  activation: number;
};

type WorkoutExercise = Pick<
  typeof workoutExercises.$inferSelect,
  | 'id'
  | 'position'
  | 'sets'
  | 'reps'
  | 'repsPerSide'
  | 'durationSeconds'
  | 'restSeconds'
  | 'notes'
> & {
  exercise: Pick<
    typeof exercises.$inferSelect,
    | 'id'
    | 'slug'
    | 'name'
    | 'family'
    | 'primaryPattern'
    | 'difficulty'
    | 'unilateral'
  > & {
    images: ExerciseImage[];
    muscles: ExerciseMuscle[];
  };
};

export type WorkoutDetail = WorkoutSummary & {
  muscleSummary: WorkoutMuscleSummary[];
  feedback: Pick<
    typeof workoutFeedback.$inferSelect,
    'difficulty' | 'notes' | 'createdAt'
  > | null;
  blocks: Array<
    Pick<
      typeof workoutBlocks.$inferSelect,
      'id' | 'name' | 'type' | 'position' | 'rounds'
    > & {
      exercises: WorkoutExercise[];
    }
  >;
};

const workoutFields = {
  id: workouts.id,
  name: workouts.name,
  goal: workouts.goal,
  level: workouts.level,
  focus: workouts.focus,
  requestedDurationMinutes: workouts.requestedDurationMinutes,
  estimatedDurationMinutes: workouts.estimatedDurationMinutes,
  status: workouts.status,
  createdAt: workouts.createdAt,
  startedAt: workouts.startedAt,
  completedAt: workouts.completedAt,
};

export async function listWorkouts(): Promise<WorkoutSummary[]> {
  return db
    .select(workoutFields)
    .from(workouts)
    .orderBy(desc(workouts.createdAt));
}

export async function deleteWorkout(id: string): Promise<boolean> {
  const deletedWorkouts = await db
    .delete(workouts)
    .where(eq(workouts.id, id))
    .returning({ id: workouts.id });

  return deletedWorkouts.length > 0;
}

export async function getWorkoutById(
  id: string,
): Promise<WorkoutDetail | null> {
  const [workout] = await db
    .select(workoutFields)
    .from(workouts)
    .where(eq(workouts.id, id))
    .limit(1);

  if (!workout) {
    return null;
  }

  const [blocks, [feedback]] = await Promise.all([
    db
      .select({
        id: workoutBlocks.id,
        name: workoutBlocks.name,
        type: workoutBlocks.type,
        position: workoutBlocks.position,
        rounds: workoutBlocks.rounds,
      })
      .from(workoutBlocks)
      .where(eq(workoutBlocks.workoutId, id))
      .orderBy(asc(workoutBlocks.position)),
    db
      .select({
        difficulty: workoutFeedback.difficulty,
        notes: workoutFeedback.notes,
        createdAt: workoutFeedback.createdAt,
      })
      .from(workoutFeedback)
      .where(eq(workoutFeedback.workoutId, id))
      .limit(1),
  ]);

  if (blocks.length === 0) {
    return {
      ...workout,
      muscleSummary: [],
      feedback: feedback ?? null,
      blocks: [],
    };
  }

  const workoutExerciseRows = await db
    .select({
      blockId: workoutExercises.blockId,
      id: workoutExercises.id,
      position: workoutExercises.position,
      sets: workoutExercises.sets,
      reps: workoutExercises.reps,
      repsPerSide: workoutExercises.repsPerSide,
      durationSeconds: workoutExercises.durationSeconds,
      restSeconds: workoutExercises.restSeconds,
      notes: workoutExercises.notes,
      exerciseId: exercises.id,
      exerciseSlug: exercises.slug,
      exerciseName: exercises.name,
      exerciseFamily: exercises.family,
      exercisePrimaryPattern: exercises.primaryPattern,
      exerciseDifficulty: exercises.difficulty,
      exerciseUnilateral: exercises.unilateral,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(inArray(workoutExercises.blockId, blocks.map((block) => block.id)))
    .orderBy(asc(workoutExercises.position));

  const exerciseIds = [
    ...new Set(workoutExerciseRows.map((row) => row.exerciseId)),
  ];

  const imagesByExerciseId = new Map<string, ExerciseImage[]>();
  const musclesByExerciseId = new Map<string, ExerciseMuscle[]>();

  if (exerciseIds.length > 0) {
    const [imageRows, muscleRows] = await Promise.all([
      db
        .select({
          exerciseId: exerciseImages.exerciseId,
          id: exerciseImages.id,
          type: exerciseImages.type,
          url: exerciseImages.url,
          sortOrder: exerciseImages.sortOrder,
        })
        .from(exerciseImages)
        .where(inArray(exerciseImages.exerciseId, exerciseIds))
        .orderBy(asc(exerciseImages.sortOrder)),
      db
        .select({
          exerciseId: exerciseMuscles.exerciseId,
          id: muscles.id,
          slug: muscles.slug,
          name: muscles.name,
          bodyRegion: muscles.bodyRegion,
          svgRegion: muscles.svgRegion,
          role: exerciseMuscles.role,
          activation: exerciseMuscles.activation,
        })
        .from(exerciseMuscles)
        .innerJoin(muscles, eq(exerciseMuscles.muscleId, muscles.id))
        .where(inArray(exerciseMuscles.exerciseId, exerciseIds))
        .orderBy(asc(muscles.name)),
    ]);

    for (const image of imageRows) {
      const images = imagesByExerciseId.get(image.exerciseId) ?? [];
      images.push({
        id: image.id,
        type: image.type,
        url: image.url,
        sortOrder: image.sortOrder,
      });
      imagesByExerciseId.set(image.exerciseId, images);
    }

    for (const muscle of muscleRows) {
      const exerciseMuscleList =
        musclesByExerciseId.get(muscle.exerciseId) ?? [];
      exerciseMuscleList.push({
        id: muscle.id,
        slug: muscle.slug,
        name: muscle.name,
        bodyRegion: muscle.bodyRegion,
        svgRegion: muscle.svgRegion,
        role: muscle.role,
        activation: Number(muscle.activation),
      });
      musclesByExerciseId.set(muscle.exerciseId, exerciseMuscleList);
    }
  }

  const exercisesByBlockId = new Map<string, WorkoutExercise[]>();

  for (const row of workoutExerciseRows) {
    const blockExercises = exercisesByBlockId.get(row.blockId) ?? [];
    blockExercises.push({
      id: row.id,
      position: row.position,
      sets: row.sets,
      reps: row.reps,
      repsPerSide: row.repsPerSide,
      durationSeconds: row.durationSeconds,
      restSeconds: row.restSeconds,
      notes: row.notes,
      exercise: {
        id: row.exerciseId,
        slug: row.exerciseSlug,
        name: row.exerciseName,
        family: row.exerciseFamily,
        primaryPattern: row.exercisePrimaryPattern,
        difficulty: row.exerciseDifficulty,
        unilateral: row.exerciseUnilateral,
        images: imagesByExerciseId.get(row.exerciseId) ?? [],
        muscles: musclesByExerciseId.get(row.exerciseId) ?? [],
      },
    });
    exercisesByBlockId.set(row.blockId, blockExercises);
  }

  const workoutBlocksWithExercises = blocks.map((block) => ({
    ...block,
    exercises: exercisesByBlockId.get(block.id) ?? [],
  }));

  return {
    ...workout,
    muscleSummary: calculateWorkoutMuscleSummary(workoutBlocksWithExercises),
    feedback: feedback ?? null,
    blocks: workoutBlocksWithExercises,
  };
}
