import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type GeneratedWorkout,
  generatedWorkoutSchema,
  validateGeneratedWorkoutBusinessRules,
} from './generated-workout';

function createWorkout(exerciseId = 'exercise-1'): GeneratedWorkout {
  return {
    name: 'Full Body Strength',
    estimatedDurationMinutes: 30,
    blocks: [
      {
        name: 'Main',
        type: 'main',
        rounds: 1,
        exercises: [
          {
            exerciseId,
            sets: 3,
            reps: 10,
            repsPerSide: false,
            durationSeconds: null,
            restSeconds: 60,
            notes: null,
          },
        ],
      },
    ],
  };
}

test('accepts a structurally and semantically valid generated workout', () => {
  const workout = generatedWorkoutSchema.parse(createWorkout());

  assert.doesNotThrow(() =>
    validateGeneratedWorkoutBusinessRules(workout, new Set(['exercise-1']), 30),
  );
});

test('rejects unknown and duplicated exercise IDs', () => {
  assert.throws(
    () =>
      validateGeneratedWorkoutBusinessRules(
        createWorkout('invented-id'),
        new Set(['exercise-1']),
        30,
      ),
    /not allowed/,
  );

  const duplicatedWorkout = createWorkout();
  duplicatedWorkout.blocks.push({
    ...duplicatedWorkout.blocks[0],
    exercises: [...duplicatedWorkout.blocks[0].exercises],
  });

  assert.throws(
    () =>
      validateGeneratedWorkoutBusinessRules(
        duplicatedWorkout,
        new Set(['exercise-1']),
        30,
      ),
    /duplicated/,
  );
});

test('rejects duration outside the five-minute tolerance', () => {
  const workout = createWorkout();
  workout.estimatedDurationMinutes = 36;

  assert.throws(
    () =>
      validateGeneratedWorkoutBusinessRules(
        workout,
        new Set(['exercise-1']),
        30,
      ),
    /between 25 and 35/,
  );
});

test('rejects empty blocks, invalid limits, and prescriptions without work', () => {
  const workout = createWorkout();
  workout.blocks[0].exercises[0].sets = 11;
  workout.blocks[0].exercises[0].reps = null;

  assert.equal(generatedWorkoutSchema.safeParse(workout).success, false);
  assert.equal(
    generatedWorkoutSchema.safeParse({
      ...createWorkout(),
      blocks: [{ name: 'Empty', type: 'main', rounds: 1, exercises: [] }],
    }).success,
    false,
  );
});
