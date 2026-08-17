import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exercises } from '@/lib/db/schema';

export async function GET() {
  const data = await db.select().from(exercises);

  return NextResponse.json(data);
}
