import { describe, it, expect } from 'vitest';
import { cvdFemaleRaw, cvdMaleRaw, qrisk3, type RawInput, type Qrisk3Input } from './qrisk3';
import vectors from './referenceVectors.json';

/**
 * Gold-standard validation: every case below carries the score produced by the
 * ORIGINAL QRISK3-2017 C algorithm (shipped with the CRAN `QRISK3` package).
 * Our port must reproduce each to 1 decimal place. In this dataset gender is
 * coded 1 = female, 0 = male.
 */
type Vector = {
  ID: number;
  QRISK_C_algorithm_score: number;
  gender: number;
  age: number;
  bmi: number;
  weight: number;
  height: number;
  ethrisk: number;
  fh_cvd: number;
  rati: number;
  sbp: number;
  sbps5: number;
  smoke_cat: number;
  town: number;
  b_AF: number;
  b_atypicalantipsy: number;
  b_corticosteroids: number;
  b_impotence2: number;
  b_migraine: number;
  b_ra: number;
  b_renal: number;
  b_semi: number;
  b_sle: number;
  b_treatedhyp: number;
  b_type1: number;
  b_type2: number;
};

function toRaw(v: Vector): RawInput {
  return {
    age: v.age,
    b_AF: v.b_AF,
    b_atypicalantipsy: v.b_atypicalantipsy,
    b_corticosteroids: v.b_corticosteroids,
    b_impotence2: v.b_impotence2,
    b_migraine: v.b_migraine,
    b_ra: v.b_ra,
    b_renal: v.b_renal,
    b_semi: v.b_semi,
    b_sle: v.b_sle,
    b_treatedhyp: v.b_treatedhyp,
    b_type1: v.b_type1,
    b_type2: v.b_type2,
    // Derive BMI from weight/height (the reference scores do this; the cached
    // `bmi` column in the dataset is stale for rows where height/weight vary).
    bmi: v.weight / (v.height / 100) ** 2,
    ethrisk: v.ethrisk,
    fh_cvd: v.fh_cvd,
    rati: v.rati,
    sbp: v.sbp,
    sbps5: v.sbps5,
    // The CRAN package codes smoking 1-based (1 = non-smoker); the QRISK3
    // algorithm (and this engine) is 0-based (0 = non-smoker), so shift by one.
    smoke_cat: v.smoke_cat - 1,
    town: v.town,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

describe('QRISK3-2017 raw models vs original C algorithm (48 cases)', () => {
  const cases = vectors as Vector[];
  it('reproduces all 48 reference scores to 1 dp', () => {
    const mismatches: string[] = [];
    for (const v of cases) {
      const raw = toRaw(v);
      const got = round1(v.gender === 1 ? cvdFemaleRaw(raw) : cvdMaleRaw(raw));
      if (got !== v.QRISK_C_algorithm_score) {
        mismatches.push(`ID ${v.ID}: got ${got}, expected ${v.QRISK_C_algorithm_score}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('covers both sexes', () => {
    expect(cases.filter((v) => v.gender === 1).length).toBeGreaterThan(0);
    expect(cases.filter((v) => v.gender === 0).length).toBeGreaterThan(0);
  });
});

const baseInput: Qrisk3Input = {
  sex: 'male',
  age: 64,
  ethnicity: 1,
  smoking: 0,
  heightCm: null,
  weightKg: null,
  cholRatio: null,
  sbp: null,
  sbpSd: null,
  townsend: null,
  af: false,
  atypicalAntipsychotic: false,
  corticosteroids: false,
  erectileDysfunction: false,
  migraine: false,
  rheumatoidArthritis: false,
  ckd: false,
  severeMentalIllness: false,
  sle: false,
  treatedHypertension: false,
  type1Diabetes: false,
  type2Diabetes: false,
  familyHistoryCvd: false,
};

describe('qrisk3 public wrapper', () => {
  it('derives BMI from height + weight', () => {
    const r = qrisk3({ ...baseInput, heightCm: 178, weightKg: 80 });
    expect(r.ok).toBe(true);
    expect(r.bmiUsed).toBeCloseTo(80 / 1.78 ** 2, 3);
  });

  it('rejects ages outside 25–84', () => {
    expect(qrisk3({ ...baseInput, age: 20 }).ok).toBe(false);
    expect(qrisk3({ ...baseInput, age: 90 }).ok).toBe(false);
    expect(qrisk3({ ...baseInput, age: null }).ok).toBe(false);
  });

  it('flags the NICE 10% statin threshold', () => {
    const high = qrisk3({ ...baseInput, age: 75, smoking: 4, type2Diabetes: true });
    expect(high.score).not.toBeNull();
    expect(high.statinThresholdMet).toBe(high.score! >= 10);
  });

  it('risk rises with added risk factors', () => {
    const low = qrisk3({ ...baseInput });
    const high = qrisk3({ ...baseInput, smoking: 4, af: true, type2Diabetes: true });
    expect(high.score!).toBeGreaterThan(low.score!);
  });

  it('reports a healthy-reference comparison', () => {
    const r = qrisk3({ ...baseInput, smoking: 4 });
    expect(r.healthyScore).not.toBeNull();
    expect(r.relativeRisk).not.toBeNull();
    expect(r.relativeRisk!).toBeGreaterThan(1);
  });

  it('ignores erectile dysfunction for females', () => {
    const f1 = qrisk3({ ...baseInput, sex: 'female', erectileDysfunction: false });
    const f2 = qrisk3({ ...baseInput, sex: 'female', erectileDysfunction: true });
    expect(f1.score).toBe(f2.score);
  });

  it('treats a blank SBP standard deviation as 0 (matches qrisk.org)', () => {
    // A blank SBP-SD must mean "no measured variability" (0), not the mean.
    const blank = qrisk3({ ...baseInput, sbpSd: null });
    const zero = qrisk3({ ...baseInput, sbpSd: 0 });
    expect(blank.score).toBe(zero.score);
  });

  it('reproduces a real qrisk.org case (no postcode)', () => {
    // Female 56, White, light smoker, 166 cm / 84 kg, chol ratio 1.9, SBP 140,
    // SBP-SD blank, AF + treated hypertension, no deprivation → qrisk.org = 17.8%,
    // healthy person 3.6%.
    const r = qrisk3({
      ...baseInput,
      sex: 'female',
      age: 56,
      ethnicity: 1,
      smoking: 2,
      heightCm: 166,
      weightKg: 84,
      cholRatio: 1.9,
      sbp: 140,
      sbpSd: null,
      townsend: null,
      af: true,
      treatedHypertension: true,
    });
    expect(r.score).toBe(17.8);
    expect(r.healthyScore).toBe(3.6);
  });
});

describe('qrisk3 public pipeline vs original C algorithm (end-to-end, 48 cases)', () => {
  // Drives the whole UI-facing wrapper — sex routing, BMI derived from
  // height/weight, the 0-based smoking mapping, sbp/Townsend handling and
  // rounding — and checks it reproduces every reference score to 1 dp.
  it('reproduces all 48 reference scores through qrisk3()', () => {
    const mismatches: string[] = [];
    for (const v of vectors as Vector[]) {
      const r = qrisk3({
        sex: v.gender === 1 ? 'female' : 'male',
        age: v.age,
        ethnicity: v.ethrisk,
        smoking: v.smoke_cat - 1, // dataset is 1-based; engine/UI are 0-based
        heightCm: v.height,
        weightKg: v.weight,
        cholRatio: v.rati,
        sbp: v.sbp,
        sbpSd: v.sbps5,
        townsend: v.town,
        af: !!v.b_AF,
        treatedHypertension: !!v.b_treatedhyp,
        type1Diabetes: !!v.b_type1,
        type2Diabetes: !!v.b_type2,
        ckd: !!v.b_renal,
        rheumatoidArthritis: !!v.b_ra,
        sle: !!v.b_sle,
        migraine: !!v.b_migraine,
        severeMentalIllness: !!v.b_semi,
        atypicalAntipsychotic: !!v.b_atypicalantipsy,
        corticosteroids: !!v.b_corticosteroids,
        erectileDysfunction: !!v.b_impotence2,
        familyHistoryCvd: !!v.fh_cvd,
      });
      if (r.score !== v.QRISK_C_algorithm_score) {
        mismatches.push(`ID ${v.ID}: got ${r.score}, expected ${v.QRISK_C_algorithm_score}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});
