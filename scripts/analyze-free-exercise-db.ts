import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATASET_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const OUTPUT_PATH = path.join(process.cwd(), 'tmp/free-exercise-db-analysis.json');

const RELEVANT_EQUIPMENT_TERMS = [
  'suspension',
  'suspended',
  'trx',
  'strap',
  'bands',
  'body only',
  'other',
] as const;

const NAME_TERMS = [
  'row',
  'inverted row',
  'chest press',
  'push-up',
  'pike',
  'plank',
  'mountain climber',
  'hamstring curl',
  'lunge',
  'squat',
  'rollout',
  'fly',
  'face pull',
  'triceps',
  'biceps curl',
] as const;

const DIRECT_EQUIPMENT_TERMS = ['suspension', 'suspended', 'trx', 'strap'] as const;
const ADAPTABLE_EQUIPMENT = new Set(['body only', 'bands']);
const UNSUITABLE_EQUIPMENT_TERMS = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'kettlebell',
  'e-z curl bar',
  'ez bar',
  'exercise ball',
  'foam roll',
  'medicine ball',
] as const;
const TOP_STRONG_CANDIDATE_LIMIT = 25;

type Exercise = {
  id: string;
  name: string;
  equipment: string | null;
  force: string | null;
  level: string;
  mechanic: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string;
};

type Candidate = Pick<
  Exercise,
  | 'id'
  | 'name'
  | 'equipment'
  | 'force'
  | 'level'
  | 'mechanic'
  | 'primaryMuscles'
  | 'secondaryMuscles'
  | 'category'
> & {
  matchedNameTerms: string[];
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function containsTerm(value: string | null, term: string): boolean {
  return value !== null && normalize(value).includes(term);
}

function getMatchedNameTerms(name: string): string[] {
  const normalizedName = normalize(name)
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim();

  return NAME_TERMS.filter((term) => {
    const normalizedTerm = term.replaceAll(/[^a-z0-9]+/g, ' ').trim();
    const escapedTerm = normalizedTerm.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^| )${escapedTerm}(?:s|es|ing)?(?: |$)`).test(normalizedName);
  });
}

function toCandidate(exercise: Exercise): Candidate {
  return {
    id: exercise.id,
    name: exercise.name,
    equipment: exercise.equipment,
    force: exercise.force,
    level: exercise.level,
    mechanic: exercise.mechanic,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    category: exercise.category,
    matchedNameTerms: getMatchedNameTerms(exercise.name),
  };
}

function compareCandidates(left: Candidate, right: Candidate): number {
  return (
    right.matchedNameTerms.length - left.matchedNameTerms.length ||
    left.name.localeCompare(right.name)
  );
}

function printCandidates(candidates: Candidate[]): void {
  if (candidates.length === 0) {
    console.log('(none)');
    return;
  }

  for (const candidate of candidates) {
    console.log(JSON.stringify(candidate));
  }
}

async function loadExercises(): Promise<Exercise[]> {
  const response = await fetch(DATASET_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Expected the dataset root to be an array.');
  }

  return data as Exercise[];
}

async function main(): Promise<void> {
  const exercises = await loadExercises();
  const equipmentCounts = new Map<string | null, number>();

  for (const exercise of exercises) {
    const equipment = exercise.equipment === null ? null : normalize(exercise.equipment);
    equipmentCounts.set(equipment, (equipmentCounts.get(equipment) ?? 0) + 1);
  }

  const equipmentDistribution = [...equipmentCounts.entries()]
    .map(([equipment, count]) => ({ equipment, count }))
    .sort(
      (left, right) =>
        right.count - left.count || (left.equipment ?? '').localeCompare(right.equipment ?? ''),
    );
  const relevantEquipmentMatches = RELEVANT_EQUIPMENT_TERMS.map((term) => ({
    term,
    count: exercises.filter((exercise) => containsTerm(exercise.equipment, term)).length,
  }));
  const nameCandidates = exercises
    .filter((exercise) => getMatchedNameTerms(exercise.name).length > 0)
    .map(toCandidate)
    .sort(compareCandidates);
  const directCandidates = exercises
    .filter((exercise) =>
      DIRECT_EQUIPMENT_TERMS.some((term) => containsTerm(exercise.equipment, term)),
    )
    .map(toCandidate)
    .sort(compareCandidates);
  const strongAdaptationCandidates = nameCandidates
    .filter(
      (exercise) =>
        exercise.equipment !== null &&
        ADAPTABLE_EQUIPMENT.has(normalize(exercise.equipment)) &&
        normalize(exercise.category) === 'strength',
    )
    .sort(compareCandidates);
  const notSuitable = exercises
    .filter((exercise) =>
      UNSUITABLE_EQUIPMENT_TERMS.some((term) => containsTerm(exercise.equipment, term)),
    )
    .map(toCandidate)
    .sort(compareCandidates);

  const report = {
    source: DATASET_URL,
    generatedAt: new Date().toISOString(),
    methodology: {
      direct:
        'Equipment contains one of: suspension, suspended, trx, strap.',
      strongAdaptation:
        'Category is strength, equipment is exactly body only or bands, and the name matches a requested movement term. This is a review shortlist, not an automatic TRX conversion.',
      notSuitable:
        'Equipment contains an explicit load/machine dependency term. Unclassified exercises are intentionally not forced into this group.',
      topStrongCandidates:
        'Sorted by number of matched name terms (descending), then name; terminal output is limited to 25.',
    },
    totalExercises: exercises.length,
    equipmentDistribution,
    relevantEquipmentMatches,
    nameCandidateCount: nameCandidates.length,
    nameCandidates,
    directCandidateCount: directCandidates.length,
    directCandidates,
    strongAdaptationCandidateCount: strongAdaptationCandidates.length,
    strongAdaptationCandidates,
    notSuitableCount: notSuitable.length,
    notSuitable,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Total exercises: ${exercises.length}`);
  console.log('\nEquipment distribution:');
  for (const { equipment, count } of equipmentDistribution) {
    console.log(`${equipment ?? 'null'}: ${count}`);
  }

  console.log('\nRelevant equipment term matches:');
  for (const { term, count } of relevantEquipmentMatches) {
    console.log(`${term}: ${count}`);
  }

  console.log(`\nName candidates: ${nameCandidates.length}`);
  printCandidates(nameCandidates);
  console.log(`\nDirect TRX candidates: ${directCandidates.length}`);
  printCandidates(directCandidates);
  console.log(`\nStrong adaptation candidates: ${strongAdaptationCandidates.length}`);
  console.log(`Top ${Math.min(TOP_STRONG_CANDIDATE_LIMIT, strongAdaptationCandidates.length)}:`);
  printCandidates(strongAdaptationCandidates.slice(0, TOP_STRONG_CANDIDATE_LIMIT));
  console.log(`\nNot suitable (explicit equipment dependency): ${notSuitable.length}`);
  console.log(`\nJSON report: ${OUTPUT_PATH}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
