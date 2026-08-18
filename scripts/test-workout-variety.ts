import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());
delete process.env.OPENROUTER_API_KEY;

const baseInput = {
  durationMinutes: 30,
  level: 'intermediate' as const,
  focus: 'full_body' as const,
  intensity: 7,
};

type Goal = 'strength' | 'hypertrophy' | 'general_fitness';

function distribution(values: Array<string | null>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value ?? 'null';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1]));
}

async function runGoal(goal: Goal) {
  const { generateWorkout } = await import('../lib/workouts/workout-generator.service');
  const generated = [];

  for (let index = 0; index < 20; index += 1) {
    generated.push(await generateWorkout({ ...baseInput, goal }));
  }

  const exerciseLists = generated.map((workout) =>
    workout.blocks.flatMap((block) => block.exercises.map(({ exercise }) => exercise)),
  );
  const signatures = exerciseLists.map((list) => list.map(({ id }) => id).sort().join(','));
  const allExercises = exerciseLists.flat();
  const frequencies = new Map<string, { name: string; count: number }>();

  for (const exercise of allExercises) {
    const frequency = frequencies.get(exercise.id) ?? { name: exercise.name, count: 0 };
    frequency.count += 1;
    frequencies.set(exercise.id, frequency);
  }

  const overlaps = exerciseLists.slice(1).map((list, index) => {
    const previous = new Set(exerciseLists[index].map(({ id }) => id));
    const current = new Set(list.map(({ id }) => id));
    const intersection = [...current].filter((id) => previous.has(id)).length;
    return intersection / new Set([...previous, ...current]).size;
  });
  const duplicateExerciseIds = exerciseLists.filter(
    (list) => new Set(list.map(({ id }) => id)).size !== list.length,
  ).length;
  const duplicateVariationGroups = exerciseLists.filter((list) => {
    const groups = list.map(({ variationGroup, id }) => variationGroup ?? `exercise:${id}`);
    return new Set(groups).size !== groups.length;
  }).length;

  return {
    workouts: exerciseLists.length,
    uniqueWorkouts: new Set(signatures).size,
    averageConsecutiveOverlap: Number(
      (overlaps.reduce((sum, overlap) => sum + overlap, 0) / overlaps.length).toFixed(3),
    ),
    frequencyByExercise: Object.fromEntries(
      [...frequencies].sort((a, b) => b[1].count - a[1].count),
    ),
    primaryPattern: distribution(allExercises.map(({ primaryPattern }) => primaryPattern)),
    force: distribution(allExercises.map(({ force }) => force)),
    mechanic: distribution(allExercises.map(({ mechanic }) => mechanic)),
    category: distribution(allExercises.map(({ category }) => category)),
    variationGroup: distribution(allExercises.map(({ variationGroup }) => variationGroup)),
    regressions: {
      maximumDifficulty: Math.max(...allExercises.map(({ difficulty }) => difficulty)),
      duplicateExerciseIdWorkouts: duplicateExerciseIds,
      duplicateVariationGroupWorkouts: duplicateVariationGroups,
      emptyWorkouts: exerciseLists.filter((list) => list.length === 0).length,
    },
  };
}

async function main() {
  const results = {
    strength: await runGoal('strength'),
    hypertrophy: await runGoal('hypertrophy'),
    general_fitness: await runGoal('general_fitness'),
  };

  console.log(JSON.stringify(results, null, 2));
}

main().then(() => process.exit(0)).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
