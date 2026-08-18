import { loadEnvConfig } from '@next/env';
import { eq, inArray } from 'drizzle-orm';

loadEnvConfig(process.cwd());

type MuscleRole = 'primary' | 'secondary' | 'stabilizer';

type MuscleMapping = {
  slug: string;
  role: MuscleRole;
  activation: number;
};

type ExerciseSeed = {
  slug: string;
  name: string;
  family: 'row' | 'press' | 'curl' | 'squat' | 'lunge' | 'hinge' | 'plank' | 'rollout' | 'rotation';
  primaryPattern: 'pull' | 'push' | 'squat' | 'lunge' | 'hinge' | 'plank' | 'rotate';
  difficulty: 1 | 2 | 3;
  unilateral: boolean;
  instructions: string;
  sourceName?: string;
  sourceUrl: string | null;
  muscles: MuscleMapping[];
};

type ExerciseMetadata = {
  force: 'push' | 'pull' | 'static' | 'mixed';
  mechanic: 'compound' | 'isolation';
  category: 'strength' | 'core' | 'conditioning' | 'mobility';
  variationGroup: string;
};

const FREE_EXERCISE_DB_URL = 'https://github.com/yuhonas/free-exercise-db';

const m = (
  slug: string,
  role: MuscleRole,
  activation: number,
): MuscleMapping => ({ slug, role, activation });

const catalog: ExerciseSeed[] = [
  {
    slug: 'trx-row', name: 'TRX Row', family: 'row', primaryPattern: 'pull', difficulty: 1, unilateral: false,
    instructions: 'Stand facing the anchor with straight arms and a braced body. Pull your chest toward the handles while keeping your elbows close. Lower yourself under control until your arms are straight again.',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/pull-day-workout',
    muscles: [m('lats', 'primary', 1), m('upper-back', 'primary', 0.9), m('biceps', 'secondary', 0.7), m('rear-delts', 'secondary', 0.5), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-low-row', name: 'TRX Low Row', family: 'row', primaryPattern: 'pull', difficulty: 1, unilateral: false,
    instructions: 'Face the anchor and lean back with the handles near hip height. Draw your elbows behind you and lift your chest toward the straps. Extend your arms slowly to return to the starting lean.',
    sourceUrl: null,
    muscles: [m('lats', 'primary', 1), m('upper-back', 'primary', 0.8), m('biceps', 'secondary', 0.7), m('rear-delts', 'secondary', 0.4), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-mid-row', name: 'TRX Mid Row', family: 'row', primaryPattern: 'pull', difficulty: 2, unilateral: false,
    instructions: 'Face the anchor with your body straight and arms extended at mid-chest height. Squeeze your shoulder blades and pull your ribs toward the handles. Maintain tension as you straighten your arms to return.',
    sourceUrl: null,
    muscles: [m('upper-back', 'primary', 1), m('lats', 'primary', 0.9), m('biceps', 'secondary', 0.7), m('rear-delts', 'secondary', 0.6), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-high-row', name: 'TRX High Row', family: 'row', primaryPattern: 'pull', difficulty: 2, unilateral: false,
    instructions: 'Face the anchor and lean back with straight arms held around shoulder height. Pull with high elbows until the handles approach your upper chest. Control the descent and fully extend your arms.',
    sourceUrl: null,
    muscles: [m('upper-back', 'primary', 1), m('rear-delts', 'primary', 0.9), m('lats', 'secondary', 0.6), m('biceps', 'secondary', 0.6), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-power-pull', name: 'TRX Power Pull', family: 'row', primaryPattern: 'pull', difficulty: 3, unilateral: true,
    instructions: 'Face the anchor holding one handle and rotate the free arm toward the floor. Pull strongly with the working arm while rotating your free arm up toward the anchor. Reverse the rotation under control to return to the extended position.',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-power-pull',
    muscles: [m('lats', 'primary', 1), m('upper-back', 'primary', 0.9), m('obliques', 'secondary', 0.7), m('biceps', 'secondary', 0.6), m('rear-delts', 'secondary', 0.5), m('abs', 'stabilizer', 0.4)],
  },
  {
    slug: 'trx-one-arm-row', name: 'TRX One-Arm Row', family: 'row', primaryPattern: 'pull', difficulty: 2, unilateral: true,
    instructions: 'Face the anchor and hold one handle with your working arm straight. Keep your hips square as you pull your ribs toward the handle. Extend your arm slowly to return to the starting lean, then repeat on the other side.',
    sourceName: 'free-exercise-db reference',
    sourceUrl: FREE_EXERCISE_DB_URL,
    muscles: [m('lats', 'primary', 1), m('upper-back', 'primary', 0.8), m('biceps', 'secondary', 0.7), m('rear-delts', 'secondary', 0.5), m('obliques', 'stabilizer', 0.5), m('abs', 'stabilizer', 0.4)],
  },
  {
    slug: 'trx-face-pull', name: 'TRX Face Pull', family: 'row', primaryPattern: 'pull', difficulty: 2, unilateral: false,
    instructions: 'Face the anchor with arms extended and palms facing down. Pull the handles toward either side of your face while keeping your elbows high. Slowly straighten your arms without losing body alignment.',
    sourceUrl: null,
    muscles: [m('rear-delts', 'primary', 1), m('upper-back', 'primary', 0.9), m('side-delts', 'secondary', 0.5), m('biceps', 'secondary', 0.5), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-y-raise', name: 'TRX Y Raise', family: 'row', primaryPattern: 'pull', difficulty: 2, unilateral: false,
    instructions: 'Face the anchor in a controlled backward lean with arms extended. Raise both arms overhead into a Y shape as your body moves upright. Lower your arms slowly and return to the starting lean.',
    sourceUrl: null,
    muscles: [m('side-delts', 'primary', 0.9), m('upper-back', 'primary', 0.8), m('rear-delts', 'secondary', 0.7), m('lower-back', 'stabilizer', 0.3), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-t-delt-fly', name: 'TRX T Delt Fly', family: 'row', primaryPattern: 'pull', difficulty: 2, unilateral: false,
    instructions: 'Face the anchor and lean back with hands together and arms straight. Open your arms into a T while bringing your body upright. Bring the handles together slowly to return to the lean.',
    sourceUrl: null,
    muscles: [m('rear-delts', 'primary', 1), m('upper-back', 'primary', 0.9), m('side-delts', 'secondary', 0.6), m('lower-back', 'stabilizer', 0.3), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-biceps-curl', name: 'TRX Biceps Curl', family: 'curl', primaryPattern: 'pull', difficulty: 1, unilateral: false,
    instructions: 'Face the anchor with palms up, arms extended, and your body leaning back. Keep your upper arms lifted as you curl the handles toward your temples. Extend your elbows slowly to return.',
    sourceUrl: null,
    muscles: [m('biceps', 'primary', 1), m('forearms', 'secondary', 0.6), m('upper-back', 'stabilizer', 0.4), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-chest-press', name: 'TRX Chest Press', family: 'press', primaryPattern: 'push', difficulty: 1, unilateral: false,
    instructions: 'Face away from the anchor with the handles beside your chest and your body in a forward lean. Press until your arms are straight without letting the straps rub your shoulders. Bend your elbows and lower your chest under control.',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-chest-press',
    muscles: [m('chest', 'primary', 1), m('triceps', 'secondary', 0.7), m('front-delts', 'secondary', 0.6), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-triceps-press', name: 'TRX Triceps Press', family: 'press', primaryPattern: 'push', difficulty: 1, unilateral: false,
    instructions: 'Face away from the anchor with arms extended in front of you and your body leaning forward. Bend only your elbows to bring the handles toward your forehead. Press through your palms to straighten your arms and return.',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-triceps-press',
    muscles: [m('triceps', 'primary', 1), m('front-delts', 'secondary', 0.5), m('chest', 'stabilizer', 0.4), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-push-up', name: 'TRX Push-Up', family: 'press', primaryPattern: 'push', difficulty: 3, unilateral: false,
    instructions: 'Place your feet in the cradles and begin in a strong high-plank position. Bend your elbows and lower your chest toward the floor while keeping your hips level. Press the floor away to return to the plank.',
    sourceUrl: null,
    muscles: [m('chest', 'primary', 1), m('triceps', 'primary', 0.8), m('front-delts', 'secondary', 0.7), m('abs', 'stabilizer', 0.4), m('glutes', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-atomic-push-up', name: 'TRX Atomic Push-Up', family: 'press', primaryPattern: 'push', difficulty: 3, unilateral: false,
    instructions: 'Start in a high plank with both feet secured in the cradles. Perform a push-up, then draw both knees toward your chest while lifting your hips slightly. Extend your legs back to the stable plank position.',
    sourceUrl: null,
    muscles: [m('chest', 'primary', 0.9), m('abs', 'primary', 1), m('triceps', 'secondary', 0.7), m('front-delts', 'secondary', 0.6), m('quads', 'secondary', 0.5), m('glutes', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-push-up-side-plank', name: 'TRX Push-Up to Side Plank', family: 'press', primaryPattern: 'push', difficulty: 3, unilateral: false,
    instructions: 'Start in a high plank with both feet in the cradles and perform one controlled push-up. Shift onto one hand and rotate into a side plank as your free arm reaches upward. Return to a square plank before alternating sides.',
    sourceName: 'free-exercise-db reference',
    sourceUrl: FREE_EXERCISE_DB_URL,
    muscles: [m('chest', 'primary', 0.9), m('obliques', 'primary', 0.9), m('triceps', 'secondary', 0.7), m('front-delts', 'secondary', 0.7), m('abs', 'stabilizer', 0.6), m('glutes', 'stabilizer', 0.4)],
  },
  {
    slug: 'trx-clock-push-up', name: 'TRX Clock Push-Up', family: 'press', primaryPattern: 'push', difficulty: 3, unilateral: false,
    instructions: 'Begin in a high plank with both feet suspended and your body braced. Perform a push-up, then walk your hands a small step around the anchor point without twisting your hips. Repeat in controlled increments and reverse direction to return.',
    sourceName: 'free-exercise-db reference',
    sourceUrl: FREE_EXERCISE_DB_URL,
    muscles: [m('chest', 'primary', 1), m('triceps', 'primary', 0.8), m('front-delts', 'secondary', 0.8), m('abs', 'stabilizer', 0.6), m('obliques', 'stabilizer', 0.5), m('glutes', 'stabilizer', 0.4)],
  },
  {
    slug: 'trx-close-grip-push-up', name: 'TRX Close-Grip Push-Up', family: 'press', primaryPattern: 'push', difficulty: 3, unilateral: false,
    instructions: 'Place both feet in the cradles and set your hands slightly narrower than shoulder width. Keep your elbows close as you lower your chest with a rigid trunk. Press through the floor to return to a stable high plank.',
    sourceName: 'free-exercise-db reference',
    sourceUrl: FREE_EXERCISE_DB_URL,
    muscles: [m('triceps', 'primary', 0.9), m('chest', 'primary', 0.8), m('front-delts', 'secondary', 0.5), m('abs', 'stabilizer', 0.4), m('glutes', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-chest-fly', name: 'TRX Chest Fly', family: 'press', primaryPattern: 'push', difficulty: 2, unilateral: false,
    instructions: 'Face away from the anchor with straight arms in front and a firm forward lean. Open your arms in a controlled arc while keeping a soft bend in the elbows. Squeeze your chest to bring the handles together and return upright.',
    sourceName: 'free-exercise-db reference',
    sourceUrl: FREE_EXERCISE_DB_URL,
    muscles: [m('chest', 'primary', 1), m('front-delts', 'secondary', 0.6), m('biceps', 'stabilizer', 0.3), m('abs', 'stabilizer', 0.4)],
  },
  {
    slug: 'trx-squat', name: 'TRX Squat', family: 'squat', primaryPattern: 'squat', difficulty: 1, unilateral: false,
    instructions: 'Face the anchor with light tension in the straps and feet around shoulder width. Sit your hips down and back while keeping your chest lifted. Drive through your feet to stand tall again.',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-squat',
    muscles: [m('quads', 'primary', 1), m('glutes', 'primary', 0.8), m('hamstrings', 'secondary', 0.5), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-squat-row', name: 'TRX Squat Row', family: 'squat', primaryPattern: 'squat', difficulty: 2, unilateral: false,
    instructions: 'Face the anchor with straight arms and lower into a supported squat. Stand as you pull your chest toward the handles, finishing with elbows behind you. Extend your arms and sit back into the next squat.',
    sourceUrl: null,
    muscles: [m('quads', 'primary', 0.9), m('lats', 'primary', 0.8), m('glutes', 'secondary', 0.7), m('upper-back', 'secondary', 0.7), m('biceps', 'secondary', 0.5), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-jump-squat', name: 'TRX Jump Squat', family: 'squat', primaryPattern: 'squat', difficulty: 2, unilateral: false,
    instructions: 'Face the anchor with light strap tension and lower into a balanced squat. Drive through both feet into a vertical jump while using the handles only for control. Land softly, regain tension, and flow into the next squat.',
    sourceName: 'free-exercise-db reference',
    sourceUrl: FREE_EXERCISE_DB_URL,
    muscles: [m('quads', 'primary', 1), m('glutes', 'primary', 0.9), m('hamstrings', 'secondary', 0.6), m('calves', 'secondary', 0.6), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-single-leg-squat', name: 'TRX Single-Leg Squat', family: 'squat', primaryPattern: 'squat', difficulty: 2, unilateral: true,
    instructions: 'Face the anchor and balance on one leg with the other foot lifted. Sit your hips back and bend the standing knee while using only enough strap support to stay aligned. Drive through the planted foot to stand, then repeat on the other side.',
    sourceName: 'free-exercise-db reference',
    sourceUrl: FREE_EXERCISE_DB_URL,
    muscles: [m('quads', 'primary', 1), m('glutes', 'primary', 0.9), m('hamstrings', 'secondary', 0.5), m('calves', 'stabilizer', 0.5), m('abs', 'stabilizer', 0.4)],
  },
  {
    slug: 'trx-lateral-lunge', name: 'TRX Lateral Lunge', family: 'lunge', primaryPattern: 'lunge', difficulty: 2, unilateral: true,
    instructions: 'Face the anchor with feet wide and light tension in the straps. Shift your hips over one leg, bending that knee while the other leg stays long. Push through the bent leg to return to the centered stance.',
    sourceUrl: null,
    muscles: [m('glutes', 'primary', 0.9), m('quads', 'primary', 0.8), m('hamstrings', 'secondary', 0.5), m('calves', 'stabilizer', 0.3), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-split-squat', name: 'TRX Split Squat', family: 'lunge', primaryPattern: 'lunge', difficulty: 2, unilateral: true,
    instructions: 'Face the anchor in a staggered stance with most of your weight on the front leg. Lower the back knee while keeping the front foot planted and torso tall. Press through the front leg to return to standing.',
    sourceUrl: null,
    muscles: [m('quads', 'primary', 1), m('glutes', 'primary', 0.9), m('hamstrings', 'secondary', 0.5), m('calves', 'stabilizer', 0.3), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-reverse-lunge', name: 'TRX Reverse Lunge', family: 'lunge', primaryPattern: 'lunge', difficulty: 1, unilateral: true,
    instructions: 'Face the anchor with light tension in the straps and feet together. Step one foot back and lower that knee while keeping most of your weight over the front foot. Push through the front leg to return, then alternate sides.',
    sourceName: 'free-exercise-db reference',
    sourceUrl: FREE_EXERCISE_DB_URL,
    muscles: [m('quads', 'primary', 1), m('glutes', 'primary', 0.9), m('hamstrings', 'secondary', 0.6), m('calves', 'stabilizer', 0.4), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-hamstring-curl', name: 'TRX Hamstring Curl', family: 'curl', primaryPattern: 'hinge', difficulty: 2, unilateral: false,
    instructions: 'Lie on your back with both heels in the cradles and lift your hips. Bend your knees to draw your heels toward your body while keeping your hips elevated. Extend your legs slowly to return.',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-hamstring-curl',
    muscles: [m('hamstrings', 'primary', 1), m('glutes', 'primary', 0.8), m('calves', 'secondary', 0.5), m('lower-back', 'stabilizer', 0.3), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-single-leg-hamstring-curl', name: 'TRX Single-Leg Hamstring Curl', family: 'curl', primaryPattern: 'hinge', difficulty: 3, unilateral: true,
    instructions: 'Lie on your back with one heel in a cradle, the free leg lifted, and your hips raised. Pull the suspended heel toward you without letting your pelvis rotate. Extend the working leg slowly, then change sides after the set.',
    sourceName: 'free-exercise-db reference',
    sourceUrl: FREE_EXERCISE_DB_URL,
    muscles: [m('hamstrings', 'primary', 1), m('glutes', 'primary', 0.9), m('calves', 'secondary', 0.5), m('abs', 'stabilizer', 0.5), m('lower-back', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-wide-hip-hinge', name: 'TRX Wide Hip Hinge', family: 'hinge', primaryPattern: 'hinge', difficulty: 2, unilateral: false,
    instructions: 'Face the anchor in a wide stance with straight arms and a long spine. Push your hips backward while keeping your knees soft and torso braced. Squeeze your glutes to drive your hips forward and stand tall.',
    sourceUrl: null,
    muscles: [m('hamstrings', 'primary', 1), m('glutes', 'primary', 0.9), m('lower-back', 'secondary', 0.5), m('abs', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-plank', name: 'TRX Plank', family: 'plank', primaryPattern: 'plank', difficulty: 1, unilateral: false,
    instructions: 'Place both feet in the cradles and set your forearms or hands beneath your shoulders. Hold a straight line from head to heels while bracing your abdomen and glutes. Finish by lowering your knees with control.',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/trx-weekly-exercise-trx-plank',
    muscles: [m('abs', 'primary', 1), m('obliques', 'secondary', 0.7), m('front-delts', 'secondary', 0.5), m('glutes', 'stabilizer', 0.4), m('lower-back', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-body-saw', name: 'TRX Body Saw', family: 'plank', primaryPattern: 'plank', difficulty: 2, unilateral: false,
    instructions: 'Set both feet in the cradles and hold a forearm plank with your body straight. Glide your body backward from the shoulders while maintaining a firm abdominal brace. Pull forward under control until your shoulders return above your elbows.',
    sourceName: 'free-exercise-db reference',
    sourceUrl: FREE_EXERCISE_DB_URL,
    muscles: [m('abs', 'primary', 1), m('lats', 'secondary', 0.7), m('front-delts', 'secondary', 0.6), m('obliques', 'stabilizer', 0.5), m('glutes', 'stabilizer', 0.4), m('lower-back', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-side-plank', name: 'TRX Side Plank', family: 'plank', primaryPattern: 'plank', difficulty: 2, unilateral: true,
    instructions: 'Secure both feet in the cradles and support yourself on one forearm in a side-facing position. Lift your hips until your body forms a straight line and hold the brace. Lower your hips under control to return.',
    sourceUrl: null,
    muscles: [m('obliques', 'primary', 1), m('abs', 'secondary', 0.7), m('side-delts', 'secondary', 0.5), m('glutes', 'stabilizer', 0.4), m('lower-back', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-pike', name: 'TRX Pike', family: 'plank', primaryPattern: 'plank', difficulty: 3, unilateral: false,
    instructions: 'Begin in a high plank with both feet suspended in the cradles. Keep your legs straight as you lift your hips and draw your feet toward your hands. Lower your hips slowly until you regain the plank position.',
    sourceUrl: null,
    muscles: [m('abs', 'primary', 1), m('quads', 'secondary', 0.7), m('front-delts', 'secondary', 0.6), m('obliques', 'secondary', 0.5), m('triceps', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-mountain-climbers', name: 'TRX Mountain Climbers', family: 'plank', primaryPattern: 'plank', difficulty: 2, unilateral: false,
    instructions: 'Start in a high plank with your feet secured in the cradles. Alternate driving one knee toward your chest while keeping your shoulders stacked over your hands. Extend each leg fully to return before switching sides.',
    sourceUrl: 'https://www.trxtraining.com/blogs/news/moves-of-the-week-trx-mountain-climbers',
    muscles: [m('abs', 'primary', 1), m('quads', 'secondary', 0.7), m('obliques', 'secondary', 0.6), m('front-delts', 'stabilizer', 0.4), m('glutes', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-standing-rollout', name: 'TRX Standing Rollout', family: 'rollout', primaryPattern: 'plank', difficulty: 2, unilateral: false,
    instructions: 'Face away from the anchor with arms extended in front and straps under tension. Reach your hands forward and overhead as your straight body leans from the ankles. Brace your abdomen and pull your arms back to return upright.',
    sourceUrl: null,
    muscles: [m('abs', 'primary', 1), m('lats', 'secondary', 0.7), m('front-delts', 'secondary', 0.6), m('obliques', 'stabilizer', 0.4), m('lower-back', 'stabilizer', 0.3)],
  },
  {
    slug: 'trx-torso-rotation', name: 'TRX Torso Rotation', family: 'rotation', primaryPattern: 'rotate', difficulty: 2, unilateral: false,
    instructions: 'Stand side-on to the anchor with both hands together and arms extended. Rotate your torso away from the anchor while keeping your hips controlled and the straps taut. Use your trunk to rotate back to the starting position.',
    sourceUrl: null,
    muscles: [m('obliques', 'primary', 1), m('abs', 'secondary', 0.7), m('lower-back', 'secondary', 0.5), m('rear-delts', 'stabilizer', 0.3), m('glutes', 'stabilizer', 0.3)],
  },
];

// Metadata belongs to the local TRX catalog. Keeping it keyed by slug makes
// completeness reviewable and prevents a partial seed when the catalog grows.
const metadataBySlug = {
  'trx-row': { force: 'pull', mechanic: 'compound', category: 'strength', variationGroup: 'row' },
  'trx-low-row': { force: 'pull', mechanic: 'compound', category: 'strength', variationGroup: 'row' },
  'trx-mid-row': { force: 'pull', mechanic: 'compound', category: 'strength', variationGroup: 'row' },
  'trx-high-row': { force: 'pull', mechanic: 'compound', category: 'strength', variationGroup: 'row' },
  'trx-power-pull': { force: 'mixed', mechanic: 'compound', category: 'strength', variationGroup: 'power-pull' },
  'trx-one-arm-row': { force: 'pull', mechanic: 'compound', category: 'strength', variationGroup: 'one-arm-row' },
  'trx-face-pull': { force: 'pull', mechanic: 'compound', category: 'strength', variationGroup: 'face-pull' },
  'trx-y-raise': { force: 'pull', mechanic: 'isolation', category: 'strength', variationGroup: 'y-raise' },
  'trx-t-delt-fly': { force: 'pull', mechanic: 'isolation', category: 'strength', variationGroup: 'reverse-fly' },
  'trx-biceps-curl': { force: 'pull', mechanic: 'isolation', category: 'strength', variationGroup: 'biceps-curl' },
  'trx-chest-press': { force: 'push', mechanic: 'compound', category: 'strength', variationGroup: 'chest-press' },
  'trx-triceps-press': { force: 'push', mechanic: 'isolation', category: 'strength', variationGroup: 'triceps-press' },
  'trx-push-up': { force: 'push', mechanic: 'compound', category: 'strength', variationGroup: 'push-up' },
  'trx-atomic-push-up': { force: 'mixed', mechanic: 'compound', category: 'conditioning', variationGroup: 'atomic-push-up' },
  'trx-push-up-side-plank': { force: 'mixed', mechanic: 'compound', category: 'core', variationGroup: 'push-up-side-plank' },
  'trx-clock-push-up': { force: 'push', mechanic: 'compound', category: 'conditioning', variationGroup: 'clock-push-up' },
  'trx-close-grip-push-up': { force: 'push', mechanic: 'compound', category: 'strength', variationGroup: 'close-grip-push-up' },
  'trx-chest-fly': { force: 'push', mechanic: 'isolation', category: 'strength', variationGroup: 'chest-fly' },
  'trx-squat': { force: 'push', mechanic: 'compound', category: 'strength', variationGroup: 'squat' },
  'trx-squat-row': { force: 'mixed', mechanic: 'compound', category: 'strength', variationGroup: 'squat-row' },
  'trx-jump-squat': { force: 'push', mechanic: 'compound', category: 'conditioning', variationGroup: 'jump-squat' },
  'trx-single-leg-squat': { force: 'push', mechanic: 'compound', category: 'strength', variationGroup: 'single-leg-squat' },
  'trx-lateral-lunge': { force: 'push', mechanic: 'compound', category: 'strength', variationGroup: 'lateral-lunge' },
  'trx-split-squat': { force: 'push', mechanic: 'compound', category: 'strength', variationGroup: 'split-squat' },
  'trx-reverse-lunge': { force: 'push', mechanic: 'compound', category: 'strength', variationGroup: 'reverse-lunge' },
  'trx-hamstring-curl': { force: 'pull', mechanic: 'isolation', category: 'strength', variationGroup: 'hamstring-curl' },
  'trx-single-leg-hamstring-curl': { force: 'pull', mechanic: 'isolation', category: 'strength', variationGroup: 'single-leg-hamstring-curl' },
  'trx-wide-hip-hinge': { force: 'pull', mechanic: 'compound', category: 'mobility', variationGroup: 'wide-hip-hinge' },
  'trx-plank': { force: 'static', mechanic: 'compound', category: 'core', variationGroup: 'plank' },
  'trx-body-saw': { force: 'mixed', mechanic: 'compound', category: 'core', variationGroup: 'body-saw' },
  'trx-side-plank': { force: 'static', mechanic: 'compound', category: 'core', variationGroup: 'side-plank' },
  'trx-pike': { force: 'mixed', mechanic: 'compound', category: 'core', variationGroup: 'pike' },
  'trx-mountain-climbers': { force: 'mixed', mechanic: 'compound', category: 'conditioning', variationGroup: 'mountain-climber' },
  'trx-standing-rollout': { force: 'static', mechanic: 'compound', category: 'core', variationGroup: 'rollout' },
  'trx-torso-rotation': { force: 'pull', mechanic: 'compound', category: 'core', variationGroup: 'torso-rotation' },
} satisfies Record<string, ExerciseMetadata>;

async function seedExercises() {
  const { db } = await import('./index');
  const { exerciseMuscles, exercises, muscles } = await import('./schema');

  const mappingCount = await db.transaction(async (tx) => {
    const requiredMuscleSlugs = [...new Set(
      catalog.flatMap((exercise) => exercise.muscles.map((muscle) => muscle.slug)),
    )];
    const existingMuscles = await tx
      .select({ id: muscles.id, slug: muscles.slug })
      .from(muscles)
      .where(inArray(muscles.slug, requiredMuscleSlugs));
    const muscleBySlug = new Map(
      existingMuscles.map((muscle) => [muscle.slug, muscle.id]),
    );
    const missingMuscleSlugs = requiredMuscleSlugs.filter(
      (slug) => !muscleBySlug.has(slug),
    );

    if (missingMuscleSlugs.length > 0) {
      throw new Error(
        `Cannot seed exercise catalog. Missing muscles: ${missingMuscleSlugs.join(', ')}`,
      );
    }

    let createdMappings = 0;

    for (const exerciseData of catalog) {
      const { muscles: muscleData, sourceName = 'TRX Training', ...values } = exerciseData;
      const metadata = metadataBySlug[exerciseData.slug as keyof typeof metadataBySlug];

      if (!metadata) {
        throw new Error(`Cannot seed exercise catalog. Missing metadata for ${exerciseData.slug}`);
      }

      const [exercise] = await tx
        .insert(exercises)
        .values({ ...values, ...metadata, sourceName })
        .onConflictDoUpdate({
          target: exercises.slug,
          set: { ...values, ...metadata, sourceName, updatedAt: new Date() },
        })
        .returning({ id: exercises.id });

      await tx
        .delete(exerciseMuscles)
        .where(eq(exerciseMuscles.exerciseId, exercise.id));

      await tx.insert(exerciseMuscles).values(
        muscleData.map((muscle) => ({
          exerciseId: exercise.id,
          muscleId: muscleBySlug.get(muscle.slug)!,
          role: muscle.role,
          activation: muscle.activation.toFixed(2),
        })),
      );
      createdMappings += muscleData.length;
    }

    return createdMappings;
  });

  console.log('Seeded TRX exercise catalog');
  console.log(`Exercises processed: ${catalog.length}`);
  console.log(`Muscle mappings created: ${mappingCount}`);
}

seedExercises()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
