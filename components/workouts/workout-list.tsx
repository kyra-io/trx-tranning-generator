"use client";

import Link from "next/link";
import { useState } from "react";

import {
  WorkoutCard,
  type WorkoutSummary,
} from "@/components/workouts/workout-card";
import { useLocale, useTranslations } from "@/lib/i18n/translations-provider";
import { getProfileWorkoutCreationPath } from "@/lib/profiles/profile-routes";

type WorkoutFilter = "generated" | "completed" | "all";

export function WorkoutList({
  profileId,
  workouts,
}: {
  profileId: string;
  workouts: WorkoutSummary[];
}) {
  const t = useTranslations();
  const language = useLocale();
  const m = t.messages;
  const [filter, setFilter] = useState<WorkoutFilter>("generated");

  const emptyStateCopy: Record<
    WorkoutFilter,
    { title: string; description: string }
  > = {
    generated: {
      title: m.workout_list.empty_generated_title,
      description: m.workout_list.empty_generated_description,
    },
    completed: {
      title: m.workout_list.empty_completed_title,
      description: m.workout_list.empty_completed_description,
    },
    all: {
      title: m.workout_list.empty_all_title,
      description: m.workout_list.empty_all_description,
    },
  };

  const filterControl = (
    <div className="mb-4">
      <label
        htmlFor="workout-filter"
        className="mb-1.5 block text-sm font-medium text-zinc-700"
      >
        {m.workout_list.filter_label}
      </label>
      <select
        id="workout-filter"
        value={filter}
        onChange={(event) => {
          setFilter(event.target.value as WorkoutFilter);
        }}
        className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <option value="generated">{m.enums.status.generated}</option>
        <option value="completed">{m.enums.status.completed}</option>
        <option value="all">{m.workout_list.filter_all}</option>
      </select>
    </div>
  );

  const filteredWorkouts = workouts.filter((workout) => {
    if (filter === "completed") {
      return workout.status === "completed";
    }

    if (filter === "generated") {
      return workout.status !== "completed";
    }

    return true;
  });

  if (filteredWorkouts.length === 0) {
    const emptyState = emptyStateCopy[filter];

    return (
      <>
        {filterControl}
        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 6h11M8 12h11M8 18h7M4 6h.01M4 12h.01M4 18h.01"
              />
            </svg>
          </div>
          <h2 className="mt-4 font-semibold text-zinc-900">
            {emptyState.title}
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-500">
            {emptyState.description}
          </p>
          <Link
            href={getProfileWorkoutCreationPath(language, profileId)}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-hover px-5 text-sm font-semibold text-white outline-none hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {m.common.create_workout}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {filterControl}
      <div className="space-y-3">
        {filteredWorkouts.map((workout) => (
          <WorkoutCard key={workout.id} profileId={profileId} workout={workout} />
        ))}
      </div>
    </>
  );
}
