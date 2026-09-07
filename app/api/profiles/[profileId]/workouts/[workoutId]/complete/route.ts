import { NextResponse } from 'next/server';

import { isUuid } from '@/lib/validation/uuid';
import { validateCompleteWorkoutInput } from '@/lib/workouts/workout-input-validation';
import {
  completeWorkout,
  WorkoutNotFoundError,
} from '@/lib/workouts/workout.service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ profileId: string; workoutId: string }> },
) {
  const { profileId, workoutId } = await params;
  if (!isUuid(profileId)) {
    return NextResponse.json({ error: 'Invalid profile id' }, { status: 400 });
  }
  if (!isUuid(workoutId)) {
    return NextResponse.json({ error: 'Invalid workout id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request', details: [{ path: [], message: 'Invalid JSON body' }] },
      { status: 400 },
    );
  }

  const validation = validateCompleteWorkoutInput(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.details },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await completeWorkout(profileId, workoutId, validation.input),
    );
  } catch (error) {
    if (error instanceof WorkoutNotFoundError) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    console.error('Failed to complete workout', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
