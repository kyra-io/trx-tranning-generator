"use client";

import Link from "next/link";

import { LANGUAGE_TAGS } from "@/lib/i18n/locales";
import { useLocale, useTranslations } from "@/lib/i18n/translations-provider";
import { getProfileWorkoutPath } from "@/lib/profiles/profile-routes";

export type WorkoutSummary = {
  id: string;
  profileId: string;
  name: string;
  goal: string;
  level: string;
  focus: string;
  requestedDurationMinutes: number;
  estimatedDurationMinutes: number | null;
  status: string;
  createdAt: string | Date;
  startedAt: string | Date | null;
  completedAt: string | Date | null;
};

function enumLabel(dictionary: Record<string, string>, value: string) {
  return (
    dictionary[value] ??
    value
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .replace(/^\w/, (character) => character.toUpperCase())
  );
}

export function WorkoutCard({
  profileId,
  workout,
}: {
  profileId: string;
  workout: WorkoutSummary;
}) {
  const language = useLocale();
  const t = useTranslations();
  const m = t.messages;
  const duration =
    workout.estimatedDurationMinutes ?? workout.requestedDurationMinutes;
  const createdDate = new Intl.DateTimeFormat(LANGUAGE_TAGS[language], {
    month: "short",
    day: "numeric",
  }).format(new Date(workout.createdAt));
  const level = enumLabel(m.enums.level, workout.level);
  const focus = enumLabel(m.enums.focus, workout.focus);
  const status = enumLabel(m.enums.status, workout.status);

  return (
    <Link
      href={getProfileWorkoutPath(language, profileId, workout.id)}
      className="group block rounded-2xl border border-zinc-200 bg-white p-4 outline-none transition-colors hover:border-zinc-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-semibold text-zinc-900 group-hover:text-primary-hover">
          {workout.name}
        </h2>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="mt-0.5 size-5 shrink-0 text-zinc-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m7.5 4 6 6-6 6"
          />
        </svg>
      </div>
      <p className="mt-3 text-sm text-zinc-600">
        {duration} {m.common.minutes_abbreviation}{" "}
        <span aria-hidden="true">·</span> {level}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{focus}</p>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
        <time dateTime={new Date(workout.createdAt).toISOString()} className="text-zinc-500">
          {createdDate}
        </time>
        <span
          className={`rounded-full px-2.5 py-1 font-medium ${
            workout.status === "completed"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-primary-soft text-primary-hover"
          }`}
        >
          {status}
        </span>
      </div>
    </Link>
  );
}
