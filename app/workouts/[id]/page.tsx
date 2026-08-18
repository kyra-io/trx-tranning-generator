import Link from "next/link";
import { notFound } from "next/navigation";

import { MuscleHeatmap } from "@/components/muscles/muscle-heatmap";
import { ExerciseThumbnail } from "@/components/workouts/exercise-thumbnail";
import { WorkoutDetailActions } from "@/components/workouts/workout-detail-actions";
import {
  getWorkoutById,
  type WorkoutDetail,
} from "@/lib/workouts/workout.repository";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const labels: Record<string, string> = {
  full_body: "Full body",
  upper_body: "Upper body",
  lower_body: "Lower body",
  core: "Core",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function humanize(value: string) {
  if (labels[value]) {
    return labels[value];
  }

  const words = value.replaceAll("_", " ").replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function getPrescription(
  exercise: WorkoutDetail["blocks"][number]["exercises"][number],
) {
  const amount = exercise.durationSeconds
    ? `${exercise.durationSeconds} sec`
    : exercise.reps
      ? `${exercise.reps}${exercise.repsPerSide ? " / side" : ""}`
      : null;

  if (!amount) {
    return exercise.sets ? `${exercise.sets} sets` : null;
  }

  return exercise.sets ? `${exercise.sets} × ${amount}` : amount;
}

function getMainMuscles(
  muscles: WorkoutDetail["blocks"][number]["exercises"][number]["exercise"]["muscles"],
) {
  const primary = muscles.filter((muscle) => muscle.role === "primary");
  const secondary = muscles.filter((muscle) => muscle.role === "secondary");
  const selected = primary.length >= 3 ? primary : [...primary, ...secondary];

  return [...new Map(selected.map((muscle) => [muscle.id, muscle])).values()]
    .slice(0, 3)
    .map((muscle) => muscle.name)
    .join(" · ");
}

function ExerciseCard({
  workoutId,
  workoutExercise,
}: {
  workoutId: string;
  workoutExercise: WorkoutDetail["blocks"][number]["exercises"][number];
}) {
  const { exercise } = workoutExercise;
  const image = exercise.images.find((candidate) => candidate.url.trim());
  const prescription = getPrescription(workoutExercise);
  const mainMuscles = getMainMuscles(exercise.muscles);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-3.5">
      <div className="flex gap-3.5">
        <ExerciseThumbnail
          imageUrl={image?.url ?? null}
          exerciseName={exercise.name}
        />

        <div className="min-w-0 flex-1 py-0.5">
          <h3 className="font-semibold leading-5 text-zinc-900">
            <Link
              href={{
                pathname: `/exercises/${exercise.id}`,
                query: { workoutId },
              }}
              className="-my-2 inline-flex min-h-11 items-center rounded-md py-2 outline-none hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              {exercise.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {humanize(exercise.primaryPattern || exercise.family || "Exercise")}
          </p>
          {prescription ? (
            <p className="mt-3 text-sm font-semibold text-zinc-800">
              {prescription}
            </p>
          ) : null}
          {workoutExercise.restSeconds ? (
            <p className="mt-1 text-xs text-zinc-500">
              Rest {workoutExercise.restSeconds} sec
            </p>
          ) : null}
        </div>
      </div>

      {mainMuscles || workoutExercise.notes ? (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          {mainMuscles ? (
            <p className="text-xs leading-5 text-zinc-500">{mainMuscles}</p>
          ) : null}
          {workoutExercise.notes ? (
            <p className="mt-1 text-sm leading-5 text-zinc-600">
              {workoutExercise.notes}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default async function WorkoutDetailPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;

  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const workout = await getWorkoutById(id);

  if (!workout) {
    notFound();
  }

  const duration =
    workout.estimatedDurationMinutes ?? workout.requestedDurationMinutes;

  return (
    <div>
      <header>
        <Link
          href="/workouts"
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-zinc-500 outline-none hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="size-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m12.5 4-6 6 6 6"
            />
          </svg>
          Back
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
          {workout.name}
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          {duration} min <span aria-hidden="true">·</span>{" "}
          {humanize(workout.level)}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          {humanize(workout.focus)}
        </p>
      </header>

      <WorkoutDetailActions
        workoutId={workout.id}
        initialStatus={workout.status}
        initialFeedback={
          workout.feedback
            ? {
                difficulty: workout.feedback.difficulty,
                notes: workout.feedback.notes,
              }
            : null
        }
      >
        <section className="mt-8" aria-labelledby="muscle-focus-heading">
          <h2
            id="muscle-focus-heading"
            className="mb-4 text-xl font-semibold tracking-tight text-zinc-900"
          >
            Muscle focus
          </h2>
          <MuscleHeatmap muscles={workout.muscleSummary} />
        </section>

        <div className="mt-9 divide-y divide-zinc-200">
          {workout.blocks.map((block) => (
            <section key={block.id} className="py-7 first:pt-0">
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                  {block.name}
                </h2>
                {block.rounds > 1 ? (
                  <p className="shrink-0 text-sm text-zinc-500">
                    {block.rounds} rounds
                  </p>
                ) : null}
              </div>
              <div className="space-y-3">
                {block.exercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    workoutId={workout.id}
                    workoutExercise={exercise}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </WorkoutDetailActions>
    </div>
  );
}
