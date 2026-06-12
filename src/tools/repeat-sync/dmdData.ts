/**
 * Loader for the bundled NHS dm+d medication subset.
 *
 * The data is ingested at BUILD time (never at runtime) so the app stays fully
 * client-side and offline per the PRD's information-governance rules. The
 * committed `data/dmd.json` is a small hand-curated sample; running
 * `npm run build:dmd` with a TRUD_API_KEY overwrites it with the full dm+d
 * extract. See scripts/build-dmd.mjs and [[dmd-trud-integration]].
 */
import raw from './data/dmd.json';

export interface DmdItem {
  /** dm+d VMP description, e.g. "Amlodipine 5mg tablets". */
  name: string;
  /** Distinct pack sizes (VMPP quantities) seen for this product. */
  packSizes: number[];
}

interface DmdFile {
  source: string;
  generatedAt: string;
  items: DmdItem[];
}

const data = raw as DmdFile;

export const dmdSource: string = data.source;
export const dmdGeneratedAt: string = data.generatedAt;
export const dmdItems: DmdItem[] = data.items;

/** True for the curated fallback; false once real dm+d has been ingested. */
export const isSampleData: boolean = /sample data/i.test(data.source);

export const medicationNames: string[] = data.items.map((i) => i.name);

/**
 * Commonly prescribed primary-care medicines (generic names), shown as the
 * initial type-ahead suggestions before the user types. Picking one narrows the
 * full dm+d search to that drug so the right strength/form can be chosen. These
 * are deliberately generic stems (no strength) and are ordered by rough
 * prescribing volume / clinical grouping.
 */
export const TOP_PRIMARY_CARE_DRUGS: string[] = [
  'Atorvastatin',
  'Simvastatin',
  'Amlodipine',
  'Ramipril',
  'Lisinopril',
  'Losartan',
  'Bisoprolol',
  'Atenolol',
  'Bendroflumethiazide',
  'Indapamide',
  'Furosemide',
  'Levothyroxine sodium',
  'Metformin',
  'Gliclazide',
  'Omeprazole',
  'Lansoprazole',
  'Aspirin',
  'Clopidogrel',
  'Apixaban',
  'Salbutamol',
  'Beclometasone',
  'Montelukast',
  'Sertraline',
  'Citalopram',
  'Fluoxetine',
  'Mirtazapine',
  'Amitriptyline',
  'Gabapentin',
  'Pregabalin',
  'Naproxen',
  'Co-codamol',
  'Paracetamol',
  'Amoxicillin',
  'Doxycycline',
  'Colecalciferol',
  'Ferrous sulfate',
  'Folic acid',
  'Tamsulosin',
];

const byName = new Map(data.items.map((i) => [i.name.trim().toLowerCase(), i]));

/** Pack sizes recorded for an exact medication name (case-insensitive). */
export function packSizesFor(name: string): number[] {
  return byName.get(name.trim().toLowerCase())?.packSizes ?? [];
}

/**
 * Free-text search across the whole dm+d subset for a type-ahead combobox.
 * Case-insensitive; prefix matches are ranked above substring matches. Returns
 * at most `limit` names. (Needs ≥2 characters to avoid returning the world.)
 */
export function searchMedications(query: string, limit = 50): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const name of medicationNames) {
    const idx = name.toLowerCase().indexOf(q);
    if (idx === 0) starts.push(name);
    else if (idx > 0) contains.push(name);
    if (starts.length >= limit) break;
  }
  return starts.length >= limit ? starts.slice(0, limit) : starts.concat(contains).slice(0, limit);
}
