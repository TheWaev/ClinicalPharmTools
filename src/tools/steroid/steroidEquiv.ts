/**
 * Glucocorticoid (corticosteroid) equivalence — pure, UI-decoupled, testable.
 * Nothing here touches the DOM or the network.
 *
 * Equivalent anti-inflammatory (glucocorticoid) doses follow the BNF
 * "Glucocorticoid therapy" table. These are approximate; mineralocorticoid
 * (salt-retaining) potency and duration of action differ between agents, so a
 * dose conversion is not a like-for-like swap. This is a conversion aid only.
 */

export type SteroidKey =
  | 'hydrocortisone'
  | 'cortisone'
  | 'prednisolone'
  | 'prednisone'
  | 'methylprednisolone'
  | 'triamcinolone'
  | 'deflazacort'
  | 'dexamethasone'
  | 'betamethasone';

export type Duration = 'short' | 'intermediate' | 'long';
export type Mineralocorticoid = 'high' | 'modest' | 'negligible';

export interface Steroid {
  key: SteroidKey;
  name: string;
  /** Equivalent anti-inflammatory dose (mg). */
  equivMg: number;
  duration: Duration;
  mineralocorticoid: Mineralocorticoid;
}

/** Daily prednisolone-equivalent dose at/above which adrenal suppression is a concern. */
export const ADRENAL_SUPPRESSION_THRESHOLD_MG = 5;

export const DURATION_LABEL: Record<Duration, string> = {
  short: 'Short-acting (~8–12 h)',
  intermediate: 'Intermediate (~12–36 h)',
  long: 'Long-acting (~36–72 h)',
};

export const MINERALO_LABEL: Record<Mineralocorticoid, string> = {
  high: 'High salt-retaining effect',
  modest: 'Modest salt-retaining effect',
  negligible: 'Negligible salt-retaining effect',
};

export const STEROIDS: Steroid[] = [
  { key: 'hydrocortisone', name: 'Hydrocortisone', equivMg: 20, duration: 'short', mineralocorticoid: 'high' },
  { key: 'cortisone', name: 'Cortisone acetate', equivMg: 25, duration: 'short', mineralocorticoid: 'high' },
  { key: 'prednisolone', name: 'Prednisolone', equivMg: 5, duration: 'intermediate', mineralocorticoid: 'modest' },
  { key: 'prednisone', name: 'Prednisone', equivMg: 5, duration: 'intermediate', mineralocorticoid: 'modest' },
  { key: 'methylprednisolone', name: 'Methylprednisolone', equivMg: 4, duration: 'intermediate', mineralocorticoid: 'negligible' },
  { key: 'triamcinolone', name: 'Triamcinolone', equivMg: 4, duration: 'intermediate', mineralocorticoid: 'negligible' },
  { key: 'deflazacort', name: 'Deflazacort', equivMg: 6, duration: 'intermediate', mineralocorticoid: 'negligible' },
  { key: 'dexamethasone', name: 'Dexamethasone', equivMg: 0.75, duration: 'long', mineralocorticoid: 'negligible' },
  { key: 'betamethasone', name: 'Betamethasone', equivMg: 0.75, duration: 'long', mineralocorticoid: 'negligible' },
];

export function getSteroid(key: SteroidKey): Steroid {
  const s = STEROIDS.find((x) => x.key === key);
  if (!s) throw new Error(`Unknown steroid: ${key}`);
  return s;
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** Convert a dose of `fromKey` to the equivalent dose of `toKey` (mg). */
export function convertDose(fromKey: SteroidKey, dose: number | null, toKey: SteroidKey): number | null {
  if (!isPositive(dose)) return null;
  const from = getSteroid(fromKey);
  const to = getSteroid(toKey);
  return (dose * to.equivMg) / from.equivMg;
}

/** Prednisolone-equivalent daily dose (mg). */
export function prednisoloneEquivalentMg(fromKey: SteroidKey, dose: number | null): number | null {
  return convertDose(fromKey, dose, 'prednisolone');
}

export interface EquivalentRow {
  steroid: Steroid;
  dose: number;
}

export interface SteroidResult {
  ok: boolean;
  rows: EquivalentRow[];
  prednisoloneEquivalent: number | null;
  /** True when the prednisolone-equivalent daily dose reaches the adrenal-suppression threshold. */
  adrenalRisk: boolean;
}

export function buildEquivalents(fromKey: SteroidKey, dose: number | null): SteroidResult {
  if (!isPositive(dose)) {
    return { ok: false, rows: [], prednisoloneEquivalent: null, adrenalRisk: false };
  }
  const rows: EquivalentRow[] = STEROIDS.map((s) => ({
    steroid: s,
    dose: convertDose(fromKey, dose, s.key) as number,
  }));
  const prednisoloneEquivalent = prednisoloneEquivalentMg(fromKey, dose);
  const adrenalRisk =
    prednisoloneEquivalent != null && prednisoloneEquivalent >= ADRENAL_SUPPRESSION_THRESHOLD_MG;
  return { ok: true, rows, prednisoloneEquivalent, adrenalRisk };
}
