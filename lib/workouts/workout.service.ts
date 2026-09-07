import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { workoutFeedback, workouts } from '@/lib/db/schema';
import { getWorkoutById } from '@/lib/workouts/workout.repository';

export type WorkoutDifficulty = 'too_easy' | 'good' | 'too_hard';

export type CompleteWorkoutInput = {
  difficulty: WorkoutDifficulty;
  notes?: string | null;
};

export class WorkoutNotFoundError extends Error {
  constructor() {
    super('Workout not found');
    this.name = 'WorkoutNotFoundError';
  }
}

export async function completeWorkout(
  profileId: string,
  workoutId: string,
  input: CompleteWorkoutInput,
) {
  await db.transaction(async (tx) => {
    const [workout] = await tx
      .select({ id: workouts.id })
      .from(workouts)
      .where(
        and(
          eq(workouts.profileId, profileId),
          eq(workouts.id, workoutId),
        ),
      )
      .limit(1);

    if (!workout) {
      throw new WorkoutNotFoundError();
    }

    await tx
      .update(workouts)
      .set({
        status: 'completed',
        completedAt: sql`coalesce(${workouts.completedAt}, now())`,
      })
      .where(
        and(
          eq(workouts.profileId, profileId),
          eq(workouts.id, workoutId),
        ),
      );

    await tx
      .insert(workoutFeedback)
      .values({
        workoutId,
        difficulty: input.difficulty,
        notes: input.notes ?? null,
      })
      .onConflictDoUpdate({
        target: workoutFeedback.workoutId,
        set: {
          difficulty: input.difficulty,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      });
  });

  const workout = await getWorkoutById(profileId, workoutId);

  if (!workout) {
    throw new Error('Completed workout could not be loaded');
  }

  return workout;
}
