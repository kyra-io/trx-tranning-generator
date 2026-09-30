import Link from "next/link";
import { notFound } from "next/navigation";

import { ExerciseMediaGallery } from "@/components/exercises/exercise-media-gallery";
import { MuscleHeatmap } from "@/components/muscles/muscle-heatmap";
import { getTranslations } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translator";
import {
  getHomePath,
  getProfileWorkoutPath,
} from "@/lib/profiles/profile-routes";
import {
  getExerciseById,
  type ExerciseDetail,
} from "@/lib/exercises/exercise.repository";
import { isUuid } from "@/lib/validation/uuid";

function humanize(value: string) {
  const words = value.replaceAll("_", " ").replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function MuscleList({
  t,
  muscles,
}: {
  t: Translator;
  muscles: ExerciseDetail["muscles"];
}) {
  const muscleGroups = [
    { role: "primary", label: t.messages.enums.muscle_role.primary },
    { role: "secondary", label: t.messages.enums.muscle_role.secondary },
    { role: "stabilizer", label: t.messages.enums.muscle_role.stabilizer },
  ] as const;

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
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{
    profileId?: string | string[];
    workoutId?: string | string[];
  }>;
}) {
  const { id } = await params;
  const { profileId, workoutId } = await searchParams;

  if (!isUuid(id)) {
    notFound();
  }

  const [exercise, t] = await Promise.all([
    getExerciseById(id),
    getTranslations(),
  ]);

  if (!exercise) {
    notFound();
  }

  const m = t.messages;
  const images = exercise.images.filter((image) => image.url.trim());
  const difficulty =
    exercise.difficulty === 1
      ? m.enums.level.beginner
      : exercise.difficulty === 2
        ? m.enums.level.intermediate
        : exercise.difficulty === 3
          ? m.enums.level.advanced
          : t.format(m.exercise_detail.level_fallback, {
              level: exercise.difficulty,
            });
  const heatmapMuscles = exercise.muscles.map((muscle) => ({
    slug: muscle.slug,
    name: muscle.name,
    svgRegion: muscle.svgRegion,
    score: muscle.activation,
  }));
  const backHref =
    typeof profileId === "string" &&
    typeof workoutId === "string" &&
    isUuid(profileId) &&
    isUuid(workoutId)
      ? getProfileWorkoutPath(t.language, profileId, workoutId)
      : getHomePath(t.language);

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
          {m.common.back}
        </Link>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
          {exercise.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600">
          <span>{humanize(exercise.primaryPattern)}</span>
          <span aria-hidden="true">·</span>
          <span>{difficulty}</span>
          <span aria-hidden="true">·</span>
          <span>
            {(m.enums.equipment as Record<string, string>)[exercise.equipment] ??
              humanize(exercise.equipment)}
          </span>
          {exercise.unilateral ? (
            <span className="rounded-full border border-primary bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-hover">
              {m.exercise_detail.unilateral}
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
          {m.exercise_detail.how_to_perform}
        </h2>
        {exercise.instructions ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-600">
            {exercise.instructions}
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">
            {m.exercise_detail.instructions_unavailable}
          </p>
        )}
      </section>

      <section className="mt-9" aria-labelledby="muscle-focus-heading">
        <h2
          id="muscle-focus-heading"
          className="mb-4 text-xl font-semibold tracking-tight text-zinc-900"
        >
          {m.common.muscle_focus}
        </h2>
        <MuscleHeatmap
          muscles={heatmapMuscles}
          translator={t}
          contextLabel={m.muscle_heatmap.this_exercise}
        />
        <MuscleList t={t} muscles={exercise.muscles} />
      </section>

      {exercise.notes ? (
        <section className="mt-9" aria-labelledby="notes-heading">
          <h2
            id="notes-heading"
            className="text-xl font-semibold tracking-tight text-zinc-900"
          >
            {m.common.notes}
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
            {m.exercise_detail.source}
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
