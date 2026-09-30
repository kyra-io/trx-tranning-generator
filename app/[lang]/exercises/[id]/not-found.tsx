import Link from "next/link";

import { getTranslations } from "@/lib/i18n/server";
import { getHomePath } from "@/lib/profiles/profile-routes";

export default async function ExerciseNotFound() {
  const t = await getTranslations();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center">
      <h1 className="text-xl font-semibold text-zinc-900">
        {t.messages.not_found.exercise_title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {t.messages.not_found.exercise_description}
      </p>
      <Link
        href={getHomePath(t.language)}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-hover px-5 text-sm font-semibold text-white outline-none hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {t.messages.common.back_to_profiles}
      </Link>
    </div>
  );
}
