"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function WorkoutDetailError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center"
    >
      <h1 className="text-xl font-semibold text-zinc-900">
        Could not load workout
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Something went wrong. Please try again.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link
          href="/workouts"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          Back
        </Link>
        <button
          type="button"
          onClick={() => retry()}
          className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white outline-none hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
