/**
 * Pure eligibility logic for NHS tirzepatide (Mounjaro) weight management,
 * specific to the South East London (SEL) pathway. UI-decoupled and testable;
 * the reference date is injected so the phased criteria are deterministic.
 *
 * ⚠️ Criteria are phased and change over time — verify against the current SEL
 * guidance. Sources are listed in the tool's References section.
 *
 *   Standard cohort (now):      BMI ≥40 (≥37.5 adjusted) AND ≥4 of 5 comorbidities
 *   From 23 Jun 2026 (expanded): BMI ≥35 (≥32.5 adjusted) AND ≥4 of 5 comorbidities
 *   Urgent access:              BMI ≥35 (≥32.5 adjusted) + ≥1 weight-related
 *                               condition + an urgent clinical reason
 *
 * Access route differs by borough: Bromley/Bexley/Greenwich currently REFER to
 * the specialist service (no direct GP prescribing yet); Lambeth/Southwark/
 * Lewisham have a primary-care pathway. All six expected on primary care by
 * summer 2026.
 */

export const COMORBIDITIES = [
  { key: 't2dm', label: 'Type 2 diabetes' },
  { key: 'hypertension', label: 'Hypertension (high blood pressure)' },
  { key: 'dyslipidaemia', label: 'Dyslipidaemia (high cholesterol)' },
  { key: 'osa', label: 'Obstructive sleep apnoea' },
  { key: 'cvd', label: 'Cardiovascular disease' },
] as const;

export type ComorbidityKey = (typeof COMORBIDITIES)[number]['key'];

export const BOROUGHS = [
  { key: 'bromley', label: 'Bromley', primaryCare: false },
  { key: 'bexley', label: 'Bexley', primaryCare: false },
  { key: 'greenwich', label: 'Greenwich', primaryCare: false },
  { key: 'lambeth', label: 'Lambeth', primaryCare: true },
  { key: 'southwark', label: 'Southwark', primaryCare: true },
  { key: 'lewisham', label: 'Lewisham', primaryCare: true },
] as const;

export type Borough = (typeof BOROUGHS)[number]['key'];

/** Date the primary-care cohort expands from BMI ≥40 to BMI ≥35. */
export const EXPANSION_DATE = new Date(2026, 5, 23); // 23 June 2026

export type Phase = 'standard-40' | 'expanded-35';

export interface WeightMgmtInput {
  heightCm: number | null;
  weightKg: number | null;
  /** Optional direct BMI; used if height/weight aren't both given. */
  bmiOverride: number | null;
  /** True for South Asian, Chinese, other Asian, Middle Eastern, Black African or African-Caribbean (lowers thresholds by 2.5). */
  ethnicityAdjusted: boolean;
  comorbidities: Record<ComorbidityKey, boolean>;
  borough: Borough;
  isAdult: boolean;
  /** Pregnant, planning pregnancy or breastfeeding — a contraindication. */
  pregnancyExclusion: boolean;
  // Urgent access factors:
  hasWeightRelatedCondition: boolean;
  urgentReason: boolean;
}

export interface WeightMgmtResult {
  /** Enough information entered to assess. */
  ok: boolean;
  errors: string[];
  bmi: number | null;
  comorbidityCount: number;
  phase: Phase;
  standardBmiThreshold: number;
  urgentBmiThreshold: number;
  eligibleStandard: boolean;
  eligibleUrgent: boolean;
  eligible: boolean;
  excluded: boolean;
  exclusionReasons: string[];
  /** Human-readable explanation of the outcome. */
  reasons: string[];
  /** Borough-specific action when eligible. */
  accessRoute: string | null;
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

export function computeBmi(input: WeightMgmtInput): number | null {
  if (isPositive(input.bmiOverride)) return input.bmiOverride;
  if (isPositive(input.heightCm) && isPositive(input.weightKg)) {
    const m = input.heightCm / 100;
    return input.weightKg / (m * m);
  }
  return null;
}

export function countComorbidities(c: Record<ComorbidityKey, boolean>): number {
  return COMORBIDITIES.reduce((n, { key }) => n + (c[key] ? 1 : 0), 0);
}

function boroughDef(key: Borough) {
  return BOROUGHS.find((b) => b.key === key) ?? BOROUGHS[0];
}

export function calculateEligibility(input: WeightMgmtInput, today: Date): WeightMgmtResult {
  const errors: string[] = [];
  const bmi = computeBmi(input);
  if (bmi == null) errors.push('Enter height and weight (or a BMI) to assess eligibility.');

  const comorbidityCount = countComorbidities(input.comorbidities);

  const expanded = today.getTime() >= EXPANSION_DATE.getTime();
  const phase: Phase = expanded ? 'expanded-35' : 'standard-40';
  const standardBase = expanded ? 35 : 40;
  const adj = input.ethnicityAdjusted ? 2.5 : 0;
  const standardBmiThreshold = standardBase - adj;
  const urgentBmiThreshold = 35 - adj;

  // Hard exclusions take precedence over any eligibility.
  const exclusionReasons: string[] = [];
  if (!input.isAdult) exclusionReasons.push('Licensed for adults (18+) only.');
  if (input.pregnancyExclusion) {
    exclusionReasons.push('Contraindicated in pregnancy, when planning pregnancy, or breastfeeding.');
  }
  const excluded = exclusionReasons.length > 0;

  const ok = bmi != null;

  let eligibleStandard = false;
  let eligibleUrgent = false;
  const reasons: string[] = [];

  if (ok && !excluded) {
    const meetsStandardBmi = (bmi as number) >= standardBmiThreshold;
    const meetsComorbidities = comorbidityCount >= 4;
    eligibleStandard = meetsStandardBmi && meetsComorbidities;

    const meetsUrgentBmi = (bmi as number) >= urgentBmiThreshold;
    eligibleUrgent = meetsUrgentBmi && input.hasWeightRelatedCondition && input.urgentReason;

    reasons.push(
      `BMI ${(bmi as number).toFixed(1)} — ${meetsStandardBmi ? 'meets' : 'below'} the standard threshold of ≥${standardBmiThreshold}${input.ethnicityAdjusted ? ' (ethnicity-adjusted)' : ''}.`,
    );
    reasons.push(
      `${comorbidityCount} of 5 qualifying conditions — ${meetsComorbidities ? 'meets' : 'below'} the ≥4 required.`,
    );

    if (eligibleStandard) {
      reasons.push('Meets the standard cohort criteria for the SEL pathway.');
    } else if (eligibleUrgent) {
      reasons.push('Meets the urgent-access criteria (BMI threshold + a weight-related condition + an urgent clinical reason).');
    } else if (meetsUrgentBmi && !eligibleStandard) {
      reasons.push('Does not meet the standard cohort. If clinically urgent, the urgent-access route may apply — confirm a weight-related condition and an urgent reason.');
    } else {
      reasons.push('Does not currently meet the SEL eligibility criteria.');
    }
  }

  const eligible = ok && !excluded && (eligibleStandard || eligibleUrgent);

  let accessRoute: string | null = null;
  if (eligible) {
    const b = boroughDef(input.borough);
    accessRoute = b.primaryCare
      ? `${b.label}: primary-care pathway — eligible patients are identified and contacted by their GP federation.`
      : `${b.label}: refer to the specialist weight-management service. Direct GP prescribing is not yet available here; primary-care access is expected by summer 2026.`;
  }

  return {
    ok,
    errors,
    bmi,
    comorbidityCount,
    phase,
    standardBmiThreshold,
    urgentBmiThreshold,
    eligibleStandard,
    eligibleUrgent,
    eligible,
    excluded,
    exclusionReasons,
    reasons,
    accessRoute,
  };
}
