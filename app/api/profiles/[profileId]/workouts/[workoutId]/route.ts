import { NextResponse } from 'next/server';

import { isUuid } from '@/lib/validation/uuid';
import {
  deleteWorkout,
  getWorkoutById,
} from '@/lib/workouts/workout.repository';

type Params = Promise<{ profileId: string; workoutId: string }>;

function invalidIds(profileId: string, workoutId: string) {
  if (!isUuid(profileId)) return 'Invalid profile id';
  if (!isUuid(workoutId)) return 'Invalid workout id';
  return null;
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const { profileId, workoutId } = await params;
  const invalid = invalidIds(profileId, workoutId);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    const workout = await getWorkoutById(profileId, workoutId);
    return workout
      ? NextResponse.json(workout)
      : NextResponse.json({ error: 'Workout not found' }, { status: 404 });
  } catch (error) {
    console.error('Failed to get workout', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { profileId, workoutId } = await params;
  const invalid = invalidIds(profileId, workoutId);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    return await deleteWorkout(profileId, workoutId)
      ? new Response(null, { status: 204 })
      : NextResponse.json({ error: 'Workout not found' }, { status: 404 });
  } catch (error) {
    console.error('Failed to delete workout', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
