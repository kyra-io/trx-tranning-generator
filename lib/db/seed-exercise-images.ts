import { loadEnvConfig } from '@next/env';
import { eq } from 'drizzle-orm';

loadEnvConfig(process.cwd());

const imageData = [
  {
    exerciseSlug: 'trx-row',
    type: 'primary',
    url: 'https://www.trxtraining.com/cdn/shop/articles/male-trainer-doing-trx-rows_d77f1521-b7ad-4394-9422-2dad953e465f.jpg?v=1775750748',
    sortOrder: 0,
    sourceUrl: 'https://www.trxtraining.com/blogs/news/pull-day-workout',
  },
  {
    exerciseSlug: 'trx-chest-press',
    type: 'primary',
    url: 'https://www.trxtraining.com/cdn/shop/articles/man-doing-trx-chest-press_97833e7d-6d7b-4346-a17c-5f73acbb04cb.jpg?v=1759924002',
    sortOrder: 0,
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-chest-press',
  },
  {
    exerciseSlug: 'trx-squat',
    type: 'primary',
    url: 'https://www.trxtraining.com/cdn/shop/articles/trx-squat_1ba810da-5a95-41b2-9faa-f4bdd0af2faa.jpg?v=1773967325',
    sortOrder: 0,
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-squat',
  },
  {
    exerciseSlug: 'trx-triceps-press',
    type: 'primary',
    url: 'https://www.trxtraining.com/cdn/shop/articles/df4eb09cc7a849d488a5971050b4f60b82cef78e_b57a6c7c-36b9-4d3a-9299-c24f729bf7a9.jpg?v=1759923800',
    sortOrder: 0,
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-triceps-press',
  },
  {
    exerciseSlug: 'trx-hamstring-curl',
    type: 'primary',
    url: 'https://www.trxtraining.com/cdn/shop/articles/cec1ea76b2573eac9979138c81399b4de5df6b0d_82e899ca-329a-4365-907c-df19906709b2.jpg?v=1759936129',
    sortOrder: 0,
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-hamstring-curl',
  },
  {
    exerciseSlug: 'trx-plank',
    type: 'primary',
    url: 'https://www.trxtraining.com/cdn/shop/articles/0d5c18975d6d2a312c760b6b57dd5113ca4e6b60_5e0f427c-2892-434a-ad2f-0d1999f005c0.jpg?v=1759953190',
    sortOrder: 0,
    sourceUrl:
      'https://www.trxtraining.com/blogs/news/trx-weekly-exercise-trx-plank',
  },
  {
    exerciseSlug: 'trx-mountain-climbers',
    type: 'primary',
    url: 'https://play.vidyard.com/anYgs8UeEuGXwR7MZ3dsUx.jpg',
    sortOrder: 0,
    sourceUrl:
      'https://www.trxtraining.com/blogs/news/moves-of-the-week-trx-mountain-climbers',
  },
  {
    exerciseSlug: 'trx-power-pull',
    type: 'primary',
    url: 'https://www.trxtraining.com/cdn/shop/articles/78238d62cd5be64043d7de0150ce3a9a63ef28d7_5c2fca51-2ffd-44e1-9358-3e3cfa960cb8.jpg?v=1759947819',
    sortOrder: 0,
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-power-pull',
  },
] as const;

function imageKey(exerciseId: string, type: string, url: string) {
  return `${exerciseId}\u0000${type}\u0000${url}`;
}

async function seedExerciseImages() {
  const { db } = await import('./index');
  const { exerciseImages, exercises } = await import('./schema');

  const result = await db.transaction(async (tx) => {
    const availableExercises = await tx
      .select({
        id: exercises.id,
        slug: exercises.slug,
        sourceUrl: exercises.sourceUrl,
      })
      .from(exercises);
    const exerciseBySlug = new Map(
      availableExercises.map((exercise) => [exercise.slug, exercise]),
    );
    const existingImages = await tx
      .select({
        exerciseId: exerciseImages.exerciseId,
        type: exerciseImages.type,
        url: exerciseImages.url,
      })
      .from(exerciseImages);
    const existingImageKeys = new Set(
      existingImages.map((image) =>
        imageKey(image.exerciseId, image.type, image.url),
      ),
    );
    const imagesToInsert = [];
    const insertedSlugs = new Set<string>();
    const verifiedSlugs = new Set<string>();
    const missingSlugs = new Set<string>();
    let skippedDuplicates = 0;

    for (const image of imageData) {
      const exercise = exerciseBySlug.get(image.exerciseSlug);

      if (!exercise) {
        missingSlugs.add(image.exerciseSlug);
        continue;
      }

      verifiedSlugs.add(image.exerciseSlug);

      if (!exercise.sourceUrl?.trim()) {
        await tx
          .update(exercises)
          .set({ sourceUrl: image.sourceUrl })
          .where(eq(exercises.id, exercise.id));
      }

      const key = imageKey(exercise.id, image.type, image.url);

      if (existingImageKeys.has(key)) {
        skippedDuplicates += 1;
        continue;
      }

      existingImageKeys.add(key);
      insertedSlugs.add(image.exerciseSlug);
      imagesToInsert.push({
        exerciseId: exercise.id,
        type: image.type,
        url: image.url,
        sortOrder: image.sortOrder,
      });
    }

    if (imagesToInsert.length > 0) {
      await tx.insert(exerciseImages).values(imagesToInsert);
    }

    return {
      foundExercises: availableExercises.length,
      exercisesWithVerifiedImages: verifiedSlugs.size,
      imagesInserted: imagesToInsert.length,
      skippedDuplicates,
      exercisesWithoutVerifiedImage:
        availableExercises.length - verifiedSlugs.size,
      insertedSlugs: [...insertedSlugs].sort(),
      missingSlugs: [...missingSlugs].sort(),
    };
  });

  console.log(`Found exercises: ${result.foundExercises}`);
  console.log(
    `Exercises with verified images: ${result.exercisesWithVerifiedImages}`,
  );
  console.log(`Images inserted: ${result.imagesInserted}`);
  console.log(
    `Images skipped as duplicates: ${result.skippedDuplicates}`,
  );
  console.log(
    `Exercises without verified image: ${result.exercisesWithoutVerifiedImage}`,
  );
  console.log(
    `Slugs with images added: ${result.insertedSlugs.join(', ') || 'none'}`,
  );
  console.log(
    `Configured slugs not found: ${result.missingSlugs.join(', ') || 'none'}`,
  );
}

seedExerciseImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
