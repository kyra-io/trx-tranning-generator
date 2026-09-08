import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGeneratedWorkoutJsonSchema,
  GeneratedWorkoutValidationError,
  type GeneratedWorkout,
  generatedWorkoutJsonSchema,
  generatedWorkoutSchema,
  validateGeneratedWorkoutBusinessRules,
} from './generated-workout';
import { buildWorkoutEquipmentPlan } from './workout-equipment';

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

test('constrains exercise IDs in both dynamic schema locations', () => {
  const schema = buildGeneratedWorkoutJsonSchema([
    'exercise-1',
    'exercise-2',
  ]);
  const schemaText = JSON.stringify(schema);

  assert.equal(
    (schemaText.match(/"enum":\["exercise-1","exercise-2"\]/g) ?? []).length,
    2,
  );
  assert.doesNotMatch(JSON.stringify(generatedWorkoutJsonSchema), /exercise-1/);
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

test('requires every equipment type represented in the candidate pool', () => {
  const equipment = new Map([
    ['exercise-1', 'suspension_trainer'],
    ['exercise-2', 'suspension_trainer'],
    ['exercise-3', 'dumbbell'],
  ]);

  assert.throws(
    () => validateGeneratedWorkoutBusinessRules(
      createWorkout(),
      new Set(equipment.keys()),
      30,
      equipment,
    ),
    /Workout must include equipment: dumbbell/,
  );
});

test('rejects equipment counts that differ by more than two', () => {
  const equipment = new Map([
    ['exercise-1', 'suspension_trainer'],
    ['exercise-2', 'dumbbell'],
    ['exercise-3', 'suspension_trainer'],
    ['exercise-4', 'suspension_trainer'],
    ['exercise-5', 'suspension_trainer'],
  ]);
  const workout = createWorkout();
  workout.blocks[0].exercises.push(exercise('exercise-3'));
  workout.blocks[0].exercises.push(exercise('exercise-4'));
  workout.blocks[0].exercises.push(exercise('exercise-5'));

  assert.throws(
    () => validateGeneratedWorkoutBusinessRules(
      workout,
      new Set(equipment.keys()),
      30,
      equipment,
    ),
    /may differ by at most 2/,
  );
});

test('accepts a balanced distribution across three equipment types', () => {
  const equipment = new Map([
    ['exercise-1', 'suspension_trainer'],
    ['exercise-2', 'dumbbell'],
    ['exercise-3', 'bodyweight'],
  ]);
  const workout = createWorkout();
  workout.blocks[0].exercises.push(exercise('exercise-3'));

  assert.doesNotThrow(() =>
    validateGeneratedWorkoutBusinessRules(
      workout,
      new Set(equipment.keys()),
      30,
      equipment,
    ),
  );
});

test('accepts the exercise-total and equipment-balance tolerances', () => {
  const equipment = new Map([
    ['exercise-1', 'suspension_trainer'],
    ['exercise-2', 'dumbbell'],
    ['exercise-3', 'suspension_trainer'],
    ['exercise-4', 'suspension_trainer'],
  ]);
  const workout = createWorkout();
  workout.blocks[0].exercises.push(
    exercise('exercise-3'),
    exercise('exercise-4'),
  );
  const equipmentPlan = buildWorkoutEquipmentPlan(
    ['suspension_trainer', 'dumbbell'],
    4,
  );

  assert.doesNotThrow(() =>
    validateGeneratedWorkoutBusinessRules(
      workout,
      new Set(equipment.keys()),
      30,
      equipment,
      equipmentPlan,
    ),
  );
});

test('accepts the production cases of nine entries and a five-to-three split', () => {
  const equipment = new Map([
    ['trx-1', 'suspension_trainer'],
    ['trx-2', 'suspension_trainer'],
    ['trx-3', 'suspension_trainer'],
    ['trx-4', 'suspension_trainer'],
    ['trx-5', 'suspension_trainer'],
    ['dumbbell-1', 'dumbbell'],
    ['dumbbell-2', 'dumbbell'],
    ['dumbbell-3', 'dumbbell'],
    ['dumbbell-4', 'dumbbell'],
  ]);
  const equipmentPlan = buildWorkoutEquipmentPlan(
    ['suspension_trainer', 'dumbbell'],
    8,
  );
  const workout = createWorkout();
  workout.warmup.exercises = [exercise('trx-1')];
  workout.blocks[0].exercises = [
    exercise('dumbbell-1'),
    exercise('trx-2'),
    exercise('dumbbell-2'),
    exercise('trx-3'),
    exercise('dumbbell-3'),
    exercise('trx-4'),
    exercise('dumbbell-4'),
    exercise('trx-5'),
  ];

  assert.doesNotThrow(() =>
    validateGeneratedWorkoutBusinessRules(
      workout,
      new Set(equipment.keys()),
      30,
      equipment,
      equipmentPlan,
    ),
  );

  workout.blocks[0].exercises.splice(6, 1);
  assert.doesNotThrow(() =>
    validateGeneratedWorkoutBusinessRules(
      workout,
      new Set(equipment.keys()),
      30,
      equipment,
      equipmentPlan,
    ),
  );
});

test('rejects totals outside tolerance and equipment differences above two', () => {
  const equipment = new Map([
    ['exercise-1', 'suspension_trainer'],
    ['exercise-2', 'dumbbell'],
    ['exercise-3', 'suspension_trainer'],
    ['exercise-4', 'suspension_trainer'],
    ['exercise-5', 'suspension_trainer'],
    ['exercise-6', 'dumbbell'],
  ]);
  const equipmentPlan = buildWorkoutEquipmentPlan(
    ['suspension_trainer', 'dumbbell'],
    4,
  );
  const excessiveTotal = createWorkout();
  excessiveTotal.blocks[0].exercises.push(
    exercise('exercise-3'),
    exercise('exercise-4'),
    exercise('exercise-5'),
    exercise('exercise-6'),
  );

  assert.throws(
    () => validateGeneratedWorkoutBusinessRules(
      excessiveTotal,
      new Set(equipment.keys()),
      30,
      equipment,
      equipmentPlan,
    ),
    (error) =>
      error instanceof GeneratedWorkoutValidationError &&
      error.code === 'INVALID_EXERCISE_TOTAL' &&
      error.details.minimumTotal === 3 &&
      error.details.maximumTotal === 5,
  );

  const unbalanced = createWorkout();
  unbalanced.blocks[0].exercises.push(
    exercise('exercise-3'),
    exercise('exercise-4'),
    exercise('exercise-5'),
  );
  assert.throws(
    () => validateGeneratedWorkoutBusinessRules(
      unbalanced,
      new Set(equipment.keys()),
      30,
      equipment,
      equipmentPlan,
    ),
    (error) =>
      error instanceof GeneratedWorkoutValidationError &&
      error.code === 'INVALID_EQUIPMENT_COUNTS' &&
      error.details.maximumCountDifference === 2,
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
