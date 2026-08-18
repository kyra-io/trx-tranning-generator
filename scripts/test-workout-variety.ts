import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());
delete process.env.OPENROUTER_API_KEY;

const input = {
  goal: 'strength' as const,
  durationMinutes: 30,
  level: 'intermediate' as const,
  focus: 'full_body' as const,
  intensity: 7,
};

async function main() {
  const { generateWorkout } = await import('../lib/workouts/workout-generator.service');
  const { getVariationGroup } = await import('../lib/workouts/workout-candidate-selector');
  const generated = [];

  for (let index = 0; index < 10; index += 1) {
    generated.push(await generateWorkout(input));
  }

  const exerciseLists = generated.map((workout) =>
    workout.blocks.flatMap((block) => block.exercises.map(({ exercise }) => exercise)),
  );
  const signatures = exerciseLists.map((list) => list.map(({ id }) => id).sort().join(','));
  const frequencies = new Map<string, { name: string; count: number }>();

  for (const exercise of exerciseLists.flat()) {
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
  const duplicateVariationGroups = exerciseLists.map((list) => {
    const groups = list.map((exercise) => getVariationGroup(exercise));
    return groups.filter((group, index) => groups.indexOf(group) !== index);
  });

  console.log(
    JSON.stringify(
      {
        workoutExerciseNames: exerciseLists.map((list) => list.map(({ name }) => name)),
        exactDuplicateCount: signatures.length - new Set(signatures).size,
        averageConsecutiveOverlap: Number(
          (overlaps.reduce((sum, overlap) => sum + overlap, 0) / overlaps.length).toFixed(3),
        ),
        frequencies: [...frequencies.values()].sort((a, b) => b.count - a.count),
        maximumDifficulty: Math.max(...exerciseLists.flat().map(({ difficulty }) => difficulty)),
        duplicateVariationGroups,
      },
      null,
      2,
    ),
  );
}

main().then(() => process.exit(0)).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
