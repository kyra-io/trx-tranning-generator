import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getHomePath,
  getNewProfilePath,
  getProfilePath,
  getProfileWorkoutCreationPath,
  getProfileWorkoutPath,
} from './profile-routes';

test('builds language-prefixed profile-scoped destinations', () => {
  assert.equal(getHomePath('pt_pt'), '/pt_pt');
  assert.equal(getNewProfilePath('pt_pt'), '/pt_pt/profiles/new');
  assert.equal(getProfilePath('pt_pt', 'profile-1'), '/pt_pt/profiles/profile-1');
  assert.equal(
    getProfileWorkoutCreationPath('pt_pt', 'profile-1'),
    '/pt_pt/profiles/profile-1/workouts/new',
  );
  assert.equal(
    getProfileWorkoutPath('pt_pt', 'profile-1', 'workout-1'),
    '/pt_pt/profiles/profile-1/workouts/workout-1',
  );
});
