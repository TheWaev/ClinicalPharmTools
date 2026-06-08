import { describe, it, expect } from 'vitest';
import {
  convertDose,
  prednisoloneEquivalentMg,
  buildEquivalents,
  getSteroid,
} from './steroidEquiv';

describe('steroid equivalence (BNF glucocorticoid table)', () => {
  it('prednisolone 5 mg ≈ hydrocortisone 20 mg', () => {
    expect(convertDose('prednisolone', 5, 'hydrocortisone')).toBeCloseTo(20, 5);
  });

  it('prednisolone 5 mg ≈ dexamethasone 0.75 mg', () => {
    expect(convertDose('prednisolone', 5, 'dexamethasone')).toBeCloseTo(0.75, 5);
  });

  it('dexamethasone 8 mg ≈ prednisolone 53.3 mg', () => {
    // 8 / 0.75 × 5 = 53.33
    expect(prednisoloneEquivalentMg('dexamethasone', 8)).toBeCloseTo(53.33, 1);
  });

  it('hydrocortisone 100 mg ≈ prednisolone 25 mg', () => {
    expect(prednisoloneEquivalentMg('hydrocortisone', 100)).toBeCloseTo(25, 5);
  });

  it('converting to the same steroid returns the same dose', () => {
    expect(convertDose('methylprednisolone', 16, 'methylprednisolone')).toBeCloseTo(16, 5);
  });

  it('flags adrenal-suppression risk at prednisolone-equivalent ≥ 5 mg/day', () => {
    const low = buildEquivalents('prednisolone', 4);
    expect(low.adrenalRisk).toBe(false);

    const atThreshold = buildEquivalents('prednisolone', 5);
    expect(atThreshold.adrenalRisk).toBe(true);

    const dex = buildEquivalents('dexamethasone', 1); // = 6.67 mg pred
    expect(dex.adrenalRisk).toBe(true);
  });

  it('builds a row for every steroid', () => {
    const r = buildEquivalents('prednisolone', 10);
    expect(r.ok).toBe(true);
    expect(r.rows.length).toBe(9);
    const dex = r.rows.find((x) => x.steroid.key === 'dexamethasone');
    expect(dex?.dose).toBeCloseTo(1.5, 5);
  });

  it('returns not-ok for missing/invalid dose', () => {
    expect(buildEquivalents('prednisolone', null).ok).toBe(false);
    expect(buildEquivalents('prednisolone', 0).ok).toBe(false);
    expect(convertDose('prednisolone', null, 'hydrocortisone')).toBeNull();
  });

  it('exposes metadata for each steroid', () => {
    expect(getSteroid('dexamethasone').duration).toBe('long');
    expect(getSteroid('hydrocortisone').mineralocorticoid).toBe('high');
  });
});
