import { describe, it, expect } from 'vitest';
import { chadsVasc, orbit, type ChadsVascInput, type OrbitInput } from './riskScores';

function cv(p: Partial<ChadsVascInput>): ChadsVascInput {
  return {
    age: 50,
    sex: 'male',
    chf: false,
    hypertension: false,
    diabetes: false,
    strokeTia: false,
    vascular: false,
    ...p,
  };
}

function ob(p: Partial<OrbitInput>): OrbitInput {
  return {
    age: 50,
    anaemia: false,
    bleeding: false,
    eGFRLow: false,
    antiplatelet: false,
    ...p,
  };
}

describe('CHA₂DS₂-VASc', () => {
  it('scores age bands (mutually exclusive)', () => {
    expect(chadsVasc(cv({ age: 64 })).score).toBe(0);
    expect(chadsVasc(cv({ age: 70 })).score).toBe(1);
    expect(chadsVasc(cv({ age: 80 })).score).toBe(2);
  });

  it('sums risk factors and the stroke 2-pointer', () => {
    const r = chadsVasc(cv({ age: 80, hypertension: true, diabetes: true, strokeTia: true }));
    // age75+ (2) + HTN (1) + DM (1) + stroke (2) = 6
    expect(r.score).toBe(6);
  });

  it('female sex adds a point', () => {
    expect(chadsVasc(cv({ sex: 'female', age: 50 })).score).toBe(1);
  });

  it('NICE thresholds for men: 0 none, 1 consider, ≥2 offer', () => {
    expect(chadsVasc(cv({ age: 50 })).recommendation).toMatch(/not recommended/i);
    expect(chadsVasc(cv({ age: 70 })).recommendation).toMatch(/consider/i);
    expect(chadsVasc(cv({ age: 80 })).recommendation).toMatch(/offer/i);
  });

  it('women with only the sex point are not treated; ≥2 offer', () => {
    expect(chadsVasc(cv({ sex: 'female', age: 50 })).recommendation).toMatch(/not recommended/i);
    expect(chadsVasc(cv({ sex: 'female', age: 70 })).recommendation).toMatch(/offer/i); // sex+age65-74 = 2
  });
});

describe('ORBIT', () => {
  it('older point applies at age ≥75', () => {
    expect(orbit(ob({ age: 74 })).score).toBe(0);
    expect(orbit(ob({ age: 75 })).score).toBe(1);
  });

  it('weights anaemia and bleeding history as 2 points each', () => {
    expect(orbit(ob({ anaemia: true })).score).toBe(2);
    expect(orbit(ob({ bleeding: true })).score).toBe(2);
    expect(orbit(ob({ eGFRLow: true })).score).toBe(1);
    expect(orbit(ob({ antiplatelet: true })).score).toBe(1);
    // max = 1 + 2 + 2 + 1 + 1
    expect(
      orbit(ob({ age: 80, anaemia: true, bleeding: true, eGFRLow: true, antiplatelet: true })).score,
    ).toBe(7);
  });

  it('bands: 0–2 low, 3 medium, ≥4 high', () => {
    expect(orbit(ob({ anaemia: true })).risk).toBe('low'); // 2
    expect(orbit(ob({ anaemia: true, eGFRLow: true })).risk).toBe('medium'); // 3
    expect(orbit(ob({ anaemia: true, bleeding: true })).risk).toBe('high'); // 4
  });

  it('high risk is flagged but not a contraindication', () => {
    const r = orbit(ob({ anaemia: true, bleeding: true }));
    expect(r.recommendation).toMatch(/high bleeding risk/i);
    expect(r.recommendation).toMatch(/not a contraindication/i);
  });
});
