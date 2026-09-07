import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getProfilePath,
  getProfileWorkoutCreationPath,
  getProfileWorkoutPath,
} from './profile-routes';

test('builds profile-scoped creation and workout destinations', () => {
  assert.equal(getProfilePath('profile-1'), '/profiles/profile-1');
  assert.equal(
    getProfileWorkoutCreationPath('profile-1'),
    '/profiles/profile-1/workouts/new',
  );
  assert.equal(
    getProfileWorkoutPath('profile-1', 'workout-1'),
    '/profiles/profile-1/workouts/workout-1',
  );
});
