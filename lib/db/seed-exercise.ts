import { loadEnvConfig } from '@next/env';
import { eq, inArray } from 'drizzle-orm';

loadEnvConfig(process.cwd());

async function seedExercise() {
  const { db } = await import('./index');
  const {
    exercises,
    muscles,
    exerciseMuscles,
  } = await import('./schema');

  const [exercise] = await db
    .insert(exercises)
    .values({
      slug: 'trx-row',
      name: 'TRX Row',
      family: 'row',
      primaryPattern: 'pull',
      difficulty: 1,
      unilateral: false,
      sourceName: 'TRX Training',
    })
    .onConflictDoUpdate({
      target: exercises.slug,
      set: {
        name: 'TRX Row',
        family: 'row',
        primaryPattern: 'pull',
        difficulty: 1,
        unilateral: false,
      },
    })
    .returning();

  const muscleSlugs = [
    'lats',
    'upper-back',
    'biceps',
    'rear-delts',
    'abs',
  ];

  const relatedMuscles = await db
    .select()
    .from(muscles)
    .where(inArray(muscles.slug, muscleSlugs));

  const muscleBySlug = new Map(
    relatedMuscles.map((muscle) => [muscle.slug, muscle]),
  );

  const activationData = [
    { slug: 'lats', role: 'primary', activation: '1.00' },
    { slug: 'upper-back', role: 'primary', activation: '0.90' },
    { slug: 'biceps', role: 'secondary', activation: '0.70' },
    { slug: 'rear-delts', role: 'secondary', activation: '0.50' },
    { slug: 'abs', role: 'stabilizer', activation: '0.30' },
  ];

  await db
    .delete(exerciseMuscles)
    .where(eq(exerciseMuscles.exerciseId, exercise.id));

  await db.insert(exerciseMuscles).values(
    activationData.map(({ slug, role, activation }) => {
      const muscle = muscleBySlug.get(slug);

      if (!muscle) {
        throw new Error(`Muscle not found: ${slug}`);
      }

      return {
        exerciseId: exercise.id,
        muscleId: muscle.id,
        role,
        activation,
      };
    }),
  );

  console.log('Seeded TRX Row');
}

seedExercise()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
