import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWorkoutEquipmentPlan } from './workout-equipment';

test('builds stable quotas for one, two, and three equipment types', () => {
  assert.deepEqual(buildWorkoutEquipmentPlan(['bodyweight'], 6), {
    targetExerciseEntries: 6,
    exerciseEntryTolerance: 1,
    countIncludesWarmup: true,
    maximumEquipmentCountDifference: 2,
    balancedTargetCounts: { bodyweight: 6 },
  });
  assert.deepEqual(
    buildWorkoutEquipmentPlan(['dumbbell', 'suspension_trainer'], 6),
    {
      targetExerciseEntries: 6,
      exerciseEntryTolerance: 1,
      countIncludesWarmup: true,
      maximumEquipmentCountDifference: 2,
      balancedTargetCounts: { suspension_trainer: 3, dumbbell: 3 },
    },
  );
  assert.deepEqual(
    buildWorkoutEquipmentPlan(
      ['bodyweight', 'suspension_trainer', 'dumbbell'],
      8,
    ),
    {
      targetExerciseEntries: 8,
      exerciseEntryTolerance: 1,
      countIncludesWarmup: true,
      maximumEquipmentCountDifference: 2,
      balancedTargetCounts: {
        suspension_trainer: 3,
        dumbbell: 3,
        bodyweight: 2,
      },
    },
  );
});

test('rejects empty equipment and totals that cannot include every type', () => {
  assert.throws(() => buildWorkoutEquipmentPlan([], 4), /At least one/);
  assert.throws(
    () => buildWorkoutEquipmentPlan(['suspension_trainer', 'dumbbell'], 1),
    /cover every selected equipment type/,
  );
});
