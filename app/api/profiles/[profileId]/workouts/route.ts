import { NextResponse } from 'next/server';

import { getProfileById } from '@/lib/profiles/profile.repository';
import { isUuid } from '@/lib/validation/uuid';
import { listWorkouts } from '@/lib/workouts/workout.repository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params;

  if (!isUuid(profileId)) {
    return NextResponse.json({ error: 'Invalid profile id' }, { status: 400 });
  }

  try {
    if (!await getProfileById(profileId)) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json(await listWorkouts(profileId));
  } catch (error) {
    console.error('Failed to list workouts', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
