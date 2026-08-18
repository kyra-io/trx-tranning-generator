import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  exerciseImages,
  exerciseMuscles,
  exercises,
  muscles,
} from "@/lib/db/schema";

export type ExerciseDetail = Pick<
  typeof exercises.$inferSelect,
  | "id"
  | "slug"
  | "name"
  | "family"
  | "primaryPattern"
  | "force"
  | "mechanic"
  | "category"
  | "variationGroup"
  | "difficulty"
  | "unilateral"
  | "instructions"
  | "notes"
  | "sourceName"
  | "sourceUrl"
> & {
  images: Array<
    Pick<
      typeof exerciseImages.$inferSelect,
      "id" | "type" | "url" | "sortOrder"
    >
  >;
  muscles: Array<
    Pick<
      typeof muscles.$inferSelect,
      "id" | "slug" | "name" | "bodyRegion" | "svgRegion"
    > & {
      role: string;
      activation: number;
    }
  >;
};

const exerciseFields = {
  id: exercises.id,
  slug: exercises.slug,
  name: exercises.name,
  family: exercises.family,
  primaryPattern: exercises.primaryPattern,
  force: exercises.force,
  mechanic: exercises.mechanic,
  category: exercises.category,
  variationGroup: exercises.variationGroup,
  difficulty: exercises.difficulty,
  unilateral: exercises.unilateral,
  instructions: exercises.instructions,
  notes: exercises.notes,
  sourceName: exercises.sourceName,
  sourceUrl: exercises.sourceUrl,
};

export async function getExerciseById(
  id: string,
): Promise<ExerciseDetail | null> {
  const [exercise] = await db
    .select(exerciseFields)
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);

  if (!exercise) {
    return null;
  }

  const [images, muscleRows] = await Promise.all([
    db
      .select({
        id: exerciseImages.id,
        type: exerciseImages.type,
        url: exerciseImages.url,
        sortOrder: exerciseImages.sortOrder,
      })
      .from(exerciseImages)
      .where(eq(exerciseImages.exerciseId, id))
      .orderBy(asc(exerciseImages.sortOrder), asc(exerciseImages.id)),
    db
      .select({
        id: muscles.id,
        slug: muscles.slug,
        name: muscles.name,
        bodyRegion: muscles.bodyRegion,
        svgRegion: muscles.svgRegion,
        role: exerciseMuscles.role,
        activation: exerciseMuscles.activation,
      })
      .from(exerciseMuscles)
      .innerJoin(muscles, eq(exerciseMuscles.muscleId, muscles.id))
      .where(eq(exerciseMuscles.exerciseId, id))
      .orderBy(desc(exerciseMuscles.activation), asc(muscles.name)),
  ]);

  return {
    ...exercise,
    images,
    muscles: muscleRows.map((muscle) => ({
      ...muscle,
      activation: Number(muscle.activation),
    })),
  };
}
