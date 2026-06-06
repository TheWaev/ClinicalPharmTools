/**
 * Pure, UI-decoupled creatinine clearance (CrCl) logic using the
 * Cockcroft–Gault equation. Nothing here touches the DOM or the network.
 *
 *   CrCl (mL/min) = (140 − age) × weight(kg) × (0.85 if female) / (72 × SCr[mg/dL])
 *
 * Serum creatinine entered in µmol/L is converted to mg/dL by dividing by
 * 88.4. (This reproduces the common UK µmol/L constants 1.23 male / 1.04
 * female to within rounding.)
 *
 * This is a calculation aid only — it does not replace clinical judgement.
 */

export type Sex = 'male' | 'female';
export type CreatinineUnit = 'umol/L' | 'mg/dL';
export type WeightBasis = 'actual' | 'ideal' | 'adjusted';

export const UMOL_PER_MGDL = 88.4;

export interface CrClInput {
  age: number | null; // years
  sex: Sex;
  creatinine: number | null;
  creatinineUnit: CreatinineUnit;
  weightKg: number | null; // actual body weight
  heightCm: number | null; // required for ideal / adjusted weight
  weightBasis: WeightBasis;
}

export type CrClFlag =
  | 'lowCreatinine' // low SCr can overestimate CrCl (low muscle mass / elderly)
  | 'paediatric'; // Cockcroft–Gault is not validated in under-18s

export interface CrClResult {
  ok: boolean;
  errors: string[];
  /** The estimate, mL/min. Null when inputs are incomplete/invalid. */
  crclMlMin: number | null;
  /** Weight that fed the equation (per the chosen basis). */
  weightUsedKg: number | null;
  idealBodyWeightKg: number | null;
  adjustedBodyWeightKg: number | null;
  flags: CrClFlag[];
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

const CM_PER_INCH = 2.54;

/** Devine ideal body weight (kg). Needs height in cm. */
export function idealBodyWeightKg(sex: Sex, heightCm: number): number {
  const inchesOver5ft = heightCm / CM_PER_INCH - 60;
  const base = sex === 'male' ? 50 : 45.5;
  return base + 2.3 * inchesOver5ft;
}

/** Adjusted body weight (kg) = IBW + 0.4 × (actual − IBW). */
export function adjustedBodyWeightKg(actualKg: number, idealKg: number): number {
  return idealKg + 0.4 * (actualKg - idealKg);
}

function toMgDl(value: number, unit: CreatinineUnit): number {
  return unit === 'mg/dL' ? value : value / UMOL_PER_MGDL;
}

function toUmol(value: number, unit: CreatinineUnit): number {
  return unit === 'umol/L' ? value : value * UMOL_PER_MGDL;
}

export function calculateCrCl(input: CrClInput): CrClResult {
  const { age, sex, creatinine, creatinineUnit, weightKg, heightCm, weightBasis } = input;
  const errors: string[] = [];

  if (!isPositive(age)) errors.push('Enter the patient’s age.');
  if (!isPositive(creatinine)) errors.push('Enter the serum creatinine.');
  if (!isPositive(weightKg)) errors.push('Enter the patient’s weight.');

  const needsHeight = weightBasis !== 'actual';
  const haveHeight = isPositive(heightCm);
  if (needsHeight && !haveHeight) {
    errors.push('Enter height to use ideal or adjusted body weight.');
  }

  // Derived weights (computed whenever the inputs allow, for display).
  const idealBodyWeightKgValue = haveHeight ? idealBodyWeightKg(sex, heightCm) : null;
  const adjustedBodyWeightKgValue =
    idealBodyWeightKgValue != null && isPositive(weightKg)
      ? adjustedBodyWeightKg(weightKg, idealBodyWeightKgValue)
      : null;

  let weightUsedKg: number | null = null;
  if (weightBasis === 'actual') weightUsedKg = isPositive(weightKg) ? weightKg : null;
  else if (weightBasis === 'ideal') weightUsedKg = idealBodyWeightKgValue;
  else weightUsedKg = adjustedBodyWeightKgValue;

  // Advisory flags (independent of whether the calc completes).
  const flags: CrClFlag[] = [];
  if (isPositive(creatinine) && toUmol(creatinine, creatinineUnit) < 60) {
    flags.push('lowCreatinine');
  }
  if (isPositive(age) && age < 18) flags.push('paediatric');

  const ok =
    errors.length === 0 && isPositive(age) && isPositive(creatinine) && isPositive(weightUsedKg);

  let crclMlMin: number | null = null;
  if (ok) {
    const scrMgDl = toMgDl(creatinine as number, creatinineUnit);
    const sexFactor = sex === 'female' ? 0.85 : 1;
    crclMlMin = ((140 - (age as number)) * (weightUsedKg as number) * sexFactor) / (72 * scrMgDl);
  }

  return {
    ok,
    errors,
    crclMlMin,
    weightUsedKg,
    idealBodyWeightKg: idealBodyWeightKgValue,
    adjustedBodyWeightKg: adjustedBodyWeightKgValue,
    flags,
  };
}
