import type {
  GenerateWorkoutInput,
  WorkoutFocus,
  WorkoutGoal,
  WorkoutLevel,
} from '@/lib/workouts/workout-generator.service';
import type {
  CompleteWorkoutInput,
  WorkoutDifficulty,
} from '@/lib/workouts/workout.service';
import type { ValidationDetail } from '@/lib/profiles/profile.service';
import {
  WORKOUT_EQUIPMENT,
  type WorkoutEquipment,
} from '@/lib/workouts/workout-equipment';

const goals = new Set<WorkoutGoal>([
  'strength',
  'hypertrophy',
  'general_fitness',
]);
const levels = new Set<WorkoutLevel>([
  'beginner',
  'intermediate',
  'advanced',
]);
const focuses = new Set<WorkoutFocus>([
  'full_body',
  'upper_body',
  'lower_body',
  'core',
]);
const difficulties = new Set<WorkoutDifficulty>([
  'too_easy',
  'good',
  'too_hard',
]);
const equipmentValues = new Set<WorkoutEquipment>(WORKOUT_EQUIPMENT);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateGenerateWorkoutInput(body: unknown):
  | { success: true; input: GenerateWorkoutInput }
  | { success: false; details: ValidationDetail[] } {
  if (!isObject(body)) {
    return {
      success: false,
      details: [{ path: [], message: 'Expected a JSON object' }],
    };
  }

  const details: ValidationDetail[] = [];

  if (typeof body.goal !== 'string' || !goals.has(body.goal as WorkoutGoal)) {
    details.push({
      path: ['goal'],
      message: 'Expected strength, hypertrophy, or general_fitness',
    });
  }
  if (
    typeof body.durationMinutes !== 'number' ||
    !Number.isInteger(body.durationMinutes) ||
    body.durationMinutes < 15 ||
    body.durationMinutes > 60
  ) {
    details.push({
      path: ['durationMinutes'],
      message: 'Expected an integer between 15 and 60',
    });
  }
  if (
    !Array.isArray(body.equipment) ||
    body.equipment.length === 0 ||
    body.equipment.some(
      (equipment) =>
        typeof equipment !== 'string' ||
        !equipmentValues.has(equipment as WorkoutEquipment),
    ) ||
    new Set(body.equipment).size !== body.equipment.length
  ) {
    details.push({
      path: ['equipment'],
      message: 'Expected a non-empty array of unique suspension_trainer, dumbbell, or bodyweight values',
    });
  }
  if (typeof body.level !== 'string' || !levels.has(body.level as WorkoutLevel)) {
    details.push({
      path: ['level'],
      message: 'Expected beginner, intermediate, or advanced',
    });
  }
  if (typeof body.focus !== 'string' || !focuses.has(body.focus as WorkoutFocus)) {
    details.push({
      path: ['focus'],
      message: 'Expected full_body, upper_body, lower_body, or core',
    });
  }
  if (
    typeof body.intensity !== 'number' ||
    !Number.isInteger(body.intensity) ||
    body.intensity < 1 ||
    body.intensity > 10
  ) {
    details.push({
      path: ['intensity'],
      message: 'Expected an integer between 1 and 10',
    });
  }

  return details.length > 0
    ? { success: false, details }
    : { success: true, input: body as GenerateWorkoutInput };
}

export function validateCompleteWorkoutInput(body: unknown):
  | { success: true; input: CompleteWorkoutInput }
  | { success: false; details: ValidationDetail[] } {
  if (!isObject(body)) {
    return {
      success: false,
      details: [{ path: [], message: 'Expected a JSON object' }],
    };
  }

  const details: ValidationDetail[] = [];

  if (
    typeof body.difficulty !== 'string' ||
    !difficulties.has(body.difficulty as WorkoutDifficulty)
  ) {
    details.push({
      path: ['difficulty'],
      message: 'Expected too_easy, good, or too_hard',
    });
  }
  if (
    body.notes !== undefined &&
    body.notes !== null &&
    (typeof body.notes !== 'string' || body.notes.length > 1000)
  ) {
    details.push({
      path: ['notes'],
      message: 'Expected null or a string with at most 1000 characters',
    });
  }

  return details.length > 0
    ? { success: false, details }
    : { success: true, input: body as CompleteWorkoutInput };
}
