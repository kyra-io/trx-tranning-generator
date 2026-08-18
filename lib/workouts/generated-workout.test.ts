import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type GeneratedWorkout,
  generatedWorkoutSchema,
  validateGeneratedWorkoutBusinessRules,
} from './generated-workout';

function exercise(exerciseId: string) {
  return {
    exerciseId,
    sets: 3,
    reps: 10,
    repsPerSide: false,
    durationSeconds: null,
    restSeconds: 60,
    notes: null,
  };
}

function createWorkout(exerciseId = 'exercise-2'): GeneratedWorkout {
  return {
    name: 'Full Body Strength',
    estimatedDurationMinutes: 30,
    warmup: { exercises: [{ ...exercise('exercise-1'), sets: 1 }] },
    blocks: [{
      name: 'Strength Pair',
      type: 'superset',
      rounds: 3,
      exercises: [{ ...exercise(exerciseId), sets: null }],
    }],
  };
}

test('accepts dynamic blocks and a mandatory warm-up', () => {
  const workout = generatedWorkoutSchema.parse(createWorkout());
  assert.doesNotThrow(() =>
    validateGeneratedWorkoutBusinessRules(
      workout,
      new Set(['exercise-1', 'exercise-2']),
      30,
    ),
  );
});

test('rejects unknown exercise IDs but permits a purposeful non-consecutive repeat', () => {
  assert.throws(
    () => validateGeneratedWorkoutBusinessRules(
      createWorkout('invented-id'),
      new Set(['exercise-1', 'exercise-2']),
      30,
    ),
    /not allowed/,
  );

  const repeated = createWorkout();
  repeated.blocks.push({
    name: 'Return to Strength',
    type: 'straight_sets',
    rounds: 1,
    exercises: [exercise('exercise-1')],
  });
  assert.doesNotThrow(() =>
    validateGeneratedWorkoutBusinessRules(
      repeated,
      new Set(['exercise-1', 'exercise-2']),
      30,
    ),
  );
});

test('rejects consecutive and excessive duplicate exercises', () => {
  const consecutive = createWorkout('exercise-1');
  assert.throws(
    () => validateGeneratedWorkoutBusinessRules(
      consecutive,
      new Set(['exercise-1']),
      30,
    ),
    /duplicated consecutively/,
  );

  const excessive = createWorkout();
  excessive.blocks[0].exercises.push(exercise('exercise-1'));
  excessive.blocks[0].exercises.push(exercise('exercise-2'));
  excessive.blocks[0].exercises.push(exercise('exercise-1'));
  assert.throws(
    () => validateGeneratedWorkoutBusinessRules(
      excessive,
      new Set(['exercise-1', 'exercise-2']),
      30,
    ),
    /more than twice/,
  );
});

test('uses a centralized ten-percent duration tolerance with a three-minute floor', () => {
  const workout = createWorkout();
  workout.estimatedDurationMinutes = 34;
  assert.throws(
    () => validateGeneratedWorkoutBusinessRules(
      workout,
      new Set(['exercise-1', 'exercise-2']),
      30,
    ),
    /between 27 and 33/,
  );
});

test('rejects invalid block types, limits, empty warm-ups, and missing work', () => {
  const workout = createWorkout();
  workout.blocks[0].rounds = 7;
  workout.blocks[0].exercises[0].reps = null;
  assert.equal(generatedWorkoutSchema.safeParse(workout).success, false);
  assert.equal(generatedWorkoutSchema.safeParse({
    ...createWorkout(),
    warmup: { exercises: [] },
  }).success, false);
  assert.equal(generatedWorkoutSchema.safeParse({
    ...createWorkout(),
    blocks: [{
      name: 'Legacy Main', type: 'main', rounds: 1,
      exercises: [exercise('exercise-2')],
    }],
  }).success, false);
});
