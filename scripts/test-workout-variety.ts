import { loadEnvConfig } from '@next/env';

import type { GenerateWorkoutInput } from '../lib/workouts/workout-generator.service';

loadEnvConfig(process.cwd());

const repeatedInput = {
  goal: 'strength' as const,
  durationMinutes: 30,
  level: 'intermediate' as const,
  focus: 'full_body' as const,
  intensity: 7,
};

const goalScenarios = [
  repeatedInput,
  { ...repeatedInput, goal: 'hypertrophy' as const, focus: 'upper_body' as const },
  { ...repeatedInput, goal: 'general_fitness' as const },
  { ...repeatedInput, focus: 'lower_body' as const },
  { ...repeatedInput, focus: 'core' as const },
];

type Workout = {
  id: string;
  name: string;
  estimatedDurationMinutes: number | null;
  blocks: Array<{
    name: string;
    type: string;
    rounds: number;
    exercises: Array<{ exercise: { id: string } }>;
  }>;
};

function summarize(workout: Workout, previous?: Workout) {
  const exerciseIds = workout.blocks.flatMap((block) =>
    block.exercises.map(({ exercise }) => exercise.id),
  );
  const previousIds = new Set(previous?.blocks.flatMap((block) =>
    block.exercises.map(({ exercise }) => exercise.id),
  ) ?? []);
  const overlap = exerciseIds.filter((id) => previousIds.has(id)).length;

  return {
    title: workout.name,
    blocks: workout.blocks.map((block) =>
      `${block.name} [${block.type}]${block.rounds > 1 ? ` x${block.rounds}` : ''}`,
    ).join(' → '),
    exerciseCount: exerciseIds.length,
    overlapWithPrevious: previous ? overlap : null,
    estimatedDuration: workout.estimatedDurationMinutes,
  };
}

async function main() {
  const baseUrl = process.env.GENERATOR_BASE_URL;
  const generateWorkout: (input: GenerateWorkoutInput) => Promise<Workout> = baseUrl
    ? async (input): Promise<Workout> => {
        const response = await fetch(`${baseUrl}/api/workouts/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          throw new Error(`Generation API returned ${response.status}: ${await response.text()}`);
        }
        return response.json() as Promise<Workout>;
      }
    : (await import('../lib/workouts/workout-generator.service')).generateWorkout;
  const repeated: Workout[] = [];

  for (let index = 0; index < 10; index += 1) {
    repeated.push(await generateWorkout(repeatedInput));
  }

  console.log('\n10 repeated strength/full-body workouts');
  console.table(repeated.map((workout, index) => ({
    workout: index + 1,
    ...summarize(workout, repeated[index - 1]),
  })));

  const scenarios: Workout[] = [];
  for (const scenario of goalScenarios) {
    scenarios.push(await generateWorkout(scenario));
  }
  console.log('\nGoal and focus scenarios');
  console.table(scenarios.map((workout, index) => ({
    goal: goalScenarios[index].goal,
    focus: goalScenarios[index].focus,
    ...summarize(workout),
  })));

  if (!baseUrl) {
    const configuredApiKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      const fallback = await generateWorkout(repeatedInput);
      console.log('\nFallback without OpenRouter');
      console.table([{ persistedId: fallback.id, ...summarize(fallback) }]);
    } finally {
      if (configuredApiKey) process.env.OPENROUTER_API_KEY = configuredApiKey;
    }
  }
}

main().then(() => process.exit(0)).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
