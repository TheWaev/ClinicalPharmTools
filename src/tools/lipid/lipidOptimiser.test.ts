import { describe, it, expect } from 'vitest';
import { statinIntensity, optimiseLipids, type LipidInput } from './lipidOptimiser';

const base: LipidInput = {
  prevention: 'primary',
  qrisk: null,
  ckd: false,
  type1Diabetes: false,
  type2Diabetes: false,
  currentStatin: 'none',
  currentDoseMg: null,
  baselineNonHdl: null,
  currentNonHdl: null,
  currentLdl: null,
};

describe('statinIntensity (NICE NG238 bands)', () => {
  it('classifies atorvastatin', () => {
    expect(statinIntensity('atorvastatin', 10)).toBe('medium');
    expect(statinIntensity('atorvastatin', 20)).toBe('high');
    expect(statinIntensity('atorvastatin', 80)).toBe('high');
  });
  it('classifies rosuvastatin', () => {
    expect(statinIntensity('rosuvastatin', 5)).toBe('medium');
    expect(statinIntensity('rosuvastatin', 10)).toBe('high');
  });
  it('classifies simvastatin', () => {
    expect(statinIntensity('simvastatin', 10)).toBe('low');
    expect(statinIntensity('simvastatin', 40)).toBe('medium');
    expect(statinIntensity('simvastatin', 80)).toBe('high');
  });
  it('classifies pravastatin and fluvastatin', () => {
    expect(statinIntensity('pravastatin', 40)).toBe('low');
    expect(statinIntensity('fluvastatin', 40)).toBe('low');
    expect(statinIntensity('fluvastatin', 80)).toBe('medium');
  });
  it('returns none when no statin or no dose', () => {
    expect(statinIntensity('none', 80)).toBe('none');
    expect(statinIntensity('atorvastatin', null)).toBe('none');
  });
});

describe('optimiseLipids — primary prevention', () => {
  it('indicates a statin when QRISK3 ≥ 10%', () => {
    const r = optimiseLipids({ ...base, qrisk: 12 });
    expect(r.indicated).toBe(true);
    expect(r.recommendedStart).toMatch(/20 mg/);
  });

  it('does not routinely indicate when QRISK3 < 10% and no qualifying condition', () => {
    const r = optimiseLipids({ ...base, qrisk: 7 });
    expect(r.indicated).toBe(false);
  });

  it('indicates regardless of QRISK for a qualifying condition (CKD)', () => {
    const r = optimiseLipids({ ...base, qrisk: 4, ckd: true });
    expect(r.indicated).toBe(true);
    expect(r.indicationReason).toMatch(/Qualifying condition/i);
  });

  it('assesses the >40% non-HDL reduction goal', () => {
    const met = optimiseLipids({ ...base, qrisk: 15, baselineNonHdl: 4.0, currentNonHdl: 2.0 });
    expect(met.percentReduction).toBe(50);
    expect(met.targetMet).toBe(true);

    const notMet = optimiseLipids({ ...base, qrisk: 15, baselineNonHdl: 4.0, currentNonHdl: 3.0 });
    expect(notMet.percentReduction).toBe(25);
    expect(notMet.targetMet).toBe(false);
    expect(notMet.recommendations.some((r) => /ezetimibe/i.test(r))).toBe(true);
  });
});

describe('optimiseLipids — secondary prevention', () => {
  it('always indicates and recommends atorvastatin 80 mg', () => {
    const r = optimiseLipids({ ...base, prevention: 'secondary' });
    expect(r.indicated).toBe(true);
    expect(r.recommendedStart).toMatch(/80 mg/);
  });

  it('recommends up-titration when not on a high-intensity statin', () => {
    const r = optimiseLipids({
      ...base,
      prevention: 'secondary',
      currentStatin: 'simvastatin',
      currentDoseMg: 40,
    });
    expect(r.currentIntensity).toBe('medium');
    expect(r.recommendations.some((x) => /high-intensity/i.test(x))).toBe(true);
  });

  it('assesses the LDL-C ≤2.0 target', () => {
    const met = optimiseLipids({ ...base, prevention: 'secondary', currentLdl: 1.8 });
    expect(met.targetMet).toBe(true);
    const notMet = optimiseLipids({ ...base, prevention: 'secondary', currentLdl: 2.6 });
    expect(notMet.targetMet).toBe(false);
  });

  it('falls back to the non-HDL ≤2.6 target when LDL not supplied', () => {
    const r = optimiseLipids({ ...base, prevention: 'secondary', currentNonHdl: 2.4 });
    expect(r.targetMet).toBe(true);
  });

  it('warns about simvastatin 80 mg', () => {
    const r = optimiseLipids({
      ...base,
      prevention: 'secondary',
      currentStatin: 'simvastatin',
      currentDoseMg: 80,
    });
    expect(r.warnings.some((w) => /myopathy/i.test(w))).toBe(true);
  });
});
