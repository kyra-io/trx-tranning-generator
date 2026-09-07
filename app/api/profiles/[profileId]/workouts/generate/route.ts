import { NextResponse } from 'next/server';

import { isUuid } from '@/lib/validation/uuid';
import {
  generateWorkout,
  WorkoutGenerationError,
} from '@/lib/workouts/workout-generator.service';
import { validateGenerateWorkoutInput } from '@/lib/workouts/workout-input-validation';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params;

  if (!isUuid(profileId)) {
    return NextResponse.json({ error: 'Invalid profile id' }, { status: 400 });
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

  const validation = validateGenerateWorkoutInput(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.details },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await generateWorkout(profileId, validation.input),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof WorkoutGenerationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PROFILE_NOT_FOUND' ? 404 : 422 },
      );
    }

    console.error('Failed to generate workout', error);
    return NextResponse.json({ error: 'Failed to generate workout' }, { status: 500 });
  }
}
