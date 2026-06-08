/**
 * Opioid → oral morphine equivalent (OME) conversion. Pure + testable.
 *
 * ⚠️ DECISION AID ONLY. Conversion ratios are approximate and vary between
 * sources; equianalgesic switching should reduce the calculated dose by 25–50%
 * for incomplete cross-tolerance. Patches and methadone must not be initiated or
 * rotated from these figures alone — use product-specific tables / specialist
 * advice. Ratios align with BNF / Faculty of Pain Medicine / Scottish
 * Palliative Care Guidelines.
 */

export type DoseUnit = 'mg/day' | 'mcg/h';

export interface Opioid {
  key: string;
  label: string;
  unit: DoseUnit;
  /** mg of oral morphine per unit of dose. */
  omeFactor: number;
  note?: string;
}

export const OPIOIDS: Opioid[] = [
  { key: 'morphine_oral', label: 'Morphine (oral)', unit: 'mg/day', omeFactor: 1 },
  { key: 'codeine', label: 'Codeine (oral)', unit: 'mg/day', omeFactor: 0.1 },
  { key: 'dihydrocodeine', label: 'Dihydrocodeine (oral)', unit: 'mg/day', omeFactor: 0.1 },
  { key: 'tramadol', label: 'Tramadol (oral)', unit: 'mg/day', omeFactor: 0.1 },
  { key: 'oxycodone_oral', label: 'Oxycodone (oral)', unit: 'mg/day', omeFactor: 1.5 },
  { key: 'hydromorphone_oral', label: 'Hydromorphone (oral)', unit: 'mg/day', omeFactor: 5 },
  { key: 'morphine_sc', label: 'Morphine (SC/IV)', unit: 'mg/day', omeFactor: 2 },
  { key: 'diamorphine_sc', label: 'Diamorphine (SC)', unit: 'mg/day', omeFactor: 3 },
  {
    key: 'fentanyl_patch',
    label: 'Fentanyl patch',
    unit: 'mcg/h',
    omeFactor: 2.4,
    note: 'Approximate (12 micrograms/h ≈ 30 mg/24h oral morphine). Use patch tables to initiate/rotate.',
  },
  {
    key: 'buprenorphine_patch',
    label: 'Buprenorphine patch',
    unit: 'mcg/h',
    omeFactor: 2.4,
    note: 'Approximate and non-linear at higher strengths (5 micrograms/h ≈ 12 mg/24h oral morphine).',
  },
];

const byKey = new Map(OPIOIDS.map((o) => [o.key, o]));

/** NICE: doses above 120 mg OME/day warrant specialist review (harm > benefit). */
export const HIGH_DOSE_OME = 120;

export interface OmeItem {
  key: string;
  dose: number | null;
}

export interface OmeResult {
  totalOme: number; // mg oral morphine / 24h
  highDose: boolean;
  contributions: { label: string; ome: number }[];
}

export function totalOme(items: OmeItem[]): OmeResult {
  const contributions: { label: string; ome: number }[] = [];
  let totalOme = 0;
  for (const it of items) {
    const o = byKey.get(it.key);
    if (!o || it.dose == null || !(it.dose > 0)) continue;
    const ome = it.dose * o.omeFactor;
    totalOme += ome;
    contributions.push({ label: o.label, ome });
  }
  return { totalOme, highDose: totalOme >= HIGH_DOSE_OME, contributions };
}

export interface TargetConversion {
  /** Equivalent dose of the target opioid (in its own unit) before any reduction. */
  equivalent: number;
  /** Recommended starting range after a 25–50% cross-tolerance reduction. */
  reducedLow: number; // 50% reduction
  reducedHigh: number; // 25% reduction
  unit: DoseUnit;
}

/** Convert a total OME to a target opioid's dose (with cross-tolerance range). */
export function convertOmeTo(totalOmeMg: number, targetKey: string): TargetConversion | null {
  const o = byKey.get(targetKey);
  if (!o || o.omeFactor <= 0) return null;
  const equivalent = totalOmeMg / o.omeFactor;
  return {
    equivalent,
    reducedLow: equivalent * 0.5,
    reducedHigh: equivalent * 0.75,
    unit: o.unit,
  };
}
