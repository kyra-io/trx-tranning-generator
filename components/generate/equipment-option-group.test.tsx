import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  EquipmentOptionGroup,
  getEquipmentSelectionError,
} from './equipment-option-group';

const options = [
  { label: 'TRX', value: 'suspension_trainer' },
  { label: 'Dumbbells', value: 'dumbbell' },
  { label: 'No equipment', value: 'bodyweight' },
] as const;

test('renders three unchecked native equipment checkboxes', () => {
  const markup = renderToStaticMarkup(
    <EquipmentOptionGroup
      options={options}
      value={[]}
      onChange={() => undefined}
      errorId="equipment-error"
    />,
  );

  assert.match(markup, /<fieldset[^>]*aria-describedby="equipment-error"/);
  assert.match(markup, /<legend[^>]*>Equipment<\/legend>/);
  assert.equal((markup.match(/type="checkbox"/g) ?? []).length, 3);
  assert.equal((markup.match(/checked=""/g) ?? []).length, 0);
  assert.match(markup, />No equipment<\/span>/);
});

test('renders each selected equipment option independently', () => {
  const markup = renderToStaticMarkup(
    <EquipmentOptionGroup
      options={options}
      value={['suspension_trainer', 'bodyweight']}
      onChange={() => undefined}
    />,
  );

  assert.equal((markup.match(/checked=""/g) ?? []).length, 2);
  assert.match(markup, /checked="" value="suspension_trainer"/);
  assert.match(markup, /checked="" value="bodyweight"/);
});

test('requires at least one equipment selection', () => {
  assert.equal(
    getEquipmentSelectionError([]),
    'Select at least one equipment option.',
  );
  assert.equal(getEquipmentSelectionError(['bodyweight']), null);
});
