import { notFound } from "next/navigation";

import { WorkoutGeneratorForm } from "@/components/generate/workout-generator-form";
import { getTranslations } from "@/lib/i18n/server";
import { getProfileById } from "@/lib/profiles/profile.repository";
import { isUuid } from "@/lib/validation/uuid";

export default async function NewWorkoutPage({
  params,
}: {
  params: Promise<{ lang: string; profileId: string }>;
}) {
  const { profileId } = await params;
  if (!isUuid(profileId)) notFound();

  const profile = await getProfileById(profileId);
  if (!profile) notFound();

  const t = await getTranslations();

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {t.messages.common.create_workout}
        </h1>
        <p className="mt-2 text-base text-zinc-500">
          {t.format(t.messages.workout_generator.for_profile, {
            name: profile.name,
          })}
        </p>
      </header>
      <WorkoutGeneratorForm profileId={profileId} />
    </div>
  );
}
