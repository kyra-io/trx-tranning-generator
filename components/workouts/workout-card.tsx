import Link from "next/link";

export type WorkoutSummary = {
  id: string;
  name: string;
  goal: string;
  level: string;
  focus: string;
  requestedDurationMinutes: number;
  estimatedDurationMinutes: number | null;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

const labels: Record<string, string> = {
  full_body: "Full body",
  upper_body: "Upper body",
  lower_body: "Lower body",
  core: "Core",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  generated: "Generated",
  in_progress: "In progress",
  completed: "Completed",
};

export function WorkoutCard({ workout }: { workout: WorkoutSummary }) {
  const duration =
    workout.estimatedDurationMinutes ?? workout.requestedDurationMinutes;
  const createdDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(workout.createdAt));

  return (
    <Link
      href={`/workouts/${workout.id}`}
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
        {duration} min <span aria-hidden="true">·</span>{" "}
        {labels[workout.level] ?? workout.level}
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        {labels[workout.focus] ?? workout.focus}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
        <time dateTime={workout.createdAt} className="text-zinc-500">
          {createdDate}
        </time>
        <span
          className={`rounded-full px-2.5 py-1 font-medium ${
            workout.status === "completed"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-primary-soft text-primary-hover"
          }`}
        >
          {labels[workout.status] ?? workout.status}
        </span>
      </div>
    </Link>
  );
}
