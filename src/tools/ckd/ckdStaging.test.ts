import { describe, it, expect } from 'vitest';
import {
  gfrCategory,
  acrCategory,
  heatMapRisk,
  classifyCkd,
  type CkdInput,
} from './ckdStaging';

const base: CkdInput = {
  eGFR: null,
  acr: null,
  diabetes: false,
  haematuria: false,
  acceleratedProgression: false,
  resistantHypertension: false,
  geneticCause: false,
  renalArteryStenosis: false,
};

describe('GFR categories', () => {
  it('maps eGFR to KDIGO categories at the boundaries', () => {
    expect(gfrCategory(95)).toBe('G1');
    expect(gfrCategory(90)).toBe('G1');
    expect(gfrCategory(89)).toBe('G2');
    expect(gfrCategory(60)).toBe('G2');
    expect(gfrCategory(59)).toBe('G3a');
    expect(gfrCategory(45)).toBe('G3a');
    expect(gfrCategory(44)).toBe('G3b');
    expect(gfrCategory(30)).toBe('G3b');
    expect(gfrCategory(29)).toBe('G4');
    expect(gfrCategory(15)).toBe('G4');
    expect(gfrCategory(14)).toBe('G5');
  });
});

describe('ACR categories', () => {
  it('maps ACR to A1/A2/A3', () => {
    expect(acrCategory(2)).toBe('A1');
    expect(acrCategory(3)).toBe('A2');
    expect(acrCategory(30)).toBe('A2');
    expect(acrCategory(31)).toBe('A3');
    expect(acrCategory(70)).toBe('A3');
  });
});

describe('KDIGO heat-map risk', () => {
  it('returns the expected risk colours', () => {
    expect(heatMapRisk('G1', 'A1')).toBe('low');
    expect(heatMapRisk('G2', 'A2')).toBe('moderate');
    expect(heatMapRisk('G3a', 'A1')).toBe('moderate');
    expect(heatMapRisk('G3a', 'A3')).toBe('very-high');
    expect(heatMapRisk('G3b', 'A1')).toBe('high');
    expect(heatMapRisk('G4', 'A1')).toBe('very-high');
  });
});

describe('classifyCkd', () => {
  it('labels the combined stage and risk', () => {
    const r = classifyCkd({ ...base, eGFR: 50, acr: 10 });
    expect(r.stageLabel).toBe('G3a A2');
    expect(r.risk).toBe('high');
    expect(r.ckdPresent).toBe(true);
  });

  it('does not classify preserved eGFR + A1 + no markers as CKD', () => {
    const r = classifyCkd({ ...base, eGFR: 95, acr: 1 });
    expect(r.ckdPresent).toBe(false);
    expect(r.ckdNote).toMatch(/does not meet/i);
  });

  it('classifies preserved eGFR as CKD when albuminuria present', () => {
    const r = classifyCkd({ ...base, eGFR: 95, acr: 5 });
    expect(r.gfrCategory).toBe('G1');
    expect(r.acrCategory).toBe('A2');
    expect(r.ckdPresent).toBe(true);
  });

  it('flags referral for eGFR < 30', () => {
    const r = classifyCkd({ ...base, eGFR: 25, acr: 1 });
    expect(r.referral).toBe(true);
    expect(r.referralReasons.some((x) => /eGFR < 30/.test(x))).toBe(true);
  });

  it('flags referral for ACR ≥ 70', () => {
    const r = classifyCkd({ ...base, eGFR: 65, acr: 80 });
    expect(r.referralReasons.some((x) => /ACR ≥ 70/.test(x))).toBe(true);
  });

  it('adds the diabetes caveat to the ACR ≥70 reason', () => {
    const r = classifyCkd({ ...base, eGFR: 65, acr: 80, diabetes: true });
    expect(r.referralReasons.some((x) => /caused by diabetes/i.test(x))).toBe(true);
  });

  it('flags referral for A3 with haematuria', () => {
    const r = classifyCkd({ ...base, eGFR: 65, acr: 40, haematuria: true });
    expect(r.referralReasons.some((x) => /haematuria/i.test(x))).toBe(true);
  });

  it('does not refer a low-risk result', () => {
    const r = classifyCkd({ ...base, eGFR: 80, acr: 1 });
    expect(r.referral).toBe(false);
  });

  it('reports input errors when values are missing', () => {
    const r = classifyCkd({ ...base });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBe(2);
  });
});
