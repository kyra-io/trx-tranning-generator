import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

type ExerciseImageMapping = {
  targetSlug: string;
  source: 'free-exercise-db' | 'trx-training';
  sourceExerciseId?: string;
  sourceUrl: string;
  imageUrl: string;
  confidence: 'high' | 'medium';
  reason?: string;
};

const FREE_EXERCISE_DB_REPOSITORY =
  'https://github.com/yuhonas/free-exercise-db';
const FREE_EXERCISE_DB_IMAGES =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

function freeExerciseDbMapping(
  targetSlug: string,
  sourceExerciseId: string,
  imageIndex = 0,
): ExerciseImageMapping {
  return {
    targetSlug,
    source: 'free-exercise-db',
    sourceExerciseId,
    sourceUrl: `${FREE_EXERCISE_DB_REPOSITORY}/tree/main/exercises/${sourceExerciseId}`,
    imageUrl: `${FREE_EXERCISE_DB_IMAGES}/${sourceExerciseId}/${imageIndex}.jpg`,
    confidence: 'high',
  };
}

const imageMappings: ExerciseImageMapping[] = [
  {
    targetSlug: 'trx-atomic-push-up',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-atomic-push-up',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/ff435602cf206ad7ecbcaa7789e8ee0ff02340ac.jpg?v=1644298507',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-biceps-curl',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-high-biceps-curl',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/image_iphone.jpg?v=1645070250',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-chest-fly',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-chest-fly',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/TRX_Chest_Fly_Start0336_5fa4b49e-e775-45ac-af39-8a496cc9658e.jpg?v=1759923518',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-chest-press',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-chest-press',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/man-doing-trx-chest-press_97833e7d-6d7b-4346-a17c-5f73acbb04cb.jpg?v=1759924002',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-hamstring-curl',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-hamstring-curl',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/cec1ea76b2573eac9979138c81399b4de5df6b0d_82e899ca-329a-4365-907c-df19906709b2.jpg?v=1759936129',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-mountain-climbers',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/moves-of-the-week-trx-mountain-climbers',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/Screen_20Shot_202020-03-09_20at_2001.31.01.png?v=1759949816',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-one-arm-row',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-weekly-exercise-trx-single-arm-row',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/c47d1e67bc49f7fbb1c849b670f749abaa92cf31_ef0b99a8-5682-4e24-83cf-6f1e620c4a83.jpg?v=1759945219',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-plank',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-weekly-exercise-trx-plank',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/0d5c18975d6d2a312c760b6b57dd5113ca4e6b60_5e0f427c-2892-434a-ad2f-0d1999f005c0.jpg?v=1759953190',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-power-pull',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-power-pull',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/78238d62cd5be64043d7de0150ce3a9a63ef28d7_5c2fca51-2ffd-44e1-9358-3e3cfa960cb8.jpg?v=1759947819',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-push-up',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-push-up',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/trx-pushup_2dd04cb0-5fbe-4bc7-8285-1a10ca6a4230.jpg?v=1759919290',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-row',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/pull-day-workout',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/male-trainer-doing-trx-rows_d77f1521-b7ad-4394-9422-2dad953e465f.jpg?v=1775750748',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-side-plank',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-side-plank',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/42664872ae9a27cdb57365f68f93d3133ced76a2_c693d7ea-7517-4a3b-a37b-213a7675d6ec.jpg?v=1759948653',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-single-leg-squat',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-single-leg-squat',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/34b2cbd41fea9ba1e19f29c2a5653cd2dc3b9e54_0d5795f0-b601-4614-b2a1-6c8c52352be0.jpg?v=1759936456',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-squat',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-squat',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/trx-squat_1ba810da-5a95-41b2-9faa-f4bdd0af2faa.jpg?v=1773967325',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-t-delt-fly',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-t-deltoid-fly',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/20d3665a873af21dadbe0aa61fcf007606d1fc4f.jpg?v=1644298577',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-torso-rotation',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-torso-rotation',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/5766f3f2591790b586fe4852597fd0e69d45669b_2e6866a2-08cc-4033-959b-b651e7b7f655.jpg?v=1759954138',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-triceps-press',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-triceps-press',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/df4eb09cc7a849d488a5971050b4f60b82cef78e_b57a6c7c-36b9-4d3a-9299-c24f729bf7a9.jpg?v=1759923800',
    confidence: 'high',
  },
  {
    targetSlug: 'trx-y-raise',
    source: 'trx-training',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-y-deltoid-fly',
    imageUrl: 'https://www.trxtraining.com/cdn/shop/articles/f31baa4e75878c8f55440aa7850f9c5d0f541672.jpg?v=1644298590',
    confidence: 'high',
  },
  freeExerciseDbMapping('trx-low-row', 'Suspended_Row', 0),
  freeExerciseDbMapping('trx-mid-row', 'Suspended_Row', 1),
  freeExerciseDbMapping('trx-split-squat', 'Suspended_Split_Squat', 0),
  freeExerciseDbMapping('trx-jump-squat', 'Freehand_Jump_Squat', 0),
  freeExerciseDbMapping('trx-push-up-side-plank', 'Push_Up_to_Side_Plank', 0),
  freeExerciseDbMapping('trx-close-grip-push-up', 'Push-Ups_-_Close_Triceps_Position', 0),
  freeExerciseDbMapping('trx-standing-rollout', 'Suspended_Fallout', 0),
];

const rejectedMappings: ExerciseImageMapping[] = [
  { targetSlug: 'trx-body-saw', source: 'free-exercise-db', sourceExerciseId: 'Plank', sourceUrl: FREE_EXERCISE_DB_REPOSITORY, imageUrl: '', confidence: 'medium', reason: 'Static plank does not show the body-saw movement.' },
  { targetSlug: 'trx-clock-push-up', source: 'free-exercise-db', sourceExerciseId: 'Clock_Push-Up', sourceUrl: FREE_EXERCISE_DB_REPOSITORY, imageUrl: '', confidence: 'medium', reason: 'Body-only clock push-up uses a materially different setup.' },
  { targetSlug: 'trx-face-pull', source: 'free-exercise-db', sourceExerciseId: 'Back_Flyes_-_With_Bands', sourceUrl: FREE_EXERCISE_DB_REPOSITORY, imageUrl: '', confidence: 'medium', reason: 'Band fly does not show the face-pull elbow and handle position.' },
  { targetSlug: 'trx-high-row', source: 'free-exercise-db', sourceExerciseId: 'Suspended_Row', sourceUrl: FREE_EXERCISE_DB_REPOSITORY, imageUrl: '', confidence: 'medium', reason: 'Generic suspended row does not clearly show a high-row angle.' },
  { targetSlug: 'trx-lateral-lunge', source: 'free-exercise-db', sourceExerciseId: 'Side_Leg_Raises', sourceUrl: FREE_EXERCISE_DB_REPOSITORY, imageUrl: '', confidence: 'medium', reason: 'No direct suspension-assisted lateral-lunge image.' },
  { targetSlug: 'trx-pike', source: 'trx-training', sourceUrl: 'https://www.trxtraining.com/blogs/news/these-3-trx-moves-are-exclusive-to-the-straps', imageUrl: '', confidence: 'medium', reason: 'Official page provides video but no exercise-specific still URL.' },
  { targetSlug: 'trx-reverse-lunge', source: 'free-exercise-db', sourceExerciseId: 'Suspended_Split_Squat', sourceUrl: FREE_EXERCISE_DB_REPOSITORY, imageUrl: '', confidence: 'medium', reason: 'Suspended rear-foot split squat is not the assisted reverse lunge.' },
  { targetSlug: 'trx-single-leg-hamstring-curl', source: 'free-exercise-db', sourceExerciseId: 'Platform_Hamstring_Slides', sourceUrl: FREE_EXERCISE_DB_REPOSITORY, imageUrl: '', confidence: 'medium', reason: 'Floor slider omits the suspension setup.' },
  { targetSlug: 'trx-squat-row', source: 'trx-training', sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-moves-of-the-week-the-basics', imageUrl: '', confidence: 'medium', reason: 'Article media is video or a generic article image.' },
  { targetSlug: 'trx-wide-hip-hinge', source: 'trx-training', sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-exercises', imageUrl: '', confidence: 'medium', reason: 'No exercise-specific public still was found.' },
];

function imageKey(exerciseId: string, url: string) {
  return `${exerciseId}\u0000${url}`;
}

async function seedExerciseImages() {
  const { db } = await import('./index');
  const { exerciseImages, exercises } = await import('./schema');

  const result = await db.transaction(async (tx) => {
    const availableExercises = await tx.select({ id: exercises.id, slug: exercises.slug }).from(exercises);
    const exerciseBySlug = new Map(availableExercises.map((exercise) => [exercise.slug, exercise]));
    const existingImages = await tx.select({ exerciseId: exerciseImages.exerciseId, url: exerciseImages.url }).from(exerciseImages);
    const beforeExerciseIds = new Set(existingImages.map((image) => image.exerciseId));
    const existingKeys = new Set(existingImages.map((image) => imageKey(image.exerciseId, image.url)));
    const imagesToInsert = [];
    const insertedSlugs = new Set<string>();
    const configuredSlugsNotFound = new Set<string>();

    for (const mapping of imageMappings.filter((item) => item.confidence === 'high')) {
      const exercise = exerciseBySlug.get(mapping.targetSlug);
      if (!exercise) {
        configuredSlugsNotFound.add(mapping.targetSlug);
        continue;
      }

      const key = imageKey(exercise.id, mapping.imageUrl);
      if (existingKeys.has(key)) continue;

      existingKeys.add(key);
      insertedSlugs.add(mapping.targetSlug);
      imagesToInsert.push({ exerciseId: exercise.id, type: 'primary', url: mapping.imageUrl, sortOrder: 0 });
    }

    if (imagesToInsert.length > 0) await tx.insert(exerciseImages).values(imagesToInsert);

    const afterRows = await tx.select({ exerciseId: exerciseImages.exerciseId }).from(exerciseImages);
    const afterExerciseIds = new Set(afterRows.map((image) => image.exerciseId));
    const missing = availableExercises.map((exercise) => exercise.slug).filter((slug) => {
      const exercise = exerciseBySlug.get(slug);
      return exercise ? !afterExerciseIds.has(exercise.id) : true;
    }).sort();

    return {
      total: availableExercises.length,
      withImageBefore: beforeExerciseIds.size,
      imagesInserted: imagesToInsert.length,
      withImageAfter: afterExerciseIds.size,
      insertedSlugs: [...insertedSlugs].sort(),
      missing,
      configuredSlugsNotFound: [...configuredSlugsNotFound].sort(),
    };
  });

  console.log(`Exercises total: ${result.total}`);
  console.log(`With image before seed: ${result.withImageBefore}`);
  console.log(`Images inserted: ${result.imagesInserted}`);
  console.log(`Coverage after seed: ${result.withImageAfter}/${result.total}`);
  console.log(`Slugs with images added: ${result.insertedSlugs.join(', ') || 'none'}`);
  console.log(`Configured slugs not found: ${result.configuredSlugsNotFound.join(', ') || 'none'}`);
  console.log(`Missing: ${result.missing.join(', ') || 'none'}`);
  console.log('\nRejected medium-confidence mappings:');
  for (const mapping of rejectedMappings) console.log(`${mapping.targetSlug}: ${mapping.reason}`);
}

seedExerciseImages().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
