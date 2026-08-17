import { NextResponse } from 'next/server';

import {
  generateWorkout,
  type GenerateWorkoutInput,
  WorkoutGenerationError,
  type WorkoutFocus,
  type WorkoutGoal,
  type WorkoutLevel,
} from '@/lib/workouts/workout-generator.service';

type ValidationDetail = {
  path: string[];
  message: string;
};

const goals = new Set<WorkoutGoal>([
  'strength',
  'hypertrophy',
  'general_fitness',
]);
const levels = new Set<WorkoutLevel>([
  'beginner',
  'intermediate',
  'advanced',
]);
const focuses = new Set<WorkoutFocus>([
  'full_body',
  'upper_body',
  'lower_body',
  'core',
]);

function validateRequest(body: unknown) {
  const details: ValidationDetail[] = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return {
      details: [{ path: [], message: 'Expected a JSON object' }],
    };
  }

  const input = body as Record<string, unknown>;

  if (typeof input.goal !== 'string' || !goals.has(input.goal as WorkoutGoal)) {
    details.push({
      path: ['goal'],
      message: 'Expected strength, hypertrophy, or general_fitness',
    });
  }

  if (
    typeof input.durationMinutes !== 'number' ||
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 15 ||
    input.durationMinutes > 60
  ) {
    details.push({
      path: ['durationMinutes'],
      message: 'Expected an integer between 15 and 60',
    });
  }

  if (
    typeof input.level !== 'string' ||
    !levels.has(input.level as WorkoutLevel)
  ) {
    details.push({
      path: ['level'],
      message: 'Expected beginner, intermediate, or advanced',
    });
  }

  if (
    typeof input.focus !== 'string' ||
    !focuses.has(input.focus as WorkoutFocus)
  ) {
    details.push({
      path: ['focus'],
      message: 'Expected full_body, upper_body, lower_body, or core',
    });
  }

  if (
    typeof input.intensity !== 'number' ||
    !Number.isInteger(input.intensity) ||
    input.intensity < 1 ||
    input.intensity > 10
  ) {
    details.push({
      path: ['intensity'],
      message: 'Expected an integer between 1 and 10',
    });
  }

  if (details.length > 0) {
    return { details };
  }

  return { input: input as GenerateWorkoutInput, details };
}

export async function POST(request: Request) {
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
    const workout = await generateWorkout(validation.input);

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    if (error instanceof WorkoutGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error('Failed to generate workout', error);

    return NextResponse.json(
      { error: 'Failed to generate workout' },
      { status: 500 },
    );
  }
}
