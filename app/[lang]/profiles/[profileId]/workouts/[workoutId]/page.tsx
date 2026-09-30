import Link from "next/link";
import { notFound } from "next/navigation";

import { MuscleHeatmap } from "@/components/muscles/muscle-heatmap";
import { ExerciseThumbnail } from "@/components/workouts/exercise-thumbnail";
import { WorkoutDetailActions } from "@/components/workouts/workout-detail-actions";
import { getTranslations } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translator";
import { getProfilePath } from "@/lib/profiles/profile-routes";
import {
  getWorkoutById,
  type WorkoutDetail,
} from "@/lib/workouts/workout.repository";
import { isUuid } from "@/lib/validation/uuid";

function humanize(value: string) {
  const words = value.replaceAll("_", " ").replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function enumLabel(
  dictionary: Record<string, string>,
  value: string,
  fallback: (value: string) => string = humanize,
) {
  return dictionary[value] ?? fallback(value);
}

function getPrescription(
  t: Translator,
  exercise: WorkoutDetail["blocks"][number]["exercises"][number],
) {
  const m = t.messages.common;
  const amount = exercise.durationSeconds
    ? `${exercise.durationSeconds} ${m.seconds_abbreviation}`
    : exercise.reps
      ? `${exercise.reps}${exercise.repsPerSide ? ` ${m.per_side}` : ""}`
      : null;

  if (!amount) {
    return exercise.sets ? `${exercise.sets} ${m.sets}` : null;
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
  t,
  profileId,
  workoutId,
  workoutExercise,
}: {
  t: Translator;
  profileId: string;
  workoutId: string;
  workoutExercise: WorkoutDetail["blocks"][number]["exercises"][number];
}) {
  const { exercise } = workoutExercise;
  const image = exercise.images.find((candidate) => candidate.url.trim());
  const prescription = getPrescription(t, workoutExercise);
  const mainMuscles = getMainMuscles(exercise.muscles);
  const equipment = enumLabel(
    t.messages.enums.equipment as Record<string, string>,
    exercise.equipment,
  );

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
                pathname: `/${t.language}/exercises/${exercise.id}`,
                query: { profileId, workoutId },
              }}
              className="-my-2 inline-flex min-h-11 items-center rounded-md py-2 outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-primary"
            >
              {exercise.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {humanize(
              exercise.primaryPattern ||
                exercise.family ||
                t.messages.common.exercise,
            )}
            {` · ${equipment}`}
          </p>
          {prescription ? (
            <p className="mt-3 text-sm font-semibold text-zinc-800">
              {prescription}
            </p>
          ) : null}
          {workoutExercise.restSeconds ? (
            <p className="mt-1 text-xs text-zinc-500">
              {t.format(t.messages.workout_detail.rest, {
                seconds: workoutExercise.restSeconds,
              })}
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
  props: {
    params: Promise<{ lang: string; profileId: string; workoutId: string }>;
  },
) {
  const { profileId, workoutId } = await props.params;

  if (!isUuid(profileId) || !isUuid(workoutId)) {
    notFound();
  }

  const [workout, t] = await Promise.all([
    getWorkoutById(profileId, workoutId),
    getTranslations(),
  ]);

  if (!workout) {
    notFound();
  }

  const m = t.messages;
  const duration =
    workout.estimatedDurationMinutes ?? workout.requestedDurationMinutes;
  const level = enumLabel(
    m.enums.level as Record<string, string>,
    workout.level,
  );
  const focus = enumLabel(
    m.enums.focus as Record<string, string>,
    workout.focus,
  );

  return (
    <div>
      <header>
        <Link
          href={getProfilePath(t.language, profileId)}
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
          {workout.name}
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          {duration} {m.common.minutes_abbreviation}{" "}
          <span aria-hidden="true">·</span> {level}
        </p>
        <p className="mt-1 text-sm text-zinc-500">{focus}</p>
      </header>

      <WorkoutDetailActions
        profileId={profileId}
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
            {m.common.muscle_focus}
          </h2>
          <MuscleHeatmap
            muscles={workout.muscleSummary}
            translator={t}
            contextLabel={m.muscle_heatmap.this_workout}
          />
        </section>

        <div className="mt-9 divide-y divide-zinc-200">
          {workout.blocks.map((block) => (
            <section key={block.id} className="py-7 first:pt-0">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                    {block.name}
                  </h2>
                  {block.type !== "warm_up" ? (
                    <p className="mt-1 text-xs font-medium text-primary-hover">
                      {enumLabel(
                        m.enums.block_type as Record<string, string>,
                        block.type,
                      )}
                    </p>
                  ) : null}
                </div>
                {block.rounds > 1 ? (
                  <p className="shrink-0 pt-1 text-sm text-zinc-500">
                    {t.format(m.workout_detail.rounds, { count: block.rounds })}
                  </p>
                ) : null}
              </div>
              <div className="space-y-3">
                {block.exercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    t={t}
                    profileId={profileId}
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
