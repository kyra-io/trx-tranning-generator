import assert from 'node:assert/strict';
import test from 'node:test';

import { AiProviderError } from '../ai/llm.service';
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
  equipment: index % 2 === 0 ? 'suspension_trainer' : 'dumbbell',
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
  equipment: ['suspension_trainer', 'dumbbell'] as const,
};

test('filters the pre-LLM catalog by level and selected equipment', async () => {
  const { getEligibleExerciseCatalog } = await servicePromise;
  const eligible = getEligibleExerciseCatalog(
    catalog,
    'intermediate',
    ['suspension_trainer', 'dumbbell'],
  );
  assert.deepEqual(
    eligible.map(({ id }) => id),
    catalog.filter(({ difficulty }) => difficulty <= 2).map(({ id }) => id),
  );

  const dumbbellsOnly = getEligibleExerciseCatalog(
    catalog,
    'intermediate',
    ['dumbbell'],
  );
  assert.ok(dumbbellsOnly.length > 0);
  assert.ok(dumbbellsOnly.every(({ equipment }) => equipment === 'dumbbell'));
});

test('planner prompt receives compact full catalog metadata and five-workout context shape', async () => {
  const { buildWorkoutPrompts, getEligibleExerciseCatalog } = await servicePromise;
  const eligible = getEligibleExerciseCatalog(
    catalog,
    'intermediate',
    ['suspension_trainer', 'dumbbell'],
  );
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
  assert.equal('slug' in payload.eligibleExerciseCatalog[0], false);
  assert.equal('activation' in payload.eligibleExerciseCatalog[0].muscles[0], false);
  assert.equal(payload.eligibleExerciseCatalog[0].equipment, 'suspension_trainer');
  assert.match(prompts.systemPrompt, /Core is not a mandatory phase/);
  assert.match(prompts.systemPrompt, /never add a bench, chair, box, rack/);
  assert.match(prompts.systemPrompt, /difference of only one/);
  assert.doesNotMatch(prompts.systemPrompt, /athlete's body and the floor/);
  assert.match(
    prompts.systemPrompt,
    /never use the same exercise ID more than twice/,
  );
  assert.match(prompts.systemPrompt, /OUTPUT FORMAT — MANDATORY/);
  assert.match(prompts.systemPrompt, /first character must be \{/);
  assert.match(prompts.systemPrompt, /Do not use Markdown/);
  assert.match(prompts.systemPrompt, /silently verify that JSON\.parse\(\)/);
});

test('planner prompt describes bodyweight-only constraints dynamically', async () => {
  const { buildWorkoutPrompts } = await servicePromise;
  const bodyweightExercise = { ...catalog[0], equipment: 'bodyweight' };
  const prompts = buildWorkoutPrompts(
    { ...input, equipment: ['bodyweight'] },
    [bodyweightExercise],
    [],
  );

  assert.match(prompts.systemPrompt, /selected equipment \(bodyweight\)/);
  assert.match(prompts.systemPrompt, /athlete's body and the floor/);
  assert.doesNotMatch(prompts.systemPrompt, /Dumbbell exercises/);
  assert.deepEqual(JSON.parse(prompts.userPrompt).preferences.equipment, [
    'bodyweight',
  ]);
});

test('retries a plan rejected for consecutive duplicate exercises', async () => {
  const { generateAiPlan, getEligibleExerciseCatalog } = await servicePromise;
  const eligible = getEligibleExerciseCatalog(
    catalog,
    'intermediate',
    ['suspension_trainer', 'dumbbell'],
  );
  const completionInputs: Array<{
    systemPrompt: string;
    maxAttempts?: number;
    maxTokens?: number;
  }> = [];
  let callCount = 0;
  const exercise = (exerciseId: string) => ({
    exerciseId,
    sets: 1,
    reps: 10,
    repsPerSide: false,
    durationSeconds: null,
    restSeconds: 30,
    notes: null,
  });

  const result = await generateAiPlan(
    input,
    eligible,
    [],
    async (completionInput) => {
      completionInputs.push(completionInput);
      callCount += 1;

      return {
        model: 'mistral-small-2603',
        data: {
          name: 'Test workout',
          estimatedDurationMinutes: 30,
          warmup: { exercises: [exercise('exercise-0')] },
          blocks: [{
            name: 'Strength',
            type: 'straight_sets',
            rounds: 1,
            exercises: callCount === 1
              ? [exercise('exercise-0'), exercise('exercise-1')]
              : [exercise('exercise-1')],
          }],
        },
      };
    },
  );

  assert.equal(callCount, 2);
  assert.ok(completionInputs.every(({ maxAttempts }) => maxAttempts === 1));
  assert.deepEqual(
    completionInputs.map(({ maxTokens }) => maxTokens),
    [1_500, 2_500],
  );
  assert.match(
    completionInputs[1].systemPrompt,
    /IMPORTANT PLAN RETRY[\s\S]*duplicated consecutively/,
  );
  assert.equal(result.workout.blocks[0].exercises[0].exerciseId, 'exercise-1');
});

test('does not spend the second plan attempt after a provider rate limit', async () => {
  const { generateAiPlan, getEligibleExerciseCatalog } = await servicePromise;
  const eligible = getEligibleExerciseCatalog(
    catalog,
    'intermediate',
    ['suspension_trainer', 'dumbbell'],
  );
  let callCount = 0;

  await assert.rejects(
    generateAiPlan(input, eligible, [], async () => {
      callCount += 1;
      throw new AiProviderError(
        'Mistral request failed with status 429',
        'rate_limit_exceeded',
      );
    }),
    (error) =>
      error instanceof AiProviderError && error.code === 'rate_limit_exceeded',
  );
  assert.equal(callCount, 1);
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
  const strengthExerciseIds = [
    ...strength.warmup.exercises,
    ...strength.blocks.flatMap(({ exercises }) => exercises),
  ].map(({ exerciseId }) => exerciseId);
  const strengthEquipment = strengthExerciseIds.map(
    (exerciseId) => catalog.find(({ id }) => id === exerciseId)?.equipment,
  );
  assert.equal(
    strengthEquipment.filter((equipment) => equipment === 'suspension_trainer').length,
    strengthEquipment.filter((equipment) => equipment === 'dumbbell').length,
  );
  assert.ok(strength.blocks.every(({ type }) => type !== ('core' as never)));
  assert.ok(hypertrophy.blocks.every(({ type }) => type === 'superset'));
  assert.ok(fitness.blocks.every(({ type }) => type === 'circuit'));
  assert.notDeepEqual(
    hypertrophy.blocks.map(({ type }) => type),
    fitness.blocks.map(({ type }) => type),
  );
});
