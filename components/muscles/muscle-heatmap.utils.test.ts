import assert from "node:assert/strict";
import test from "node:test";

import {
  clampMuscleScore,
  getMuscleIntensity,
  getMuscleIntensityLabel,
  getTopMuscles,
} from "./muscle-heatmap.utils";

test("clamps scores and gives score 1 maximum visual intensity", () => {
  assert.equal(clampMuscleScore(-0.5), 0);
  assert.equal(clampMuscleScore(1.5), 1);
  assert.equal(clampMuscleScore(Number.NaN), 0);
  assert.equal(getMuscleIntensity(1), 1);
});

test("keeps low scores subtle but visible", () => {
  assert.equal(getMuscleIntensity(0), 0.08);
  assert.ok(getMuscleIntensity(0.1) > 0.08);
  assert.ok(getMuscleIntensity(0.1) < getMuscleIntensity(0.5));
});

test("uses stable textual intensity bands", () => {
  assert.equal(getMuscleIntensityLabel(0.2), "Low");
  assert.equal(getMuscleIntensityLabel(0.5), "Medium");
  assert.equal(getMuscleIntensityLabel(0.9), "High");
});

test("selects at most five top muscles without mutating the input", () => {
  const muscles = [
    { slug: "abs", name: "Abs", svgRegion: "abs", score: 0.4 },
    { slug: "lats", name: "Lats", svgRegion: "lats", score: 1 },
    { slug: "calves", name: "Calves", svgRegion: "calves", score: 0.2 },
    { slug: "quads", name: "Quads", svgRegion: "quads", score: 0.8 },
    { slug: "chest", name: "Chest", svgRegion: "chest", score: 0.7 },
    { slug: "unknown", name: "Unknown", svgRegion: null, score: 0.1 },
  ];

  assert.deepEqual(
    getTopMuscles(muscles).map(({ slug }) => slug),
    ["lats", "quads", "chest", "abs", "calves"],
  );
  assert.equal(muscles[0].slug, "abs");
});
