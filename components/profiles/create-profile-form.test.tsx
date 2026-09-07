import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { CreateProfileFormView } from './create-profile-form';

test('renders an accessible profile-name field and pending state', () => {
  const markup = renderToStaticMarkup(
    <CreateProfileFormView
      name="Pedro"
      isCreating
      error={null}
      onNameChange={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(markup, /<label[^>]*for="profile-name"[^>]*>Profile name<\/label>/);
  assert.match(markup, /autoComplete="name"/);
  assert.match(markup, /value="Pedro"/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /<button[^>]*disabled=""[^>]*>Creating\.\.\.<\/button>/);
});

test('associates a server error with the preserved input', () => {
  const markup = renderToStaticMarkup(
    <CreateProfileFormView
      name="Existing name"
      isCreating={false}
      error="A profile with this name already exists."
      onNameChange={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(markup, /value="Existing name"/);
  assert.match(markup, /aria-describedby="profile-error"/);
  assert.match(markup, /role="alert"/);
  assert.match(markup, /already exists/);
});
