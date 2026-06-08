import { describe, it, expect } from 'vitest';
import { totalOme, convertOmeTo, HIGH_DOSE_OME } from './opioidConvert';

describe('oral morphine equivalent (OME)', () => {
  it('codeine 240 mg/day ≈ 24 mg OME', () => {
    expect(totalOme([{ key: 'codeine', dose: 240 }]).totalOme).toBeCloseTo(24, 5);
  });

  it('oral oxycodone 30 mg/day ≈ 45 mg OME (×1.5)', () => {
    expect(totalOme([{ key: 'oxycodone_oral', dose: 30 }]).totalOme).toBeCloseTo(45, 5);
  });

  it('fentanyl 25 microgram/h patch ≈ 60 mg OME', () => {
    expect(totalOme([{ key: 'fentanyl_patch', dose: 25 }]).totalOme).toBeCloseTo(60, 5);
  });

  it('sums multiple opioids', () => {
    const r = totalOme([
      { key: 'morphine_oral', dose: 30 },
      { key: 'oxycodone_oral', dose: 20 }, // 30
    ]);
    expect(r.totalOme).toBeCloseTo(60, 5);
    expect(r.contributions).toHaveLength(2);
  });

  it('ignores blank/zero/unknown rows', () => {
    expect(totalOme([{ key: 'codeine', dose: null }, { key: 'nope', dose: 10 }]).totalOme).toBe(0);
  });

  it('flags high dose at ≥120 mg OME/day', () => {
    expect(totalOme([{ key: 'morphine_oral', dose: 119 }]).highDose).toBe(false);
    expect(totalOme([{ key: 'morphine_oral', dose: 120 }]).highDose).toBe(true);
    expect(HIGH_DOSE_OME).toBe(120);
  });
});

describe('convert OME to a target opioid (with cross-tolerance reduction)', () => {
  it('60 mg OME → oral oxycodone 40 mg, reduced 20–30 mg', () => {
    const c = convertOmeTo(60, 'oxycodone_oral')!;
    expect(c.equivalent).toBeCloseTo(40, 5); // 60 / 1.5
    expect(c.reducedLow).toBeCloseTo(20, 5); // 50% reduction
    expect(c.reducedHigh).toBeCloseTo(30, 5); // 25% reduction
    expect(c.unit).toBe('mg/day');
  });

  it('returns a mcg/h unit for patch targets', () => {
    expect(convertOmeTo(60, 'fentanyl_patch')!.unit).toBe('mcg/h');
  });
});
