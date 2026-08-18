import {
  clampMuscleScore,
  getMuscleHeatmapColor,
  getMuscleIntensityLabel,
  getTopMuscles,
  type MuscleHeatmapItem,
} from "./muscle-heatmap.utils";

type BodyView = "front" | "back";

type MuscleRegion = {
  front?: readonly string[];
  back?: readonly string[];
};

export type MuscleHeatmapProps = {
  muscles: MuscleHeatmapItem[];
  contextLabel?: string;
};

export const muscleRegions: Record<string, MuscleRegion> = {
  chest: {
    front: [
      "M48 68 Q57 60 68 66 L68 91 Q55 92 47 83 Z",
      "M72 66 Q83 60 92 68 L93 83 Q85 92 72 91 Z",
    ],
  },
  "front-delts": {
    front: [
      "M45 61 Q35 62 32 72 Q35 82 43 83 L49 68 Z",
      "M95 61 Q105 62 108 72 Q105 82 97 83 L91 68 Z",
    ],
  },
  "side-delts": {
    front: [
      "M42 61 Q31 63 29 75 L35 82 Q40 76 45 67 Z",
      "M98 61 Q109 63 111 75 L105 82 Q100 76 95 67 Z",
    ],
  },
  biceps: {
    front: [
      "M31 79 Q38 77 43 83 L38 111 Q33 117 27 111 Z",
      "M109 79 Q102 77 97 83 L102 111 Q107 117 113 111 Z",
    ],
  },
  forearms: {
    front: [
      "M27 113 Q33 117 38 113 L31 149 Q26 158 21 151 Z",
      "M113 113 Q107 117 102 113 L109 149 Q114 158 119 151 Z",
    ],
    back: [
      "M27 113 Q33 117 38 113 L31 149 Q26 158 21 151 Z",
      "M113 113 Q107 117 102 113 L109 149 Q114 158 119 151 Z",
    ],
  },
  abs: {
    front: [
      "M59 94 Q70 90 81 94 L80 137 Q70 143 60 137 Z",
    ],
  },
  obliques: {
    front: [
      "M48 91 Q54 94 59 95 L60 137 L52 132 Q47 112 48 91 Z",
      "M92 91 Q86 94 81 95 L80 137 L88 132 Q93 112 92 91 Z",
    ],
  },
  quads: {
    front: [
      "M52 145 Q62 141 68 149 L64 207 Q56 216 46 207 Z",
      "M88 145 Q78 141 72 149 L76 207 Q84 216 94 207 Z",
    ],
  },
  lats: {
    back: [
      "M47 78 Q55 82 67 85 L62 125 Q53 122 48 111 Z",
      "M93 78 Q85 82 73 85 L78 125 Q87 122 92 111 Z",
    ],
  },
  "upper-back": {
    back: [
      "M48 64 Q58 58 68 64 L68 90 Q57 88 48 78 Z",
      "M72 64 Q82 58 92 64 L92 78 Q83 88 72 90 Z",
    ],
  },
  "lower-back": {
    back: [
      "M59 106 Q70 112 81 106 L83 139 Q70 145 57 139 Z",
    ],
  },
  "rear-delts": {
    back: [
      "M45 61 Q35 62 32 72 Q35 82 43 83 L49 68 Z",
      "M95 61 Q105 62 108 72 Q105 82 97 83 L91 68 Z",
    ],
  },
  triceps: {
    back: [
      "M31 79 Q38 77 43 83 L38 111 Q33 117 27 111 Z",
      "M109 79 Q102 77 97 83 L102 111 Q107 117 113 111 Z",
    ],
  },
  glutes: {
    back: [
      "M51 145 Q59 137 68 143 L68 174 Q57 177 49 168 Z",
      "M89 145 Q81 137 72 143 L72 174 Q83 177 91 168 Z",
    ],
  },
  hamstrings: {
    back: [
      "M49 174 Q58 178 67 174 L64 216 Q55 222 47 214 Z",
      "M91 174 Q82 178 73 174 L76 216 Q85 222 93 214 Z",
    ],
  },
  calves: {
    back: [
      "M47 218 Q56 215 63 221 L58 268 Q51 274 45 264 Z",
      "M93 218 Q84 215 77 221 L82 268 Q89 274 95 264 Z",
    ],
  },
};

function BodySilhouette() {
  return (
    <g className="fill-zinc-100 stroke-zinc-300" strokeWidth="1.5">
      <circle cx="70" cy="25" r="16" />
      <path d="M62 40 Q70 45 78 40 L79 53 L61 53 Z" />
      <path d="M60 50 Q45 53 35 62 L43 88 L48 121 L51 145 Q70 153 89 145 L92 121 L97 88 L105 62 Q95 53 80 50 Z" />
      <path d="M36 62 Q27 65 24 78 L14 132 Q13 145 21 158 L29 153 L38 112 L43 84 Z" />
      <path d="M104 62 Q113 65 116 78 L126 132 Q127 145 119 158 L111 153 L102 112 L97 84 Z" />
      <path d="M51 143 Q46 170 43 202 L40 236 L43 276 L57 276 L62 238 L68 177 L68 149 Z" />
      <path d="M89 143 Q94 170 97 202 L100 236 L97 276 L83 276 L78 238 L72 177 L72 149 Z" />
    </g>
  );
}

function BodyFigure({
  view,
  scoresByRegion,
  contextLabel,
}: {
  view: BodyView;
  scoresByRegion: Map<string, number>;
  contextLabel: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-2 text-center text-[0.6875rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
        {view}
      </p>
      <svg
        role="img"
        aria-label={`${view === "front" ? "Front" : "Back"} muscle activation heatmap for ${contextLabel}`}
        viewBox="0 0 140 286"
        className="mx-auto block h-auto w-full max-w-36"
      >
        <BodySilhouette />
        {Object.entries(muscleRegions).flatMap(([region, paths]) => {
          const score = scoresByRegion.get(region);
          const viewPaths = paths[view];

          if (score === undefined || !viewPaths) {
            return [];
          }

          return viewPaths.map((path, index) => (
            <path
              key={`${region}-${index}`}
              d={path}
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1"
              style={{ color: getMuscleHeatmapColor(score) }}
            />
          ));
        })}
      </svg>
    </div>
  );
}

export function MuscleHeatmap({
  muscles,
  contextLabel = "this workout",
}: MuscleHeatmapProps) {
  if (muscles.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-center">
        <p className="text-sm text-zinc-500">No muscle data available</p>
      </div>
    );
  }

  const scoresByRegion = new Map<string, number>();

  for (const muscle of muscles) {
    if (!muscle.svgRegion || !muscleRegions[muscle.svgRegion]) {
      continue;
    }

    const score = clampMuscleScore(muscle.score);
    scoresByRegion.set(
      muscle.svgRegion,
      Math.max(score, scoresByRegion.get(muscle.svgRegion) ?? 0),
    );
  }

  const topMuscles = getTopMuscles(muscles);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex w-full items-start justify-center gap-2 px-1 sm:gap-5">
        <BodyFigure
          view="front"
          scoresByRegion={scoresByRegion}
          contextLabel={contextLabel}
        />
        <BodyFigure
          view="back"
          scoresByRegion={scoresByRegion}
          contextLabel={contextLabel}
        />
      </div>

      <ol className="mt-4 divide-y divide-zinc-100 border-t border-zinc-100 pt-1">
        {topMuscles.map((muscle) => {
          const score = clampMuscleScore(muscle.score);
          const percentage = Math.round(score * 100);

          return (
            <li
              key={`${muscle.slug}-${muscle.svgRegion ?? "unmapped"}`}
              className="py-2.5"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-zinc-700">
                  {muscle.name}
                </span>
                <span className="shrink-0 text-xs font-medium text-zinc-500">
                  {getMuscleIntensityLabel(score)}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${muscle.name} activation`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: getMuscleHeatmapColor(score),
                  }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
