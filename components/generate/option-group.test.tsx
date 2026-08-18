import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { OptionGroup } from "./option-group";

const options = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
] as const;

test("renders a native radio group with a single checked option", () => {
  const markup = renderToStaticMarkup(
    <OptionGroup
      name="workout-level"
      label="Level"
      options={options}
      value="intermediate"
      onChange={() => undefined}
      columns={3}
    />,
  );

  assert.match(markup, /<fieldset>/);
  assert.match(markup, /<legend[^>]*>Level<\/legend>/);
  assert.equal((markup.match(/type="radio"/g) ?? []).length, 3);
  assert.equal((markup.match(/name="workout-level"/g) ?? []).length, 3);
  assert.equal((markup.match(/checked=""/g) ?? []).length, 1);
  assert.match(
    markup,
    /id="workout-level-intermediate"[^>]*checked=""/,
  );
  assert.match(markup, /for="workout-level-intermediate"/);
});

test("uses the group name to create unique option ids", () => {
  const markup = renderToStaticMarkup(
    <OptionGroup
      name="workout-goal"
      label="Goal"
      options={[{ label: "Strength", value: "strength" }]}
      value="strength"
      onChange={() => undefined}
    />,
  );

  assert.match(markup, /id="workout-goal-strength"/);
  assert.match(markup, /for="workout-goal-strength"/);
});
