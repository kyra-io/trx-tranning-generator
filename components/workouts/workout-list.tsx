"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  WorkoutCard,
  type WorkoutSummary,
} from "@/components/workouts/workout-card";

export function WorkoutList() {
  const [workouts, setWorkouts] = useState<WorkoutSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorkouts() {
      try {
        const response = await fetch("/api/workouts", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load workouts");
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Unexpected workouts response");
        }

        setWorkouts(data as WorkoutSummary[]);
      } catch (loadError) {
        if (
          !(loadError instanceof DOMException && loadError.name === "AbortError")
        ) {
          setError(true);
        }
      }
    }

    loadWorkouts();

    return () => controller.abort();
  }, [requestKey]);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center"
      >
        <h2 className="font-semibold text-zinc-900">Could not load workouts</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            setError(false);
            setWorkouts(null);
            setRequestKey((key) => key + 1);
          }}
          className="mt-5 min-h-11 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  if (workouts === null) {
    return (
      <div role="status" className="py-12 text-center text-sm text-zinc-500">
        Loading workouts...
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
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
        <h2 className="mt-4 font-semibold text-zinc-900">No workouts yet</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-500">
          Generate your first workout to see it here.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white outline-none hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          Create workout
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </div>
  );
}
