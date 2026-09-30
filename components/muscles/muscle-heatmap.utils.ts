export type MuscleHeatmapItem = {
  slug: string;
  name: string;
  svgRegion: string | null;
  score: number;
};

export function clampMuscleScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(1, Math.max(0, score));
}

export function getMuscleIntensity(score: number) {
  return 0.08 + clampMuscleScore(score) * 0.92;
}

export function getMuscleHeatmapColor(score: number) {
  const normalizedScore = clampMuscleScore(score);

  if (normalizedScore === 0) {
    return "transparent";
  }

  const level = Math.min(5, Math.ceil(normalizedScore * 5));
  return `var(--heatmap-${level})`;
}

export type MuscleIntensityLevel = "high" | "medium" | "low";

export function getMuscleIntensityLevel(score: number): MuscleIntensityLevel {
  const normalizedScore = clampMuscleScore(score);

  if (normalizedScore >= 0.67) {
    return "high";
  }

  if (normalizedScore >= 0.34) {
    return "medium";
  }

  return "low";
}

export function getTopMuscles(muscles: MuscleHeatmapItem[], limit = 5) {
  return [...muscles]
    .sort(
      (left, right) =>
        clampMuscleScore(right.score) - clampMuscleScore(left.score) ||
        left.name.localeCompare(right.name),
    )
    .slice(0, Math.max(0, limit));
}
