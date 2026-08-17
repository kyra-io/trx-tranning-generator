export type WorkoutMuscleSummary = {
  id: string;
  slug: string;
  name: string;
  bodyRegion: string | null;
  svgRegion: string | null;
  score: number;
};

type MuscleSummaryBlock = {
  rounds: number | null;
  exercises: Array<{
    sets: number | null;
    reps: number | null;
    durationSeconds: number | null;
    exercise: {
      muscles: Array<{
        id: string;
        slug: string;
        name: string;
        bodyRegion: string | null;
        svgRegion: string | null;
        activation: number | string;
      }>;
    };
  }>;
};

function nonNegativeNumber(value: number | null, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

export function calculateWorkoutMuscleSummary(
  blocks: MuscleSummaryBlock[],
): WorkoutMuscleSummary[] {
  const loads = new Map<
    string,
    Omit<WorkoutMuscleSummary, 'score'> & { load: number }
  >();

  for (const block of blocks) {
    for (const workoutExercise of block.exercises) {
      // Existing prescriptions store total sets, so rounds only fill in missing sets.
      const volumeMultiplier =
        workoutExercise.sets === null
          ? nonNegativeNumber(block.rounds, 1)
          : nonNegativeNumber(workoutExercise.sets, 1);
      const effectiveWork =
        workoutExercise.reps !== null
          ? nonNegativeNumber(workoutExercise.reps, 1)
          : workoutExercise.durationSeconds !== null
            ? nonNegativeNumber(workoutExercise.durationSeconds, 5) / 5
            : 1;
      const exerciseVolume = volumeMultiplier * effectiveWork;

      for (const muscle of workoutExercise.exercise.muscles) {
        const activation = Number(muscle.activation);

        if (!Number.isFinite(activation) || activation <= 0) {
          continue;
        }

        const muscleLoad = exerciseVolume * activation;
        const existing = loads.get(muscle.id);

        if (existing) {
          existing.load += muscleLoad;
          continue;
        }

        loads.set(muscle.id, {
          id: muscle.id,
          slug: muscle.slug,
          name: muscle.name,
          bodyRegion: muscle.bodyRegion,
          svgRegion: muscle.svgRegion,
          load: muscleLoad,
        });
      }
    }
  }

  const maximumLoad = Math.max(0, ...Array.from(loads.values(), ({ load }) => load));

  if (maximumLoad === 0) {
    return [];
  }

  return Array.from(loads.values(), ({ load, ...muscle }) => ({
    ...muscle,
    score: Math.round((load / maximumLoad) * 100) / 100,
  })).sort((left, right) => right.score - left.score || left.slug.localeCompare(right.slug));
}
