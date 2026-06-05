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

const byName = new Map(data.items.map((i) => [i.name.trim().toLowerCase(), i]));

/** Pack sizes recorded for an exact medication name (case-insensitive). */
export function packSizesFor(name: string): number[] {
  return byName.get(name.trim().toLowerCase())?.packSizes ?? [];
}
