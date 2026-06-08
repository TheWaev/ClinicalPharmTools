import { describe, it, expect } from 'vitest';
import {
  calculateEligibility,
  computeBmi,
  countComorbidities,
  type ComorbidityKey,
  type WeightMgmtInput,
} from './eligibilityEngine';

const BEFORE = new Date(2026, 5, 8); // 8 Jun 2026 — standard-40 phase
const AFTER = new Date(2026, 5, 23); // 23 Jun 2026 — expanded-35 phase

function comorb(...keys: ComorbidityKey[]): Record<ComorbidityKey, boolean> {
  return {
    t2dm: keys.includes('t2dm'),
    hypertension: keys.includes('hypertension'),
    dyslipidaemia: keys.includes('dyslipidaemia'),
    osa: keys.includes('osa'),
    cvd: keys.includes('cvd'),
  };
}

function input(partial: Partial<WeightMgmtInput>): WeightMgmtInput {
  return {
    heightCm: 170,
    weightKg: 120, // BMI ~41.5
    bmiOverride: null,
    ethnicityAdjusted: false,
    comorbidities: comorb('t2dm', 'hypertension', 'dyslipidaemia', 'osa'),
    borough: 'bromley',
    isAdult: true,
    pregnancyExclusion: false,
    hasWeightRelatedCondition: false,
    urgentReason: false,
    ...partial,
  };
}

describe('helpers', () => {
  it('computes BMI from height/weight, prefers override', () => {
    expect(computeBmi(input({ heightCm: 170, weightKg: 120, bmiOverride: null }))).toBeCloseTo(41.5, 1);
    expect(computeBmi(input({ bmiOverride: 38 }))).toBe(38);
    expect(computeBmi(input({ heightCm: null, weightKg: null, bmiOverride: null }))).toBeNull();
  });

  it('counts qualifying comorbidities', () => {
    expect(countComorbidities(comorb('t2dm', 'cvd'))).toBe(2);
    expect(countComorbidities(comorb())).toBe(0);
  });
});

describe('standard cohort (current phase, BMI ≥40 + ≥4)', () => {
  it('is eligible with BMI ≥40 and 4 comorbidities', () => {
    const r = calculateEligibility(input({}), BEFORE);
    expect(r.phase).toBe('standard-40');
    expect(r.standardBmiThreshold).toBe(40);
    expect(r.eligibleStandard).toBe(true);
    expect(r.eligible).toBe(true);
  });

  it('is not eligible with only 3 comorbidities', () => {
    const r = calculateEligibility(
      input({ comorbidities: comorb('t2dm', 'hypertension', 'osa') }),
      BEFORE,
    );
    expect(r.eligibleStandard).toBe(false);
    expect(r.eligible).toBe(false);
  });

  it('is not eligible with BMI below 40', () => {
    const r = calculateEligibility(input({ bmiOverride: 38, heightCm: null, weightKg: null }), BEFORE);
    expect(r.eligibleStandard).toBe(false);
  });

  it('applies the ethnicity-adjusted threshold of 37.5', () => {
    const r = calculateEligibility(
      input({ bmiOverride: 38, heightCm: null, weightKg: null, ethnicityAdjusted: true }),
      BEFORE,
    );
    expect(r.standardBmiThreshold).toBe(37.5);
    expect(r.eligibleStandard).toBe(true);
  });
});

describe('expanded phase from 23 Jun 2026 (BMI ≥35 + ≥4)', () => {
  it('makes BMI 36 + 4 comorbidities eligible', () => {
    const r = calculateEligibility(
      input({ bmiOverride: 36, heightCm: null, weightKg: null }),
      AFTER,
    );
    expect(r.phase).toBe('expanded-35');
    expect(r.standardBmiThreshold).toBe(35);
    expect(r.eligibleStandard).toBe(true);
  });

  it('the same patient is NOT eligible before the expansion date', () => {
    const r = calculateEligibility(
      input({ bmiOverride: 36, heightCm: null, weightKg: null }),
      BEFORE,
    );
    expect(r.eligibleStandard).toBe(false);
  });
});

describe('urgent access', () => {
  it('is eligible at BMI ≥35 with a weight-related condition + urgent reason', () => {
    const r = calculateEligibility(
      input({
        bmiOverride: 36,
        heightCm: null,
        weightKg: null,
        comorbidities: comorb('t2dm'), // only 1 — fails standard
        hasWeightRelatedCondition: true,
        urgentReason: true,
      }),
      BEFORE,
    );
    expect(r.eligibleStandard).toBe(false);
    expect(r.eligibleUrgent).toBe(true);
    expect(r.eligible).toBe(true);
  });

  it('needs both the condition and the urgent reason', () => {
    const r = calculateEligibility(
      input({ bmiOverride: 36, heightCm: null, weightKg: null, hasWeightRelatedCondition: true, urgentReason: false }),
      BEFORE,
    );
    expect(r.eligibleUrgent).toBe(false);
  });
});

describe('exclusions', () => {
  it('excludes under-18s regardless of BMI/comorbidities', () => {
    const r = calculateEligibility(input({ isAdult: false }), BEFORE);
    expect(r.excluded).toBe(true);
    expect(r.eligible).toBe(false);
    expect(r.exclusionReasons.join(' ')).toMatch(/adults/i);
  });

  it('excludes pregnancy / breastfeeding', () => {
    const r = calculateEligibility(input({ pregnancyExclusion: true }), BEFORE);
    expect(r.excluded).toBe(true);
    expect(r.eligible).toBe(false);
    expect(r.exclusionReasons.join(' ')).toMatch(/pregnan/i);
  });
});

describe('borough access routing', () => {
  it('Bromley → refer to specialist service', () => {
    const r = calculateEligibility(input({ borough: 'bromley' }), BEFORE);
    expect(r.accessRoute).toMatch(/refer to the specialist/i);
  });

  it('Lewisham → primary-care pathway', () => {
    const r = calculateEligibility(input({ borough: 'lewisham' }), BEFORE);
    expect(r.accessRoute).toMatch(/primary-care pathway/i);
  });

  it('no access route when not eligible', () => {
    const r = calculateEligibility(input({ comorbidities: comorb('t2dm') }), BEFORE);
    expect(r.accessRoute).toBeNull();
  });
});

describe('validation', () => {
  it('flags missing BMI inputs', () => {
    const r = calculateEligibility(input({ heightCm: null, weightKg: null, bmiOverride: null }), BEFORE);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
