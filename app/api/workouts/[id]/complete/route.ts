import { NextResponse } from 'next/server';

import {
  completeWorkout,
  type CompleteWorkoutInput,
  type WorkoutDifficulty,
  WorkoutNotFoundError,
} from '@/lib/workouts/workout.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const difficulties = new Set<WorkoutDifficulty>([
  'too_easy',
  'good',
  'too_hard',
]);

type Context = {
  params: Promise<{ id: string }>;
};

type ValidationDetail = {
  path: string[];
  message: string;
};

function validateRequest(body: unknown) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return {
      details: [{ path: [], message: 'Expected a JSON object' }],
    };
  }

  const value = body as Record<string, unknown>;
  const details: ValidationDetail[] = [];

  if (
    typeof value.difficulty !== 'string' ||
    !difficulties.has(value.difficulty as WorkoutDifficulty)
  ) {
    details.push({
      path: ['difficulty'],
      message: 'Expected too_easy, good, or too_hard',
    });
  }

  if (
    value.notes !== undefined &&
    value.notes !== null &&
    (typeof value.notes !== 'string' || value.notes.length > 1000)
  ) {
    details.push({
      path: ['notes'],
      message: 'Expected null or a string with at most 1000 characters',
    });
  }

  if (details.length > 0) {
    return { details };
  }

  return {
    input: value as CompleteWorkoutInput,
    details,
  };
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: 'Invalid workout id' },
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid request',
        details: [{ path: [], message: 'Invalid JSON body' }],
      },
      { status: 400 },
    );
  }

  const validation = validateRequest(body);

  if (!validation.input) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.details },
      { status: 400 },
    );
  }

  try {
    const workout = await completeWorkout(id, validation.input);

    return NextResponse.json(workout);
  } catch (error) {
    if (error instanceof WorkoutNotFoundError) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 },
      );
    }

    console.error('Failed to complete workout', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
