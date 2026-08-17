import { loadEnvConfig } from '@next/env';
import { and, asc, eq } from 'drizzle-orm';

loadEnvConfig(process.cwd());

const WORKOUT_NAME = 'Full Body Strength';

async function seedWorkout() {
  const { db } = await import('./index');
  const {
    exercises,
    workoutBlocks,
    workoutExercises,
    workouts,
  } = await import('./schema');

  const result = await db.transaction(async (tx) => {
    const availableExercises = await tx
      .select({
        id: exercises.id,
        slug: exercises.slug,
      })
      .from(exercises)
      .orderBy(asc(exercises.slug));

    if (availableExercises.length === 0) {
      throw new Error('No exercises available. Seed exercises first.');
    }

    const exerciseBySlug = new Map(
      availableExercises.map((exercise) => [exercise.slug, exercise]),
    );
    const firstAvailable = availableExercises[0];
    const warmUpExercise =
      exerciseBySlug.get('trx-squat') ?? firstAvailable;
    const preferredStrengthSlugs = [
      'trx-row',
      'trx-chest-press',
      'trx-split-squat',
    ];
    const strengthExercises = preferredStrengthSlugs
      .map((slug) => exerciseBySlug.get(slug))
      .filter((exercise) => exercise !== undefined);

    if (strengthExercises.length === 0) {
      strengthExercises.push(...availableExercises.slice(0, 3));
    }

    const coreExercise =
      exerciseBySlug.get('trx-plank') ??
      exerciseBySlug.get('trx-fallout') ??
      availableExercises.find(
        (exercise) =>
          exercise.id !== warmUpExercise.id &&
          !strengthExercises.some(
            (strengthExercise) => strengthExercise.id === exercise.id,
          ),
      ) ??
      firstAvailable;

    await tx
      .delete(workouts)
      .where(
        and(
          eq(workouts.name, WORKOUT_NAME),
          eq(workouts.status, 'generated'),
        ),
      );

    const [workout] = await tx
      .insert(workouts)
      .values({
        name: WORKOUT_NAME,
        goal: 'strength',
        level: 'intermediate',
        focus: 'full_body',
        requestedDurationMinutes: 30,
        estimatedDurationMinutes: 30,
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
          name: 'Strength',
          type: 'strength',
          position: 2,
          rounds: 3,
        },
        {
          workoutId: workout.id,
          name: 'Core',
          type: 'core',
          position: 3,
          rounds: 3,
        },
      ])
      .returning({ id: workoutBlocks.id, type: workoutBlocks.type });

    const blockByType = new Map(
      blocks.map((block) => [block.type, block]),
    );
    const warmUpBlock = blockByType.get('warm_up');
    const strengthBlock = blockByType.get('strength');
    const coreBlock = blockByType.get('core');

    if (!warmUpBlock || !strengthBlock || !coreBlock) {
      throw new Error('Failed to create workout blocks.');
    }

    const coreUsesDuration = ['trx-plank', 'trx-fallout'].includes(
      coreExercise.slug,
    );
    const workoutExerciseData = [
      {
        blockId: warmUpBlock.id,
        exerciseId: warmUpExercise.id,
        position: 1,
        sets: 2,
        reps: 12,
        restSeconds: 30,
      },
      ...strengthExercises.map((exercise, index) => ({
        blockId: strengthBlock.id,
        exerciseId: exercise.id,
        position: index + 1,
        sets: 3,
        reps: 10,
        restSeconds: 45,
      })),
      {
        blockId: coreBlock.id,
        exerciseId: coreExercise.id,
        position: 1,
        sets: 3,
        reps: coreUsesDuration ? undefined : 10,
        durationSeconds: coreUsesDuration ? 30 : undefined,
        restSeconds: 30,
      },
    ];

    await tx.insert(workoutExercises).values(workoutExerciseData);

    return {
      workoutId: workout.id,
      blockCount: blocks.length,
      exerciseCount: workoutExerciseData.length,
    };
  });

  console.log(`Seeded workout: ${WORKOUT_NAME}`);
  console.log(`Workout ID: ${result.workoutId}`);
  console.log(`Blocks: ${result.blockCount}`);
  console.log(`Exercises: ${result.exerciseCount}`);
}

seedWorkout()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
