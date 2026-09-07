import { NextResponse } from 'next/server';

import { listProfiles } from '@/lib/profiles/profile.repository';
import {
  createProfile,
  ProfileNameConflictError,
  ProfileValidationError,
} from '@/lib/profiles/profile.service';

export async function GET() {
  try {
    return NextResponse.json(await listProfiles());
  } catch (error) {
    console.error('Failed to list profiles', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

  try {
    return NextResponse.json(await createProfile(body), { status: 201 });
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.details },
        { status: 400 },
      );
    }
    if (error instanceof ProfileNameConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error('Failed to create profile', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
