/**
 * DOAC dosing check for non-valvular atrial fibrillation (stroke prevention).
 * Pure, UI-decoupled, testable. Nothing here touches the DOM or the network.
 *
 * Encodes the licensed (SmPC / BNF) dose-reduction criteria for apixaban,
 * rivaroxaban, edoxaban and dabigatran. Renal thresholds use creatinine
 * clearance (Cockcroft–Gault, mL/min) — NOT eGFR.
 *
 * Scope: AF only (not VTE treatment/prophylaxis, not valvular AF / mechanical
 * valves, where DOACs are contraindicated). Decision aid only — always check
 * the current SmPC/BNF and the full clinical picture.
 */

export type DoacKey = 'apixaban' | 'rivaroxaban' | 'edoxaban' | 'dabigatran';

export const DOAC_LABELS: Record<DoacKey, string> = {
  apixaban: 'Apixaban',
  rivaroxaban: 'Rivaroxaban',
  edoxaban: 'Edoxaban',
  dabigatran: 'Dabigatran',
};

/** Apixaban reduction-criterion thresholds. */
export const APIX_AGE = 80;
export const APIX_WEIGHT = 60; // kg, ≤
export const APIX_CREATININE = 133; // µmol/L, ≥

export interface DoacInput {
  drug: DoacKey;
  age: number | null; // years
  weightKg: number | null;
  crcl: number | null; // mL/min (Cockcroft–Gault)
  creatinineUmol: number | null; // µmol/L (apixaban criterion)
  pgpInhibitor: boolean; // edoxaban: ciclosporin, dronedarone, erythromycin, ketoconazole
  verapamil: boolean; // dabigatran
}

export interface DoacResult {
  ok: boolean;
  errors: string[];
  drugLabel: string;
  /** Recommended dose, e.g. "5 mg twice daily". Null when contraindicated/not assessable. */
  dose: string | null;
  contraindicated: boolean;
  rationale: string[];
  warnings: string[];
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** Fields each drug needs before a recommendation can be made. */
function missingInputs(input: DoacInput): string[] {
  const errors: string[] = [];
  if (!isPositive(input.crcl)) errors.push('Enter the creatinine clearance (CrCl, Cockcroft–Gault).');
  if (input.drug === 'apixaban') {
    if (!isPositive(input.age)) errors.push('Enter the age (for the apixaban reduction criteria).');
    if (!isPositive(input.weightKg)) errors.push('Enter the weight (for the apixaban reduction criteria).');
    if (!isPositive(input.creatinineUmol))
      errors.push('Enter the serum creatinine in µmol/L (for the apixaban reduction criteria).');
  }
  if (input.drug === 'edoxaban' && !isPositive(input.weightKg)) {
    errors.push('Enter the weight (for the edoxaban reduction criteria).');
  }
  if (input.drug === 'dabigatran' && !isPositive(input.age)) {
    errors.push('Enter the age (for the dabigatran reduction criteria).');
  }
  return errors;
}

function apixaban(input: DoacInput): Omit<DoacResult, 'ok' | 'errors' | 'drugLabel'> {
  const crcl = input.crcl as number;
  const rationale: string[] = [];
  const warnings: string[] = [];

  if (crcl < 15) {
    return {
      dose: null,
      contraindicated: true,
      rationale: ['CrCl < 15 mL/min or dialysis — not recommended (insufficient data).'],
      warnings,
    };
  }

  const criteria: string[] = [];
  if (isPositive(input.age) && (input.age as number) >= APIX_AGE) criteria.push('age ≥ 80');
  if (isPositive(input.weightKg) && (input.weightKg as number) <= APIX_WEIGHT) criteria.push('weight ≤ 60 kg');
  if (isPositive(input.creatinineUmol) && (input.creatinineUmol as number) >= APIX_CREATININE)
    criteria.push('serum creatinine ≥ 133 µmol/L');

  if (crcl < 30) {
    warnings.push('CrCl 15–29 mL/min: use 2.5 mg twice daily (use with caution; limited data).');
    return {
      dose: '2.5 mg twice daily',
      contraindicated: false,
      rationale: ['Severe renal impairment (CrCl 15–29 mL/min) → reduced dose.'],
      warnings,
    };
  }

  if (criteria.length >= 2) {
    return {
      dose: '2.5 mg twice daily',
      contraindicated: false,
      rationale: [`≥2 reduction criteria met (${criteria.join(', ')}) → reduced dose.`],
      warnings,
    };
  }

  rationale.push(
    criteria.length === 1
      ? `Only 1 reduction criterion met (${criteria[0]}) — standard dose.`
      : 'No reduction criteria met — standard dose.',
  );
  return { dose: '5 mg twice daily', contraindicated: false, rationale, warnings };
}

function rivaroxaban(input: DoacInput): Omit<DoacResult, 'ok' | 'errors' | 'drugLabel'> {
  const crcl = input.crcl as number;
  if (crcl < 15) {
    return {
      dose: null,
      contraindicated: true,
      rationale: ['CrCl < 15 mL/min — not recommended.'],
      warnings: [],
    };
  }
  if (crcl < 50) {
    return {
      dose: '15 mg once daily (with food)',
      contraindicated: false,
      rationale: ['CrCl 15–49 mL/min → reduced dose.'],
      warnings: [],
    };
  }
  return {
    dose: '20 mg once daily (with food)',
    contraindicated: false,
    rationale: ['CrCl ≥ 50 mL/min → standard dose.'],
    warnings: ['Take with food to maximise absorption.'],
  };
}

function edoxaban(input: DoacInput): Omit<DoacResult, 'ok' | 'errors' | 'drugLabel'> {
  const crcl = input.crcl as number;
  const warnings: string[] = [];
  if (crcl < 15) {
    return {
      dose: null,
      contraindicated: true,
      rationale: ['CrCl < 15 mL/min — not recommended.'],
      warnings,
    };
  }
  if (crcl > 95) {
    warnings.push(
      'CrCl > 95 mL/min: reduced efficacy versus warfarin in AF — use an alternative anticoagulant.',
    );
  }
  const reasons: string[] = [];
  if (crcl <= 50) reasons.push('CrCl 15–50 mL/min');
  if (isPositive(input.weightKg) && (input.weightKg as number) <= 60) reasons.push('weight ≤ 60 kg');
  if (input.pgpInhibitor) reasons.push('concomitant P-gp inhibitor');

  if (reasons.length > 0) {
    return {
      dose: '30 mg once daily',
      contraindicated: false,
      rationale: [`Reduction criterion met (${reasons.join(', ')}) → reduced dose.`],
      warnings,
    };
  }
  return {
    dose: '60 mg once daily',
    contraindicated: false,
    rationale: ['No reduction criteria met → standard dose.'],
    warnings,
  };
}

function dabigatran(input: DoacInput): Omit<DoacResult, 'ok' | 'errors' | 'drugLabel'> {
  const crcl = input.crcl as number;
  const warnings: string[] = [];
  if (crcl < 30) {
    return {
      dose: null,
      contraindicated: true,
      rationale: ['CrCl < 30 mL/min — contraindicated.'],
      warnings,
    };
  }

  const age = input.age as number;
  const reduce: string[] = [];
  if (age >= 80) reduce.push('age ≥ 80');
  if (input.verapamil) reduce.push('concomitant verapamil');

  // "Consider 110 mg" situations (clinical judgement, not automatic).
  const consider: string[] = [];
  if (age >= 75 && age < 80) consider.push('age 75–79');
  if (crcl >= 30 && crcl <= 50) consider.push('CrCl 30–50 mL/min');
  if (consider.length > 0) {
    warnings.push(
      `Consider 110 mg twice daily on clinical judgement if higher bleeding risk (${consider.join(', ')}, gastritis/oesophagitis/reflux).`,
    );
  }

  if (reduce.length > 0) {
    return {
      dose: '110 mg twice daily',
      contraindicated: false,
      rationale: [`Reduced dose indicated (${reduce.join(', ')}).`],
      warnings,
    };
  }
  return {
    dose: '150 mg twice daily',
    contraindicated: false,
    rationale: ['Standard dose (no mandatory reduction criteria).'],
    warnings,
  };
}

export function checkDoacDose(input: DoacInput): DoacResult {
  const drugLabel = DOAC_LABELS[input.drug];
  const errors = missingInputs(input);
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      drugLabel,
      dose: null,
      contraindicated: false,
      rationale: [],
      warnings: [],
    };
  }

  const byDrug = {
    apixaban,
    rivaroxaban,
    edoxaban,
    dabigatran,
  }[input.drug];

  const partial = byDrug(input);
  const warnings = [
    ...partial.warnings,
    'Renal dosing uses CrCl (Cockcroft–Gault), not eGFR. Assess bleeding risk and review periodically.',
  ];
  return { ok: true, errors, drugLabel, ...partial, warnings };
}
