const SECONDS_PER_REP = 3;

export const WARMUP_DURATION = {
  minimumMinutes: 10,
  maximumMinutes: 15,
  toleranceMinutes: 3,
  rounds: 2,
} as const;

type ExercisePrescription = {
  sets: number | null;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
};

export type WarmupPrescription = {
  rounds: number;
  exercises: readonly ExercisePrescription[];
};

function workSeconds(exercise: ExercisePrescription): number {
  if (exercise.durationSeconds !== null) return exercise.durationSeconds;
  if (exercise.reps !== null) return exercise.reps * SECONDS_PER_REP;
  return 0;
}

/** Estimated minutes for a single exercise, including its rest periods. */
export function estimateExerciseMinutes(
  exercise: ExercisePrescription,
  rounds = 1,
): number {
  const sets = exercise.sets ?? 1;
  const restSeconds = exercise.restSeconds ?? 0;
  return ((workSeconds(exercise) + restSeconds) * sets * rounds) / 60;
}

export function estimateExercisesMinutes(
  exercises: readonly ExercisePrescription[],
  rounds = 1,
): number {
  return exercises.reduce(
    (total, exercise) => total + estimateExerciseMinutes(exercise, rounds),
    0,
  );
}

/** Estimated minutes for a warm-up circuit, counting its block rounds. */
export function estimateWarmupMinutes(warmup: WarmupPrescription): number {
  return estimateExercisesMinutes(warmup.exercises, warmup.rounds);
}

/**
 * Warm-up time is additional to the requested training duration. It targets
 * the 10-15 minute window, scaling gently for longer sessions.
 */
export function getWarmupTargetMinutes(requestedDurationMinutes: number): number {
  return Math.min(
    WARMUP_DURATION.maximumMinutes,
    Math.max(
      WARMUP_DURATION.minimumMinutes,
      Math.round(requestedDurationMinutes / 4),
    ),
  );
}

export function isWarmupDurationWithinTolerance(
  warmup: WarmupPrescription,
): boolean {
  const minutes = estimateWarmupMinutes(warmup);
  return (
    minutes >= WARMUP_DURATION.minimumMinutes - WARMUP_DURATION.toleranceMinutes &&
    minutes <= WARMUP_DURATION.maximumMinutes + WARMUP_DURATION.toleranceMinutes
  );
}
