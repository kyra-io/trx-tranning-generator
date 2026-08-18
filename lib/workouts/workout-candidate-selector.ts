export type WorkoutGoal = 'strength' | 'hypertrophy' | 'general_fitness';
export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutFocus =
  | 'full_body'
  | 'upper_body'
  | 'lower_body'
  | 'core';

export type WorkoutCandidateInput = {
  goal: WorkoutGoal;
  durationMinutes: number;
  level: WorkoutLevel;
  focus: WorkoutFocus;
  intensity: number;
};

export type CandidateExercise = {
  id: string;
  slug: string;
  name: string;
  family: string | null;
  primaryPattern: string;
  difficulty: number;
  unilateral: boolean;
  muscles: Array<{
    slug: string;
    bodyRegion: string | null;
    role: string;
    activation: number;
  }>;
};

export type RecentWorkoutUsage = {
  workoutId: string;
  exerciseIds: string[];
};

export type SelectedWorkoutCandidate = CandidateExercise & {
  score: number;
  recentCount: number;
  variationGroup: string;
};

type RandomSource = () => number;

const maximumDifficulty: Record<WorkoutLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const focusPatterns: Record<WorkoutFocus, string[]> = {
  full_body: ['pull', 'push', 'squat', 'lunge', 'hinge', 'plank', 'rotate'],
  upper_body: ['pull', 'push', 'rotate', 'plank'],
  lower_body: ['squat', 'lunge', 'hinge'],
  core: ['plank', 'rotate'],
};

const accessoryTerms = ['curl', 'raise', 'fly', 'triceps', 'face-pull'];

function normalize(value: string | null) {
  return value?.trim().toLowerCase().replaceAll('_', '-').replaceAll(' ', '-') ?? '';
}

/** Groups only close substitutes; broad families such as `press` stay split. */
export function getVariationGroup(exercise: Pick<CandidateExercise, 'slug' | 'family'>) {
  const slug = normalize(exercise.slug).replace(/^trx-/, '');

  if (/^(row|low-row|mid-row|high-row)$/.test(slug)) return 'row';
  if (/^(squat|single-leg-squat)$/.test(slug)) return 'squat';
  if (/^(split-squat|reverse-lunge|forward-lunge)$/.test(slug)) return 'split-lunge';
  if (/^(plank|body-saw)$/.test(slug)) return 'front-plank';

  // Slug is the safe default: chest press, push-up, atomic push-up and
  // accessory pulls should not collapse merely because their family matches.
  return slug || normalize(exercise.family) || exercise.slug;
}

export function getCandidatePoolSize(durationMinutes: number) {
  if (durationMinutes <= 20) return 8;
  if (durationMinutes <= 35) return 12;
  if (durationMinutes <= 50) return 15;
  return 18;
}

function primaryMuscles(exercise: CandidateExercise) {
  return new Set(
    exercise.muscles
      .filter((muscle) => muscle.role === 'primary')
      .map((muscle) => muscle.slug),
  );
}

function muscleSimilarity(a: CandidateExercise, b: CandidateExercise) {
  const aMuscles = primaryMuscles(a);
  const bMuscles = primaryMuscles(b);
  if (aMuscles.size === 0 || bMuscles.size === 0) return 0;
  const intersection = [...aMuscles].filter((muscle) => bMuscles.has(muscle)).length;
  const union = new Set([...aMuscles, ...bMuscles]).size;
  return intersection / union;
}

function historyStats(exerciseId: string, history: RecentWorkoutUsage[]) {
  const recentTen = history.slice(0, 10);
  const positions = recentTen.flatMap((workout, index) =>
    workout.exerciseIds.includes(exerciseId) ? [index] : [],
  );

  return {
    previous: positions.includes(0),
    lastThreeCount: positions.filter((position) => position < 3).length,
    lastFiveCount: positions.filter((position) => position < 5).length,
    lastTenCount: positions.length,
  };
}

function goalScore(exercise: CandidateExercise, goal: WorkoutGoal) {
  const descriptor = `${normalize(exercise.slug)} ${normalize(exercise.family)}`;
  const accessory = accessoryTerms.some((term) => descriptor.includes(term));

  if (goal === 'strength') return accessory ? 0 : 0.75;
  if (goal === 'hypertrophy') return accessory ? 0.75 : 0.25;
  return exercise.unilateral || ['rotate', 'lunge'].includes(normalize(exercise.primaryPattern))
    ? 0.5
    : 0.25;
}

function levelFitScore(exercise: CandidateExercise, input: WorkoutCandidateInput) {
  const ceiling = maximumDifficulty[input.level];
  if (exercise.difficulty === ceiling) return input.intensity >= 6 ? 1 : 0.5;
  return input.intensity <= 4 && exercise.difficulty === 1 ? 0.75 : 0;
}

function baseScore(
  exercise: CandidateExercise,
  input: WorkoutCandidateInput,
  history: RecentWorkoutUsage[],
) {
  const stats = historyStats(exercise.id, history);
  const focusMatch = focusPatterns[input.focus].includes(normalize(exercise.primaryPattern));

  // Weights are deliberately legible: base 1, focus +3, novelty +2,
  // exact level fit up to +1, goal fit up to +0.75. Recency costs -5 for
  // the previous workout, -2 for each other use in workouts 2-3, -1 for
  // each use in workouts 4-5 and -0.25 for workouts 6-10.
  const noveltyBonus = stats.lastFiveCount === 0 ? 2 : 0;
  const previousPenalty = stats.previous ? 5 : 0;
  const lastThreePenalty = Math.max(0, stats.lastThreeCount - (stats.previous ? 1 : 0)) * 2;
  const lastFivePenalty = Math.max(0, stats.lastFiveCount - stats.lastThreeCount);
  const olderPenalty = Math.max(0, stats.lastTenCount - stats.lastFiveCount) * 0.25;

  return {
    score: Math.max(
      0.2,
      1 +
        (focusMatch ? 3 : 0) +
        noveltyBonus +
        levelFitScore(exercise, input) +
        goalScore(exercise, input.goal) -
        previousPenalty -
        lastThreePenalty -
        lastFivePenalty -
        olderPenalty,
    ),
    recentCount: stats.lastTenCount,
  };
}

export function weightedSample<T>(
  items: readonly T[],
  weightFn: (item: T) => number,
  random: RandomSource = Math.random,
) {
  if (items.length === 0) return undefined;
  const weights = items.map((item) => Math.max(0, weightFn(item)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return items[Math.floor(random() * items.length)];

  let threshold = random() * total;
  for (let index = 0; index < items.length; index += 1) {
    threshold -= weights[index];
    if (threshold <= 0) return items[index];
  }
  return items.at(-1);
}

function desiredPatternOrder(focus: WorkoutFocus) {
  if (focus === 'full_body') {
    return ['pull', 'push', 'squat', 'lunge', 'hinge', 'plank', 'rotate'];
  }
  return focusPatterns[focus];
}

function matchesFocus(exercise: CandidateExercise, focus: WorkoutFocus) {
  if (focus === 'full_body') return true;
  return focusPatterns[focus].includes(normalize(exercise.primaryPattern));
}

export function selectWorkoutCandidates({
  input,
  catalog,
  recentWorkouts,
  random = Math.random,
}: {
  input: WorkoutCandidateInput;
  catalog: CandidateExercise[];
  recentWorkouts: RecentWorkoutUsage[];
  random?: RandomSource;
}): SelectedWorkoutCandidate[] {
  const eligible = catalog.filter(
    (exercise) => exercise.difficulty <= maximumDifficulty[input.level],
  );
  const targetSize = Math.min(getCandidatePoolSize(input.durationMinutes), eligible.length);
  const selected: SelectedWorkoutCandidate[] = [];
  const selectedIds = new Set<string>();
  const selectedGroups = new Set<string>();
  const patterns = desiredPatternOrder(input.focus);

  const choose = (
    pattern?: string,
    relaxVariation = false,
    focusOnly = false,
  ) => {
    const available = eligible.filter((exercise) => {
      if (selectedIds.has(exercise.id)) return false;
      if (!relaxVariation && selectedGroups.has(getVariationGroup(exercise))) return false;
      if (focusOnly && !matchesFocus(exercise, input.focus)) return false;
      return pattern === undefined || normalize(exercise.primaryPattern) === pattern;
    });

    const picked = weightedSample(
      available,
      (exercise) => {
        const scored = baseScore(exercise, input, recentWorkouts).score;
        const patternNeed = selected.some(
          (candidate) => normalize(candidate.primaryPattern) === normalize(exercise.primaryPattern),
        )
          ? 0
          : 2;
        const similarityPenalty = selected.reduce(
          (penalty, candidate) => Math.max(penalty, muscleSimilarity(exercise, candidate) * 1.5),
          0,
        );
        return Math.max(0.2, scored + patternNeed - similarityPenalty);
      },
      random,
    );
    if (!picked) return false;

    const scored = baseScore(picked, input, recentWorkouts);
    selected.push({
      ...picked,
      score: Number(scored.score.toFixed(2)),
      recentCount: scored.recentCount,
      variationGroup: getVariationGroup(picked),
    });
    selectedIds.add(picked.id);
    selectedGroups.add(getVariationGroup(picked));
    return true;
  };

  // Seed coverage first, then fill by weighted sampling. Full body therefore
  // exposes all available movement patterns before adding second choices.
  for (const pattern of patterns) {
    if (selected.length >= targetSize) break;
    choose(pattern);
  }
  while (selected.length < targetSize && choose(undefined, false, true)) {
    // Selection state changes in choose().
  }
  // First relax variation within the requested focus. If that is still too
  // small, include at most one complementary movement outside the focus.
  while (selected.length < targetSize && choose(undefined, true, true)) {
    // Relax variation only after exhausting distinct groups.
  }
  if (selected.length < targetSize) choose();

  return selected;
}
