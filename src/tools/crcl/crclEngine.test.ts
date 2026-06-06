import { describe, it, expect } from 'vitest';
import {
  calculateCrCl,
  idealBodyWeightKg,
  adjustedBodyWeightKg,
  UMOL_PER_MGDL,
  type CrClInput,
} from './crclEngine';

function input(partial: Partial<CrClInput>): CrClInput {
  return {
    age: 70,
    sex: 'male',
    creatinine: 90,
    creatinineUnit: 'umol/L',
    weightKg: 72,
    heightCm: null,
    weightBasis: 'actual',
    ...partial,
  };
}

describe('Cockcroft–Gault CrCl', () => {
  it('computes a male estimate (µmol/L, actual weight)', () => {
    // (140-70) × 72 × 1 / (72 × 90/88.4) = 70 × 88.4 / 90 = 68.76
    const r = calculateCrCl(input({}));
    expect(r.ok).toBe(true);
    expect(r.crclMlMin).toBeCloseTo(68.76, 1);
    expect(r.weightUsedKg).toBe(72);
  });

  it('applies the 0.85 factor for females', () => {
    const male = calculateCrCl(input({ sex: 'male' })).crclMlMin!;
    const female = calculateCrCl(input({ sex: 'female' })).crclMlMin!;
    expect(female).toBeCloseTo(male * 0.85, 4);
    expect(female).toBeCloseTo(58.44, 1);
  });

  it('gives the same result for equivalent µmol/L and mg/dL inputs', () => {
    const umol = calculateCrCl(input({ creatinine: 88.4, creatinineUnit: 'umol/L' }));
    const mgdl = calculateCrCl(input({ creatinine: 1.0, creatinineUnit: 'mg/dL' }));
    // 88.4 µmol/L == 1.0 mg/dL
    expect(umol.crclMlMin).toBeCloseTo(mgdl.crclMlMin!, 6);
  });

  it('mg/dL worked example', () => {
    // (140-60) × 80 / (72 × 1.0) = 6400 / 72 = 88.89
    const r = calculateCrCl(
      input({ age: 60, weightKg: 80, creatinine: 1.0, creatinineUnit: 'mg/dL' }),
    );
    expect(r.crclMlMin).toBeCloseTo(88.89, 1);
  });
});

describe('body weight helpers', () => {
  it('Devine ideal body weight', () => {
    // male 180cm = 70.866in → 50 + 2.3×10.866 = 74.99
    expect(idealBodyWeightKg('male', 180)).toBeCloseTo(74.99, 1);
    // female 165cm = 64.96in → 45.5 + 2.3×4.96 = 56.91
    expect(idealBodyWeightKg('female', 165)).toBeCloseTo(56.91, 1);
  });

  it('adjusted body weight = IBW + 0.4 × (actual − IBW)', () => {
    expect(adjustedBodyWeightKg(100, 70)).toBeCloseTo(82, 6);
  });
});

describe('weight basis selection', () => {
  it("'ideal' feeds IBW into the equation", () => {
    const r = calculateCrCl(input({ weightBasis: 'ideal', heightCm: 180, weightKg: 100 }));
    expect(r.ok).toBe(true);
    expect(r.weightUsedKg).toBeCloseTo(74.99, 1);
    expect(r.idealBodyWeightKg).toBeCloseTo(74.99, 1);
  });

  it("'adjusted' feeds adjusted weight into the equation", () => {
    const r = calculateCrCl(input({ weightBasis: 'adjusted', heightCm: 180, weightKg: 100 }));
    // IBW 74.99, adjusted = 74.99 + 0.4×(100−74.99) = 84.99
    expect(r.weightUsedKg).toBeCloseTo(84.99, 1);
    expect(r.adjustedBodyWeightKg).toBeCloseTo(84.99, 1);
  });

  it('requires height when ideal/adjusted is chosen', () => {
    const r = calculateCrCl(input({ weightBasis: 'ideal', heightCm: null }));
    expect(r.ok).toBe(false);
    expect(r.crclMlMin).toBeNull();
    expect(r.errors.join(' ')).toMatch(/height/i);
  });
});

describe('validation & flags', () => {
  it('reports errors for missing inputs', () => {
    const r = calculateCrCl(input({ age: null, creatinine: null, weightKg: null }));
    expect(r.ok).toBe(false);
    expect(r.crclMlMin).toBeNull();
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('flags a low serum creatinine (may overestimate)', () => {
    expect(calculateCrCl(input({ creatinine: 50 })).flags).toContain('lowCreatinine');
    // mg/dL equivalent (< ~0.68)
    expect(
      calculateCrCl(input({ creatinine: 0.5, creatinineUnit: 'mg/dL' })).flags,
    ).toContain('lowCreatinine');
    expect(calculateCrCl(input({ creatinine: 90 })).flags).not.toContain('lowCreatinine');
  });

  it('flags paediatric age (Cockcroft–Gault not validated)', () => {
    expect(calculateCrCl(input({ age: 10 })).flags).toContain('paediatric');
    expect(calculateCrCl(input({ age: 40 })).flags).not.toContain('paediatric');
  });

  it('exposes the µmol/L ↔ mg/dL conversion constant', () => {
    expect(UMOL_PER_MGDL).toBe(88.4);
  });
});
