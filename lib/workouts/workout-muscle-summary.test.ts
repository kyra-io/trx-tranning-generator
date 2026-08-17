import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateWorkoutMuscleSummary } from './workout-muscle-summary';

const trxRowMuscles = [
  { id: 'lats', slug: 'lats', name: 'Lats', activation: '1.00' },
  {
    id: 'upper-back',
    slug: 'upper-back',
    name: 'Upper Back',
    activation: '0.90',
  },
  { id: 'biceps', slug: 'biceps', name: 'Biceps', activation: '0.70' },
  {
    id: 'rear-delts',
    slug: 'rear-delts',
    name: 'Rear Deltoids',
    activation: '0.50',
  },
  { id: 'abs', slug: 'abs', name: 'Abdominals', activation: '0.30' },
].map((muscle) => ({ ...muscle, bodyRegion: 'upper_body', svgRegion: null }));

test('normalizes TRX Row activations and sorts them descending', () => {
  const summary = calculateWorkoutMuscleSummary([
    {
      rounds: 3,
      exercises: [
        {
          sets: 3,
          reps: 10,
          durationSeconds: null,
          exercise: { muscles: trxRowMuscles },
        },
      ],
    },
  ]);

  assert.deepEqual(
    summary.map(({ slug, score }) => ({ slug, score })),
    [
      { slug: 'lats', score: 1 },
      { slug: 'upper-back', score: 0.9 },
      { slug: 'biceps', score: 0.7 },
      { slug: 'rear-delts', score: 0.5 },
      { slug: 'abs', score: 0.3 },
    ],
  );
});

test('accumulates muscles and uses rounds only when sets are missing', () => {
  const summary = calculateWorkoutMuscleSummary([
    {
      rounds: 3,
      exercises: [
        {
          sets: null,
          reps: 10,
          durationSeconds: null,
          exercise: { muscles: [trxRowMuscles[0]] },
        },
        {
          sets: 2,
          reps: 10,
          durationSeconds: null,
          exercise: { muscles: [trxRowMuscles[2]] },
        },
      ],
    },
    {
      rounds: 1,
      exercises: [
        {
          sets: 1,
          reps: 10,
          durationSeconds: null,
          exercise: { muscles: [trxRowMuscles[2]] },
        },
      ],
    },
  ]);

  assert.deepEqual(
    summary.map(({ slug, score }) => ({ slug, score })),
    [
      { slug: 'lats', score: 1 },
      { slug: 'biceps', score: 0.7 },
    ],
  );
});

test('supports duration and ignores invalid activations without NaN', () => {
  const summary = calculateWorkoutMuscleSummary([
    {
      rounds: 1,
      exercises: [
        {
          sets: null,
          reps: null,
          durationSeconds: 30,
          exercise: {
            muscles: [
              trxRowMuscles[0],
              { ...trxRowMuscles[2], activation: 'invalid' },
            ],
          },
        },
      ],
    },
  ]);

  assert.deepEqual(summary.map(({ slug, score }) => ({ slug, score })), [
    { slug: 'lats', score: 1 },
  ]);
  assert.ok(summary.every(({ score }) => Number.isFinite(score)));
});

test('returns an empty summary when blocks or muscle mappings are absent', () => {
  assert.deepEqual(calculateWorkoutMuscleSummary([]), []);
  assert.deepEqual(
    calculateWorkoutMuscleSummary([
      {
        rounds: 1,
        exercises: [
          {
            sets: null,
            reps: null,
            durationSeconds: null,
            exercise: { muscles: [] },
          },
        ],
      },
    ]),
    [],
  );
});
