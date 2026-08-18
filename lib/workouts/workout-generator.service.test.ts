import assert from 'node:assert/strict';
import test from 'node:test';

import type { CandidateExercise } from './workout-candidate-selector';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

const servicePromise = import('./workout-generator.service');

const catalog: CandidateExercise[] = Array.from({ length: 8 }, (_, index) => ({
  id: `exercise-${index}`,
  slug: `trx-exercise-${index}`,
  name: `Exercise ${index}`,
  family: index % 2 ? 'row' : 'squat',
  primaryPattern: index % 2 ? 'pull' : 'squat',
  force: index % 2 ? 'pull' : 'mixed',
  mechanic: index % 3 ? 'compound' : 'isolation',
  category: index % 4 ? 'strength' : 'conditioning',
  variationGroup: `variation-${index}`,
  difficulty: (index % 3) + 1,
  unilateral: index % 2 === 0,
  muscles: [{
    slug: `muscle-${index}`,
    bodyRegion: 'upper_body',
    role: 'primary',
    activation: 1,
  }],
}));

const input = {
  goal: 'strength' as const,
  durationMinutes: 30,
  level: 'intermediate' as const,
  focus: 'full_body' as const,
  intensity: 7,
};

test('level filtering is the only pre-LLM catalog selection', async () => {
  const { getEligibleExerciseCatalog } = await servicePromise;
  const eligible = getEligibleExerciseCatalog(catalog, 'intermediate');
  assert.deepEqual(
    eligible.map(({ id }) => id),
    catalog.filter(({ difficulty }) => difficulty <= 2).map(({ id }) => id),
  );
});

test('planner prompt receives compact full catalog metadata and five-workout context shape', async () => {
  const { buildWorkoutPrompts, getEligibleExerciseCatalog } = await servicePromise;
  const eligible = getEligibleExerciseCatalog(catalog, 'intermediate');
  const recent = [{
    workoutId: 'workout-1',
    goal: 'strength',
    focus: 'full_body',
    exerciseIds: ['exercise-1'],
    exerciseSlugs: ['trx-exercise-1'],
    blockTypes: ['superset'],
  }];
  const prompts = buildWorkoutPrompts(input, eligible, recent);
  const payload = JSON.parse(prompts.userPrompt);

  assert.equal(payload.eligibleExerciseCatalog.length, eligible.length);
  assert.deepEqual(payload.recentWorkouts, [{
    goal: 'strength',
    focus: 'full_body',
    exercises: ['trx-exercise-1'],
    blockTypes: ['superset'],
  }]);
  assert.equal('family' in payload.eligibleExerciseCatalog[0], false);
  assert.equal('activation' in payload.eligibleExerciseCatalog[0].muscles[0], false);
  assert.match(prompts.systemPrompt, /Core is not a mandatory phase/);
});

test('deterministic fallback uses dynamic block types and no mandatory core block', async () => {
  const { generateDeterministicPlan } = await servicePromise;
  const strength = generateDeterministicPlan(input, catalog);
  const hypertrophy = generateDeterministicPlan(
    { ...input, goal: 'hypertrophy', focus: 'upper_body' },
    catalog,
  );
  const fitness = generateDeterministicPlan(
    { ...input, goal: 'general_fitness' },
    catalog,
  );

  assert.ok(strength.warmup.exercises.length > 0);
  assert.ok(strength.blocks.every(({ type }) => type !== ('core' as never)));
  assert.ok(hypertrophy.blocks.every(({ type }) => type === 'superset'));
  assert.ok(fitness.blocks.every(({ type }) => type === 'circuit'));
  assert.notDeepEqual(
    hypertrophy.blocks.map(({ type }) => type),
    fitness.blocks.map(({ type }) => type),
  );
});
