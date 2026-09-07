import { notFound } from "next/navigation";

import { WorkoutGeneratorForm } from "@/components/generate/workout-generator-form";
import { getProfileById } from "@/lib/profiles/profile.repository";
import { isUuid } from "@/lib/validation/uuid";

export default async function NewWorkoutPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  if (!isUuid(profileId)) notFound();

  const profile = await getProfileById(profileId);
  if (!profile) notFound();

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Create workout
        </h1>
        <p className="mt-2 text-base text-zinc-500">For {profile.name}</p>
      </header>
      <WorkoutGeneratorForm profileId={profileId} />
    </div>
  );
}
