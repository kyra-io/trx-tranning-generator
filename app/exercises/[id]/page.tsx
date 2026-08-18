import Link from "next/link";
import { notFound } from "next/navigation";

import { ExerciseMediaGallery } from "@/components/exercises/exercise-media-gallery";
import { MuscleHeatmap } from "@/components/muscles/muscle-heatmap";
import {
  getExerciseById,
  type ExerciseDetail,
} from "@/lib/exercises/exercise.repository";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const difficultyLabels: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
};

const muscleGroups = [
  { role: "primary", label: "Primary muscles" },
  { role: "secondary", label: "Secondary" },
  { role: "stabilizer", label: "Stabilizers" },
] as const;

function humanize(value: string) {
  const words = value.replaceAll("_", " ").replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function MuscleList({ muscles }: { muscles: ExerciseDetail["muscles"] }) {
  const groups = muscleGroups
    .map((group) => ({
      ...group,
      muscles: muscles
        .filter((muscle) => muscle.role === group.role)
        .sort(
          (left, right) =>
            right.activation - left.activation ||
            left.name.localeCompare(right.name),
        ),
    }))
    .filter((group) => group.muscles.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4">
      {groups.map((group) => (
        <section
          key={group.role}
          className="border-b border-zinc-100 py-4 last:border-b-0"
        >
          <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            {group.label}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {group.muscles.map((muscle) => (
              <li key={muscle.id} className="text-sm text-zinc-800">
                {muscle.name}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default async function ExerciseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workoutId?: string | string[] }>;
}) {
  const { id } = await params;
  const { workoutId } = await searchParams;

  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const exercise = await getExerciseById(id);

  if (!exercise) {
    notFound();
  }

  const images = exercise.images.filter((image) => image.url.trim());
  const difficulty =
    difficultyLabels[exercise.difficulty] ?? `Level ${exercise.difficulty}`;
  const heatmapMuscles = exercise.muscles.map((muscle) => ({
    slug: muscle.slug,
    name: muscle.name,
    svgRegion: muscle.svgRegion,
    score: muscle.activation,
  }));
  const backHref =
    typeof workoutId === "string" && UUID_PATTERN.test(workoutId)
      ? `/workouts/${workoutId}`
      : "/workouts";

  return (
    <div className="min-w-0">
      <header>
        <Link
          href={backHref}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-zinc-500 outline-none hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-primary"
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
          {exercise.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600">
          <span>{humanize(exercise.primaryPattern)}</span>
          <span aria-hidden="true">·</span>
          <span>{difficulty}</span>
          {exercise.unilateral ? (
            <span className="rounded-full border border-primary bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-hover">
              Unilateral
            </span>
          ) : null}
        </div>
        {exercise.family ? (
          <p className="mt-1 text-sm text-zinc-500">
            {humanize(exercise.family)}
          </p>
        ) : null}
      </header>

      <ExerciseMediaGallery images={images} exerciseName={exercise.name} />

      <section className="mt-9" aria-labelledby="instructions-heading">
        <h2
          id="instructions-heading"
          className="text-xl font-semibold tracking-tight text-zinc-900"
        >
          How to perform
        </h2>
        {exercise.instructions ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-600">
            {exercise.instructions}
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">
            Instructions not available
          </p>
        )}
      </section>

      <section className="mt-9" aria-labelledby="muscle-focus-heading">
        <h2
          id="muscle-focus-heading"
          className="mb-4 text-xl font-semibold tracking-tight text-zinc-900"
        >
          Muscle focus
        </h2>
        <MuscleHeatmap muscles={heatmapMuscles} contextLabel="this exercise" />
        <MuscleList muscles={exercise.muscles} />
      </section>

      {exercise.notes ? (
        <section className="mt-9" aria-labelledby="notes-heading">
          <h2
            id="notes-heading"
            className="text-xl font-semibold tracking-tight text-zinc-900"
          >
            Notes
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-600">
            {exercise.notes}
          </p>
        </section>
      ) : null}

      {exercise.sourceName ? (
        <section className="mt-9 border-t border-zinc-200 pt-6" aria-labelledby="source-heading">
          <h2
            id="source-heading"
            className="text-xs font-semibold tracking-wide text-zinc-500 uppercase"
          >
            Source
          </h2>
          {exercise.sourceUrl ? (
            <a
              href={exercise.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-11 items-center font-medium text-primary-hover underline-offset-4 outline-none hover:text-primary-strong hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-primary"
            >
              {exercise.sourceName}
            </a>
          ) : (
            <p className="mt-2 text-sm text-zinc-700">{exercise.sourceName}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
