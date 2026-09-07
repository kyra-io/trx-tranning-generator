import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';

const profileFields = {
  id: profiles.id,
  name: profiles.name,
  createdAt: profiles.createdAt,
};

export type Profile = typeof profiles.$inferSelect;

export async function listProfiles(): Promise<Profile[]> {
  return db
    .select(profileFields)
    .from(profiles)
    .orderBy(asc(profiles.name));
}

export async function getProfileById(profileId: string): Promise<Profile | null> {
  const [profile] = await db
    .select(profileFields)
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  return profile ?? null;
}

export async function insertProfile(name: string): Promise<Profile> {
  const [profile] = await db
    .insert(profiles)
    .values({ name })
    .returning(profileFields);

  return profile;
}
