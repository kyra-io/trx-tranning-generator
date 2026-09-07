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
