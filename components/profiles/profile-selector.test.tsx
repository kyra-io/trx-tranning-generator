import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ProfileSelectorView } from './profile-selector';

test('renders a useful profile empty state', () => {
  const markup = renderToStaticMarkup(
    <ProfileSelectorView profiles={[]} onOpen={() => undefined} />,
  );

  assert.match(markup, /No profiles yet/);
  assert.match(markup, /href="\/profiles\/new"/);
  assert.doesNotMatch(markup, /<select/);
});

test('renders multiple profiles without selecting one automatically', () => {
  const markup = renderToStaticMarkup(
    <ProfileSelectorView
      profiles={[
        { id: 'profile-1', name: 'Pedro' },
        { id: 'profile-2', name: 'Guest' },
      ]}
      onOpen={() => undefined}
    />,
  );

  assert.match(markup, /<label[^>]*for="profile"[^>]*>Profile<\/label>/);
  assert.match(markup, /Pedro/);
  assert.match(markup, /Guest/);
  assert.match(markup, /<button[^>]*disabled=""[^>]*>Open profile<\/button>/);
});
