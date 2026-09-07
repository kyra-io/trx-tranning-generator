import { NextResponse } from 'next/server';

import { getProfileById } from '@/lib/profiles/profile.repository';
import { isUuid } from '@/lib/validation/uuid';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params;

  if (!isUuid(profileId)) {
    return NextResponse.json({ error: 'Invalid profile id' }, { status: 400 });
  }

  try {
    const profile = await getProfileById(profileId);
    return profile
      ? NextResponse.json(profile)
      : NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  } catch (error) {
    console.error('Failed to get profile', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
