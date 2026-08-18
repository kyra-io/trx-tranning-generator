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
  force: string | null;
  mechanic: string | null;
  category: string | null;
  variationGroup: string | null;
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
  variationGroup: string | null;
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

function normalize(value: string | null) {
  return value?.trim().toLowerCase().replaceAll('_', '-').replaceAll(' ', '-') ?? '';
}

/** Persisted metadata is authoritative; id only keeps legacy null rows distinct. */
export function getVariationGroup(
  exercise: Pick<CandidateExercise, 'id' | 'variationGroup'>,
) {
  return normalize(exercise.variationGroup) || `exercise:${exercise.id}`;
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

function mechanicGoalFit(
  exercise: CandidateExercise,
  goal: WorkoutGoal,
  selected: SelectedWorkoutCandidate[],
) {
  const mechanic = normalize(exercise.mechanic);
  const mechanicIsNew = !selected.some(
    (candidate) => normalize(candidate.mechanic) === mechanic,
  );

  if (goal === 'strength') return mechanic === 'compound' ? 0.75 : 0;
  if (goal === 'hypertrophy') {
    return (mechanicIsNew ? 0.75 : 0) + (mechanic === 'isolation' ? 0.5 : 0.25);
  }
  return mechanicIsNew ? 0.5 : 0;
}

function categoryGoalFit(exercise: CandidateExercise, input: WorkoutCandidateInput) {
  const category = normalize(exercise.category);
  let score = 0;

  if (['strength', 'hypertrophy'].includes(input.goal) && category === 'strength') score += 0.75;
  if (input.goal === 'general_fitness' && category === 'conditioning') score += 1.25;
  if (input.focus === 'core' && category === 'core') score += 1.5;
  return score;
}

function forceDiversityBonus(
  exercise: CandidateExercise,
  input: WorkoutCandidateInput,
  selected: SelectedWorkoutCandidate[],
) {
  const force = normalize(exercise.force);
  if (!force) return 0;
  const selectedForces = new Set(selected.map((candidate) => normalize(candidate.force)));

  if (input.focus === 'upper_body' && ['push', 'pull'].includes(force)) {
    return selectedForces.has(force) ? 0 : 1;
  }
  if (input.focus === 'full_body' && ['push', 'pull', 'static', 'mixed'].includes(force)) {
    return selectedForces.has(force) ? 0 : 0.75;
  }
  return 0;
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

  // Stable score: base 1, focus +3, novelty +2 and level fit up to +1.
  // Goal/category/mechanic/force signals are added during sampling. Recency costs -5 for
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
        levelFitScore(exercise, input) -
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

  const selectionScore = (exercise: CandidateExercise, variationRelaxed: boolean) => {
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
    const variationPenalty = variationRelaxed && selectedGroups.has(getVariationGroup(exercise))
      ? 3
      : 0;

    return Math.max(
      0.2,
      scored +
        patternNeed +
        mechanicGoalFit(exercise, input.goal, selected) +
        categoryGoalFit(exercise, input) +
        forceDiversityBonus(exercise, input, selected) -
        similarityPenalty -
        variationPenalty,
    );
  };

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
      (exercise) => selectionScore(exercise, relaxVariation),
      random,
    );
    if (!picked) return false;

    const scored = baseScore(picked, input, recentWorkouts);
    selected.push({
      ...picked,
      score: Number(selectionScore(picked, relaxVariation).toFixed(2)),
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
