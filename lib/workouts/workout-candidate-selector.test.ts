import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type CandidateExercise,
  getVariationGroup,
  selectWorkoutCandidates,
} from './workout-candidate-selector';

const patterns = ['pull', 'push', 'squat', 'lunge', 'hinge', 'plank', 'rotate'];
const catalog: CandidateExercise[] = Array.from({ length: 21 }, (_, index) => ({
  id: `exercise-${index}`,
  slug: index < 4 ? ['trx-row', 'trx-low-row', 'trx-mid-row', 'trx-high-row'][index] : `trx-move-${index}`,
  name: `Exercise ${index}`,
  family: index < 4 ? 'row' : patterns[index % patterns.length],
  primaryPattern: patterns[index % patterns.length],
  force: ['pull', 'push', 'static', 'mixed'][index % 4],
  mechanic: index % 4 === 0 ? 'isolation' : 'compound',
  category: index % 5 === 0 ? 'conditioning' : 'strength',
  variationGroup: index < 4 ? 'row' : `move-${index}`,
  difficulty: (index % 3) + 1,
  unilateral: false,
  muscles: [{ slug: `muscle-${index % 6}`, bodyRegion: null, role: 'primary', activation: 1 }],
}));

const input = {
  goal: 'strength' as const,
  durationMinutes: 30,
  level: 'intermediate' as const,
  focus: 'full_body' as const,
  intensity: 7,
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('uses persisted variation metadata without collapsing by family', () => {
  assert.equal(getVariationGroup({ id: 'low-row', variationGroup: 'row' }), 'row');
  assert.notEqual(
    getVariationGroup({ id: 'chest-press', variationGroup: 'chest-press' }),
    getVariationGroup({ id: 'push-up', variationGroup: 'push-up' }),
  );
  assert.notEqual(
    getVariationGroup({ id: 'legacy-a', variationGroup: null }),
    getVariationGroup({ id: 'legacy-b', variationGroup: null }),
  );
});

test('enforces difficulty and distinct variation groups when alternatives exist', () => {
  const selected = selectWorkoutCandidates({ input, catalog, recentWorkouts: [], random: seededRandom(4) });
  const groups = selected.map(({ variationGroup }) => variationGroup);

  assert.equal(selected.length, 12);
  assert.ok(selected.every(({ difficulty }) => difficulty <= 2));
  assert.equal(new Set(groups).size, groups.length);
});

test('weighted selection varies and strongly discourages the previous workout', () => {
  const previous = [{ workoutId: 'previous', exerciseIds: ['exercise-0'] }];
  const pools = Array.from({ length: 30 }, (_, seed) =>
    selectWorkoutCandidates({ input, catalog, recentWorkouts: previous, random: seededRandom((seed + 1) * 9973) }),
  );
  const signatures = new Set(pools.map((pool) => pool.map(({ id }) => id).sort().join(',')));

  assert.ok(signatures.size > 1);
  assert.ok(pools.filter((pool) => pool.some(({ id }) => id === 'exercise-0')).length < pools.length);
});

test('goal metadata changes probabilities without becoming a hard filter', () => {
  const runs = (goal: typeof input.goal | 'hypertrophy' | 'general_fitness') =>
    Array.from({ length: 100 }, (_, seed) =>
      selectWorkoutCandidates({
        input: { ...input, goal },
        catalog,
        recentWorkouts: [],
        random: seededRandom(seed + 100),
      }),
    ).flat();
  const strength = runs('strength');
  const hypertrophy = runs('hypertrophy');
  const fitness = runs('general_fitness');

  assert.ok(
    hypertrophy.filter(({ mechanic }) => mechanic === 'isolation').length >=
      strength.filter(({ mechanic }) => mechanic === 'isolation').length,
  );
  assert.ok(
    fitness.filter(({ category }) => category === 'conditioning').length >=
      strength.filter(({ category }) => category === 'conditioning').length,
  );
  assert.ok(fitness.some(({ category }) => category === 'strength'));
});
