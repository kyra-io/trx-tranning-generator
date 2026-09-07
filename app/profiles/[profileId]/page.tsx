import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkoutList } from "@/components/workouts/workout-list";
import { getProfileById } from "@/lib/profiles/profile.repository";
import { getProfileWorkoutCreationPath } from "@/lib/profiles/profile-routes";
import { isUuid } from "@/lib/validation/uuid";
import { listWorkouts } from "@/lib/workouts/workout.repository";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  if (!isUuid(profileId)) notFound();

  const profile = await getProfileById(profileId);
  if (!profile) notFound();

  const workouts = await listWorkouts(profileId);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {profile.name}
        </h1>
        <p className="mt-2 text-base text-zinc-500">Your training history</p>
        <Link
          href={getProfileWorkoutCreationPath(profileId)}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-hover px-5 text-sm font-semibold text-white outline-none hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Create workout
        </Link>
      </header>
      <WorkoutList profileId={profileId} workouts={workouts} />
    </div>
  );
}
