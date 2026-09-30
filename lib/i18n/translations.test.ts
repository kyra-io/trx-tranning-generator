import assert from "node:assert/strict";
import test from "node:test";

import { en } from "./translations/en";
import { ptPt } from "./translations/pt_pt";

function collectKeyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectKeyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

test("pt_pt exposes exactly the same translation keys as en", () => {
  assert.deepEqual(collectKeyPaths(ptPt).sort(), collectKeyPaths(en).sort());
});

test("translation values are non-empty strings", () => {
  for (const path of collectKeyPaths(en)) {
    const value = path
      .split(".")
      .reduce<unknown>((current, key) => (current as Record<string, unknown>)[key], en);

    assert.equal(typeof value, "string", `Expected a string at ${path}`);
    assert.notEqual(value, "", `Expected a non-empty string at ${path}`);
  }
});
