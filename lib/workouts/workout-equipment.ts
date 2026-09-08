export const WORKOUT_EQUIPMENT = [
  'suspension_trainer',
  'dumbbell',
  'bodyweight',
] as const;

export type WorkoutEquipment = (typeof WORKOUT_EQUIPMENT)[number];

export const workoutEquipmentLabels: Record<WorkoutEquipment, string> = {
  suspension_trainer: 'TRX suspension trainer',
  dumbbell: 'dumbbells',
  bodyweight: 'bodyweight',
};

export const WORKOUT_EXERCISE_ENTRY_TOLERANCE = 1;
export const WORKOUT_EQUIPMENT_COUNT_TOLERANCE = 2;

export type WorkoutEquipmentPlan = {
  targetExerciseEntries: number;
  exerciseEntryTolerance: typeof WORKOUT_EXERCISE_ENTRY_TOLERANCE;
  countIncludesWarmup: true;
  maximumEquipmentCountDifference: typeof WORKOUT_EQUIPMENT_COUNT_TOLERANCE;
  balancedTargetCounts: Partial<Record<WorkoutEquipment, number>>;
};

export function buildWorkoutEquipmentPlan(
  selectedEquipment: readonly WorkoutEquipment[],
  totalExerciseEntries: number,
): WorkoutEquipmentPlan {
  const selected = new Set(selectedEquipment);
  const equipment = WORKOUT_EQUIPMENT.filter((value) => selected.has(value));

  if (equipment.length === 0) {
    throw new Error('At least one equipment type is required');
  }
  if (
    !Number.isInteger(totalExerciseEntries) ||
    totalExerciseEntries < equipment.length
  ) {
    throw new Error('Exercise total must cover every selected equipment type');
  }

  const minimumPerEquipment = Math.floor(
    totalExerciseEntries / equipment.length,
  );
  const remainder = totalExerciseEntries % equipment.length;
  const balancedTargetCounts = Object.fromEntries(
    equipment.map((value, index) => [
      value,
      minimumPerEquipment + (index < remainder ? 1 : 0),
    ]),
  ) as Partial<Record<WorkoutEquipment, number>>;

  return {
    targetExerciseEntries: totalExerciseEntries,
    exerciseEntryTolerance: WORKOUT_EXERCISE_ENTRY_TOLERANCE,
    countIncludesWarmup: true,
    maximumEquipmentCountDifference: WORKOUT_EQUIPMENT_COUNT_TOLERANCE,
    balancedTargetCounts,
  };
}
