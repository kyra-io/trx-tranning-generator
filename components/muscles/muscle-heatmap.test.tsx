import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MuscleHeatmap, muscleRegions } from "./muscle-heatmap";

test("supports every V1 SVG region", () => {
  assert.deepEqual(Object.keys(muscleRegions).sort(), [
    "abs",
    "biceps",
    "calves",
    "chest",
    "forearms",
    "front-delts",
    "glutes",
    "hamstrings",
    "lats",
    "lower-back",
    "obliques",
    "quads",
    "rear-delts",
    "side-delts",
    "triceps",
    "upper-back",
  ]);
});

test("renders a clear empty state instead of silhouettes", () => {
  const markup = renderToStaticMarkup(<MuscleHeatmap muscles={[]} />);

  assert.match(markup, /No muscle data available/);
  assert.doesNotMatch(markup, /role="img"/);
});

test("renders mapped and unmapped muscles without relying on hover", () => {
  const markup = renderToStaticMarkup(
    <MuscleHeatmap
      muscles={[
        { slug: "lats", name: "Lats", svgRegion: "lats", score: 1 },
        {
          slug: "unsupported",
          name: "Unsupported muscle",
          svgRegion: "unsupported",
          score: 0.1,
        },
      ]}
    />,
  );

  assert.match(markup, /Front muscle activation heatmap/);
  assert.match(markup, /Back muscle activation heatmap/);
  assert.match(markup, /Lats/);
  assert.match(markup, /Unsupported muscle/);
  assert.match(markup, /opacity:1/);
});
