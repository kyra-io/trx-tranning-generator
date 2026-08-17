import Link from "next/link";

export default function ExerciseNotFound() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center">
      <h1 className="text-xl font-semibold text-zinc-900">
        Exercise not found
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        This exercise may no longer be available.
      </p>
      <Link
        href="/workouts"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white outline-none hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
      >
        Back to workouts
      </Link>
    </div>
  );
}
