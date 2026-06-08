import { describe, it, expect } from 'vitest';
import { checkDoacDose, type DoacInput } from './doacDosing';

const base: DoacInput = {
  drug: 'apixaban',
  age: null,
  weightKg: null,
  crcl: null,
  creatinineUmol: null,
  pgpInhibitor: false,
  verapamil: false,
};

describe('apixaban (AF)', () => {
  it('standard 5 mg BD when no reduction criteria met', () => {
    const r = checkDoacDose({ ...base, drug: 'apixaban', age: 70, weightKg: 80, creatinineUmol: 90, crcl: 80 });
    expect(r.ok).toBe(true);
    expect(r.dose).toBe('5 mg twice daily');
  });

  it('reduces to 2.5 mg BD when ≥2 of age≥80 / weight≤60 / creatinine≥133', () => {
    const r = checkDoacDose({ ...base, drug: 'apixaban', age: 85, weightKg: 55, creatinineUmol: 90, crcl: 70 });
    expect(r.dose).toBe('2.5 mg twice daily');
    expect(r.rationale.join(' ')).toMatch(/2 reduction criteria/i);
  });

  it('stays at 5 mg BD with only one criterion', () => {
    const r = checkDoacDose({ ...base, drug: 'apixaban', age: 85, weightKg: 80, creatinineUmol: 90, crcl: 70 });
    expect(r.dose).toBe('5 mg twice daily');
  });

  it('uses 2.5 mg BD for severe renal impairment (CrCl 15–29)', () => {
    const r = checkDoacDose({ ...base, drug: 'apixaban', age: 70, weightKg: 80, creatinineUmol: 120, crcl: 20 });
    expect(r.dose).toBe('2.5 mg twice daily');
  });

  it('is not recommended below CrCl 15', () => {
    const r = checkDoacDose({ ...base, drug: 'apixaban', age: 70, weightKg: 80, creatinineUmol: 200, crcl: 10 });
    expect(r.contraindicated).toBe(true);
    expect(r.dose).toBeNull();
  });

  it('errors when apixaban-specific inputs are missing', () => {
    const r = checkDoacDose({ ...base, drug: 'apixaban', crcl: 80 });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe('rivaroxaban (AF)', () => {
  it('20 mg OD when CrCl ≥ 50', () => {
    const r = checkDoacDose({ ...base, drug: 'rivaroxaban', crcl: 60 });
    expect(r.dose).toMatch(/^20 mg once daily/);
  });
  it('15 mg OD when CrCl 15–49', () => {
    const r = checkDoacDose({ ...base, drug: 'rivaroxaban', crcl: 40 });
    expect(r.dose).toMatch(/^15 mg once daily/);
  });
  it('not recommended below CrCl 15', () => {
    const r = checkDoacDose({ ...base, drug: 'rivaroxaban', crcl: 12 });
    expect(r.contraindicated).toBe(true);
  });
});

describe('edoxaban (AF)', () => {
  it('60 mg OD when no reduction criteria', () => {
    const r = checkDoacDose({ ...base, drug: 'edoxaban', weightKg: 80, crcl: 80 });
    expect(r.dose).toBe('60 mg once daily');
  });
  it('30 mg OD when CrCl 15–50', () => {
    const r = checkDoacDose({ ...base, drug: 'edoxaban', weightKg: 80, crcl: 40 });
    expect(r.dose).toBe('30 mg once daily');
  });
  it('30 mg OD when weight ≤ 60 kg', () => {
    const r = checkDoacDose({ ...base, drug: 'edoxaban', weightKg: 55, crcl: 80 });
    expect(r.dose).toBe('30 mg once daily');
  });
  it('30 mg OD with a P-gp inhibitor', () => {
    const r = checkDoacDose({ ...base, drug: 'edoxaban', weightKg: 80, crcl: 80, pgpInhibitor: true });
    expect(r.dose).toBe('30 mg once daily');
  });
  it('warns about reduced efficacy when CrCl > 95', () => {
    const r = checkDoacDose({ ...base, drug: 'edoxaban', weightKg: 80, crcl: 110 });
    expect(r.warnings.some((w) => /reduced efficacy/i.test(w))).toBe(true);
  });
});

describe('dabigatran (AF)', () => {
  it('150 mg BD by default', () => {
    const r = checkDoacDose({ ...base, drug: 'dabigatran', age: 65, crcl: 80 });
    expect(r.dose).toBe('150 mg twice daily');
  });
  it('110 mg BD when age ≥ 80', () => {
    const r = checkDoacDose({ ...base, drug: 'dabigatran', age: 82, crcl: 80 });
    expect(r.dose).toBe('110 mg twice daily');
  });
  it('110 mg BD with concomitant verapamil', () => {
    const r = checkDoacDose({ ...base, drug: 'dabigatran', age: 65, crcl: 80, verapamil: true });
    expect(r.dose).toBe('110 mg twice daily');
  });
  it('suggests considering 110 mg for age 75–79 / CrCl 30–50', () => {
    const r = checkDoacDose({ ...base, drug: 'dabigatran', age: 77, crcl: 45 });
    expect(r.dose).toBe('150 mg twice daily');
    expect(r.warnings.some((w) => /Consider 110 mg/i.test(w))).toBe(true);
  });
  it('contraindicated below CrCl 30', () => {
    const r = checkDoacDose({ ...base, drug: 'dabigatran', age: 70, crcl: 25 });
    expect(r.contraindicated).toBe(true);
    expect(r.dose).toBeNull();
  });
});
