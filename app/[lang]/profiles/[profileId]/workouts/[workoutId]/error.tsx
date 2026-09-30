"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useLocale, useTranslations } from "@/lib/i18n/translations-provider";
import { getHomePath } from "@/lib/profiles/profile-routes";

export default function WorkoutDetailError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const language = useLocale();
  const t = useTranslations();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center"
    >
      <h1 className="text-xl font-semibold text-zinc-900">
        {t.messages.errors.load_workout}
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {t.messages.errors.generic}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link
          href={getHomePath(language)}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t.messages.common.back}
        </Link>
        <button
          type="button"
          onClick={() => retry()}
          className="min-h-11 rounded-xl bg-primary-hover px-4 text-sm font-semibold text-white outline-none hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t.messages.common.try_again}
        </button>
      </div>
    </div>
  );
}
