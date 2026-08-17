import { NextResponse } from 'next/server';

import {
  deleteWorkout,
  getWorkoutById,
} from '@/lib/workouts/workout.repository';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: 'Invalid workout id' },
      { status: 400 },
    );
  }

  try {
    const workout = await getWorkoutById(id);

    if (!workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(workout);
  } catch (error) {
    console.error('Failed to get workout', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: 'Invalid workout id' },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteWorkout(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete workout', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
