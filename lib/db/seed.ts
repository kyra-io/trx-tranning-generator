import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function seed() {
  const { db } = await import('./index');
  const { muscles } = await import('./schema');

  const muscleData = [
    { slug: 'chest', name: 'Chest', bodyRegion: 'upper_body' },

    { slug: 'lats', name: 'Lats', bodyRegion: 'upper_body' },
    { slug: 'upper-back', name: 'Upper Back', bodyRegion: 'upper_body' },
    { slug: 'lower-back', name: 'Lower Back', bodyRegion: 'upper_body' },

    { slug: 'front-delts', name: 'Front Deltoids', bodyRegion: 'upper_body' },
    { slug: 'side-delts', name: 'Side Deltoids', bodyRegion: 'upper_body' },
    { slug: 'rear-delts', name: 'Rear Deltoids', bodyRegion: 'upper_body' },

    { slug: 'biceps', name: 'Biceps', bodyRegion: 'arms' },
    { slug: 'triceps', name: 'Triceps', bodyRegion: 'arms' },
    { slug: 'forearms', name: 'Forearms', bodyRegion: 'arms' },

    { slug: 'abs', name: 'Abdominals', bodyRegion: 'core' },
    { slug: 'obliques', name: 'Obliques', bodyRegion: 'core' },

    { slug: 'glutes', name: 'Glutes', bodyRegion: 'lower_body' },
    { slug: 'quads', name: 'Quadriceps', bodyRegion: 'lower_body' },
    { slug: 'hamstrings', name: 'Hamstrings', bodyRegion: 'lower_body' },
    { slug: 'calves', name: 'Calves', bodyRegion: 'lower_body' },
  ];

  await db
    .insert(muscles)
    .values(muscleData)
    .onConflictDoNothing();

  console.log(`Seeded ${muscleData.length} muscles.`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
