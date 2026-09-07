import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

const servicePromise = import('./profile.service');

test('normalizes and validates profile names', async () => {
  const { PROFILE_NAME_MAX_LENGTH, validateProfileInput } = await servicePromise;

  assert.deepEqual(validateProfileInput({ name: '  Pedro Silva  ' }), {
    success: true,
    name: 'Pedro Silva',
  });
  assert.equal(validateProfileInput(null).success, false);
  assert.equal(validateProfileInput({ name: 42 }).success, false);
  assert.equal(validateProfileInput({ name: '   ' }).success, false);
  assert.equal(
    validateProfileInput({ name: 'x'.repeat(PROFILE_NAME_MAX_LENGTH + 1) }).success,
    false,
  );
});

test('recognizes direct and wrapped PostgreSQL uniqueness conflicts', async () => {
  const { isProfileNameConflict } = await servicePromise;

  assert.equal(isProfileNameConflict({ code: '23505' }), true);
  assert.equal(isProfileNameConflict({ cause: { code: '23505' } }), true);
  assert.equal(isProfileNameConflict({ code: '23503' }), false);
});
