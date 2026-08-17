import { NextResponse } from 'next/server';

import { listWorkouts } from '@/lib/workouts/workout.repository';

export async function GET() {
  try {
    const workouts = await listWorkouts();

    return NextResponse.json(workouts);
  } catch (error) {
    console.error('Failed to list workouts', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
