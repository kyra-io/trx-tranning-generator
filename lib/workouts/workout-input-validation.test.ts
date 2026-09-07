import assert from 'node:assert/strict';
import test from 'node:test';

import { validateGenerateWorkoutInput } from './workout-input-validation';

const validInput = {
  goal: 'strength',
  durationMinutes: 30,
  level: 'intermediate',
  focus: 'full_body',
  intensity: 6,
  equipment: ['suspension_trainer'],
};

test('accepts each equipment type and valid combinations', () => {
  for (const equipment of [
    ['suspension_trainer'],
    ['dumbbell'],
    ['bodyweight'],
    ['suspension_trainer', 'dumbbell', 'bodyweight'],
  ]) {
    assert.equal(
      validateGenerateWorkoutInput({ ...validInput, equipment }).success,
      true,
    );
  }
});

test('rejects missing, empty, duplicate, malformed, and unknown equipment', () => {
  for (const equipment of [
    undefined,
    [],
    ['bodyweight', 'bodyweight'],
    ['barbell'],
    ['bodyweight', 1],
    'bodyweight',
  ]) {
    const result = validateGenerateWorkoutInput({ ...validInput, equipment });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.details.some(({ path }) => path[0] === 'equipment'));
    }
  }
});
