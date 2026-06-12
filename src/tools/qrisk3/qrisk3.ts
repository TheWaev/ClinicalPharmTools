/**
 * QRISK3-2017 — 10-year cardiovascular risk. Pure, UI-decoupled, testable.
 * Nothing here touches the DOM or the network.
 *
 * This is a faithful transcription of the open-source QRISK3-2017 algorithm
 * published by ClinRisk Ltd. under the GNU LGPL (https://qrisk.org). The two
 * raw model functions below reproduce the C coefficients exactly; the engine is
 * validated against the 48 reference cases shipped with the CRAN `QRISK3`
 * package (original C-algorithm scores) to 1 decimal place — see qrisk3.test.ts.
 *
 * ClinRisk disclaimer (must accompany any displayed score): this code
 * implements QRISK3-2017 faithfully, but it is the end user's responsibility to
 * confirm it reproduces the original at https://qrisk.org. Inaccurate
 * implementations can lead to the wrong treatment. Decision aid only.
 *
 * IG note: postcode is NOT used. Townsend deprivation is an optional numeric
 * input (default 0 ≈ average), so no patient-identifiable data is entered.
 */

export type QSex = 'female' | 'male';

/** QRISK3 ethnicity categories (index into the model's ethnicity array). */
export const ETHNICITIES: { value: number; label: string }[] = [
  { value: 1, label: 'White or not stated' },
  { value: 2, label: 'Indian' },
  { value: 3, label: 'Pakistani' },
  { value: 4, label: 'Bangladeshi' },
  { value: 5, label: 'Other Asian' },
  { value: 6, label: 'Black Caribbean' },
  { value: 7, label: 'Black African' },
  { value: 8, label: 'Chinese' },
  { value: 9, label: 'Other ethnic group' },
];

/** Smoking categories. */
export const SMOKING: { value: number; label: string }[] = [
  { value: 0, label: 'Non-smoker' },
  { value: 1, label: 'Ex-smoker' },
  { value: 2, label: 'Light smoker (<10/day)' },
  { value: 3, label: 'Moderate smoker (10–19/day)' },
  { value: 4, label: 'Heavy smoker (≥20/day)' },
];

/** Population means used to centre the continuous variables (per the model). */
const MEAN = {
  female: { bmi: 10 / Math.sqrt(0.154946178197861), rati: 3.476326465606690, sbp: 123.130012512207030, sbps5: 9.002537727355957 },
  male: { bmi: 10 / Math.sqrt(0.149176135659218), rati: 4.300998687744141, sbp: 128.571578979492190, sbps5: 8.756621360778809 },
};

export interface RawInput {
  age: number;
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
  bmi: number;
  ethrisk: number;
  fh_cvd: number;
  rati: number;
  sbp: number;
  sbps5: number;
  smoke_cat: number;
  town: number;
}

/** Faithful port of cvd_female_raw (QRISK3-2017, ClinRisk LGPL). 10-year survivor. */
export function cvdFemaleRaw(i: RawInput): number {
  const survivor10 = 0.988876402378082;
  const Iethrisk = [
    0, 0,
    0.2804031433299542500000000,
    0.5629899414207539800000000,
    0.2959000085111651600000000,
    0.0727853798779825450000000,
    -0.1707213550885731700000000,
    -0.3937104331487497100000000,
    -0.3263249528353027200000000,
    -0.1712705688324178400000000,
  ];
  const Ismoke = [
    0,
    0.1338683378654626200000000,
    0.5620085801243853700000000,
    0.6674959337750254700000000,
    0.8494817764483084700000000,
  ];

  let dage = i.age / 10;
  let age_1 = Math.pow(dage, -2);
  let age_2 = dage;
  let dbmi = i.bmi / 10;
  let bmi_1 = Math.pow(dbmi, -2);
  let bmi_2 = Math.pow(dbmi, -2) * Math.log(dbmi);

  age_1 = age_1 - 0.053274843841791;
  age_2 = age_2 - 4.332503318786621;
  bmi_1 = bmi_1 - 0.154946178197861;
  bmi_2 = bmi_2 - 0.144462317228317;
  let rati = i.rati - 3.476326465606690;
  let sbp = i.sbp - 123.130012512207030;
  let sbps5 = i.sbps5 - 9.002537727355957;
  let town = i.town - 0.392308831214905;

  let a = 0;
  a += Iethrisk[i.ethrisk];
  a += Ismoke[i.smoke_cat];

  a += age_1 * -8.1388109247726188000000000;
  a += age_2 * 0.7973337668969909800000000;
  a += bmi_1 * 0.2923609227546005200000000;
  a += bmi_2 * -4.1513300213837665000000000;
  a += rati * 0.1533803582080255400000000;
  a += sbp * 0.0131314884071034240000000;
  a += sbps5 * 0.0078894541014586095000000;
  a += town * 0.0772237905885901080000000;

  a += i.b_AF * 1.5923354969269663000000000;
  a += i.b_atypicalantipsy * 0.2523764207011555700000000;
  a += i.b_corticosteroids * 0.5952072530460185100000000;
  a += i.b_migraine * 0.3012672608703450000000000;
  a += i.b_ra * 0.2136480343518194200000000;
  a += i.b_renal * 0.6519456949384583300000000;
  a += i.b_semi * 0.1255530805882017800000000;
  a += i.b_sle * 0.7588093865426769300000000;
  a += i.b_treatedhyp * 0.5093159368342300400000000;
  a += i.b_type1 * 1.7267977510537347000000000;
  a += i.b_type2 * 1.0688773244615468000000000;
  a += i.fh_cvd * 0.4544531902089621300000000;

  a += age_1 * (i.smoke_cat === 1 ? 1 : 0) * -4.7057161785851891000000000;
  a += age_1 * (i.smoke_cat === 2 ? 1 : 0) * -2.7430383403573337000000000;
  a += age_1 * (i.smoke_cat === 3 ? 1 : 0) * -0.8660808882939218200000000;
  a += age_1 * (i.smoke_cat === 4 ? 1 : 0) * 0.9024156236971064800000000;
  a += age_1 * i.b_AF * 19.9380348895465610000000000;
  a += age_1 * i.b_corticosteroids * -0.9840804523593628100000000;
  a += age_1 * i.b_migraine * 1.7634979587872999000000000;
  a += age_1 * i.b_renal * -3.5874047731694114000000000;
  a += age_1 * i.b_sle * 19.6903037386382920000000000;
  a += age_1 * i.b_treatedhyp * 11.8728097339218120000000000;
  a += age_1 * i.b_type1 * -1.2444332714320747000000000;
  a += age_1 * i.b_type2 * 6.8652342000009599000000000;
  a += age_1 * bmi_1 * 23.8026234121417420000000000;
  a += age_1 * bmi_2 * -71.1849476920870070000000000;
  a += age_1 * i.fh_cvd * 0.9946780794043512700000000;
  a += age_1 * sbp * 0.0341318423386154850000000;
  a += age_1 * town * -1.0301180802035639000000000;
  a += age_2 * (i.smoke_cat === 1 ? 1 : 0) * -0.0755892446431930260000000;
  a += age_2 * (i.smoke_cat === 2 ? 1 : 0) * -0.1195119287486707400000000;
  a += age_2 * (i.smoke_cat === 3 ? 1 : 0) * -0.1036630639757192300000000;
  a += age_2 * (i.smoke_cat === 4 ? 1 : 0) * -0.1399185359171838900000000;
  a += age_2 * i.b_AF * -0.0761826510111625050000000;
  a += age_2 * i.b_corticosteroids * -0.1200536494674247200000000;
  a += age_2 * i.b_migraine * -0.0655869178986998590000000;
  a += age_2 * i.b_renal * -0.2268887308644250700000000;
  a += age_2 * i.b_sle * 0.0773479496790162730000000;
  a += age_2 * i.b_treatedhyp * 0.0009685782358817443600000;
  a += age_2 * i.b_type1 * -0.2872406462448894900000000;
  a += age_2 * i.b_type2 * -0.0971122525906954890000000;
  a += age_2 * bmi_1 * 0.5236995893366442900000000;
  a += age_2 * bmi_2 * 0.0457441901223237590000000;
  a += age_2 * i.fh_cvd * -0.0768850516984230380000000;
  a += age_2 * sbp * -0.0015082501423272358000000;
  a += age_2 * town * -0.0315934146749623290000000;

  return 100.0 * (1 - Math.pow(survivor10, Math.exp(a)));
}

/** Faithful port of cvd_male_raw (QRISK3-2017, ClinRisk LGPL). 10-year survivor. */
export function cvdMaleRaw(i: RawInput): number {
  const survivor10 = 0.977268040180206;
  const Iethrisk = [
    0, 0,
    0.2771924876030827900000000,
    0.4744636071493126800000000,
    0.5296172991968937100000000,
    0.0351001591862990170000000,
    -0.3580789966932791900000000,
    -0.4005648523216514000000000,
    -0.4152279288983017300000000,
    -0.2632134813474996700000000,
  ];
  const Ismoke = [
    0,
    0.1912822286338898300000000,
    0.5524158819264555200000000,
    0.6383505302750607200000000,
    0.7898381988185801900000000,
  ];

  let dage = i.age / 10;
  let age_1 = Math.pow(dage, -1);
  let age_2 = Math.pow(dage, 3);
  let dbmi = i.bmi / 10;
  let bmi_2 = Math.pow(dbmi, -2) * Math.log(dbmi);
  let bmi_1 = Math.pow(dbmi, -2);

  age_1 = age_1 - 0.234766781330109;
  age_2 = age_2 - 77.284080505371094;
  bmi_1 = bmi_1 - 0.149176135659218;
  bmi_2 = bmi_2 - 0.141913309693336;
  let rati = i.rati - 4.300998687744141;
  let sbp = i.sbp - 128.571578979492190;
  let sbps5 = i.sbps5 - 8.756621360778809;
  let town = i.town - 0.526304900646210;

  let a = 0;
  a += Iethrisk[i.ethrisk];
  a += Ismoke[i.smoke_cat];

  a += age_1 * -17.8397816660055750000000000;
  a += age_2 * 0.0022964880605765492000000;
  a += bmi_1 * 2.4562776660536358000000000;
  a += bmi_2 * -8.3011122314711354000000000;
  a += rati * 0.1734019685632711100000000;
  a += sbp * 0.0129101265425533050000000;
  a += sbps5 * 0.0102519142912904560000000;
  a += town * 0.0332682012772872950000000;

  a += i.b_AF * 0.8820923692805465700000000;
  a += i.b_atypicalantipsy * 0.1304687985517351300000000;
  a += i.b_corticosteroids * 0.4548539975044554300000000;
  a += i.b_impotence2 * 0.2225185908670538300000000;
  a += i.b_migraine * 0.2558417807415991300000000;
  a += i.b_ra * 0.2097065801395656700000000;
  a += i.b_renal * 0.7185326128827438400000000;
  a += i.b_semi * 0.1213303988204716400000000;
  a += i.b_sle * 0.4401572174457522000000000;
  a += i.b_treatedhyp * 0.5165987108269547400000000;
  a += i.b_type1 * 1.2343425521675175000000000;
  a += i.b_type2 * 0.8594207143093222100000000;
  a += i.fh_cvd * 0.5405546900939015600000000;

  a += age_1 * (i.smoke_cat === 1 ? 1 : 0) * -0.2101113393351634600000000;
  a += age_1 * (i.smoke_cat === 2 ? 1 : 0) * 0.7526867644750319100000000;
  a += age_1 * (i.smoke_cat === 3 ? 1 : 0) * 0.9931588755640579100000000;
  a += age_1 * (i.smoke_cat === 4 ? 1 : 0) * 2.1331163414389076000000000;
  a += age_1 * i.b_AF * 3.4896675530623207000000000;
  a += age_1 * i.b_corticosteroids * 1.1708133653489108000000000;
  a += age_1 * i.b_impotence2 * -1.5064009857454310000000000;
  a += age_1 * i.b_migraine * 2.3491159871402441000000000;
  a += age_1 * i.b_renal * -0.5065671632722369400000000;
  a += age_1 * i.b_treatedhyp * 6.5114581098532671000000000;
  a += age_1 * i.b_type1 * 5.3379864878006531000000000;
  a += age_1 * i.b_type2 * 3.6461817406221311000000000;
  a += age_1 * bmi_1 * 31.0049529560338860000000000;
  a += age_1 * bmi_2 * -111.2915718439164300000000000;
  a += age_1 * i.fh_cvd * 2.7808628508531887000000000;
  a += age_1 * sbp * 0.0188585244698658530000000;
  a += age_1 * town * -0.1007554870063731000000000;
  a += age_2 * (i.smoke_cat === 1 ? 1 : 0) * -0.0004985487027532612100000;
  a += age_2 * (i.smoke_cat === 2 ? 1 : 0) * -0.0007987563331738541400000;
  a += age_2 * (i.smoke_cat === 3 ? 1 : 0) * -0.0008370618426625129600000;
  a += age_2 * (i.smoke_cat === 4 ? 1 : 0) * -0.0007840031915563728900000;
  a += age_2 * i.b_AF * -0.0003499560834063604900000;
  a += age_2 * i.b_corticosteroids * -0.0002496045095297166000000;
  a += age_2 * i.b_impotence2 * -0.0011058218441227373000000;
  a += age_2 * i.b_migraine * 0.0001989644604147863100000;
  a += age_2 * i.b_renal * -0.0018325930166498813000000;
  a += age_2 * i.b_treatedhyp * 0.0006383805310416501300000;
  a += age_2 * i.b_type1 * 0.0006409780808752897000000;
  a += age_2 * i.b_type2 * -0.0002469569558886831500000;
  a += age_2 * bmi_1 * 0.0050380102356322029000000;
  a += age_2 * bmi_2 * -0.0130744830025243190000000;
  a += age_2 * i.fh_cvd * -0.0002479180990739603700000;
  a += age_2 * sbp * -0.0000127187419158845700000;
  a += age_2 * town * -0.0000932996423232728880000;

  return 100.0 * (1 - Math.pow(survivor10, Math.exp(a)));
}

export interface Qrisk3Input {
  sex: QSex;
  age: number | null; // 25–84
  ethnicity: number; // 1–9
  smoking: number; // 0–4
  /** Either supply bmi directly, or height+weight to derive it. Null → population mean. */
  heightCm: number | null;
  weightKg: number | null;
  /** Total:HDL cholesterol ratio. Null → population mean. */
  cholRatio: number | null;
  sbp: number | null; // mean systolic BP; null → population mean
  sbpSd: number | null; // SD of ≥2 systolic readings; null → population mean
  townsend: number | null; // deprivation score; null → 0 (≈ average)
  af: boolean;
  atypicalAntipsychotic: boolean;
  corticosteroids: boolean;
  erectileDysfunction: boolean; // males only
  migraine: boolean;
  rheumatoidArthritis: boolean;
  ckd: boolean; // CKD stage 3, 4 or 5
  severeMentalIllness: boolean;
  sle: boolean;
  treatedHypertension: boolean;
  type1Diabetes: boolean;
  type2Diabetes: boolean;
  familyHistoryCvd: boolean; // angina/MI in 1st-degree relative <60
}

export interface Qrisk3Result {
  ok: boolean;
  errors: string[];
  /** 10-year CVD risk (%), rounded to 1 dp. */
  score: number | null;
  /** Risk of a healthy person of the same age/sex/ethnicity (%), for context. */
  healthyScore: number | null;
  /** score / healthyScore, rounded to 1 dp. */
  relativeRisk: number | null;
  bmiUsed: number | null;
  /** NICE NG238: ≥10% → consider a statin (atorvastatin 20 mg). */
  statinThresholdMet: boolean | null;
}

function b(v: boolean): number {
  return v ? 1 : 0;
}

function buildRaw(input: Qrisk3Input): RawInput {
  const m = MEAN[input.sex];
  const bmiDerived =
    input.heightCm && input.weightKg && input.heightCm > 0
      ? input.weightKg / (input.heightCm / 100) ** 2
      : null;
  return {
    age: input.age as number,
    b_AF: b(input.af),
    b_atypicalantipsy: b(input.atypicalAntipsychotic),
    b_corticosteroids: b(input.corticosteroids),
    b_impotence2: input.sex === 'male' ? b(input.erectileDysfunction) : 0,
    b_migraine: b(input.migraine),
    b_ra: b(input.rheumatoidArthritis),
    b_renal: b(input.ckd),
    b_semi: b(input.severeMentalIllness),
    b_sle: b(input.sle),
    b_treatedhyp: b(input.treatedHypertension),
    b_type1: b(input.type1Diabetes),
    b_type2: b(input.type2Diabetes),
    bmi: bmiDerived ?? m.bmi,
    ethrisk: input.ethnicity,
    fh_cvd: b(input.familyHistoryCvd),
    rati: input.cholRatio ?? m.rati,
    sbp: input.sbp ?? m.sbp,
    // QRISK3 treats a blank SBP standard deviation as 0 (no measured
    // variability) — NOT the population mean. Matches the official calculator.
    sbps5: input.sbpSd ?? 0,
    smoke_cat: input.smoking,
    town: input.townsend ?? 0,
  };
}

function rawScore(sex: QSex, raw: RawInput): number {
  return sex === 'female' ? cvdFemaleRaw(raw) : cvdMaleRaw(raw);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function qrisk3(input: Qrisk3Input): Qrisk3Result {
  const errors: string[] = [];
  if (input.age == null) errors.push('Enter the patient’s age.');
  else if (input.age < 25 || input.age > 84) errors.push('QRISK3 is only valid for ages 25–84.');
  if (!input.ethnicity) errors.push('Select an ethnicity.');

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      score: null,
      healthyScore: null,
      relativeRisk: null,
      bmiUsed: null,
      statinThresholdMet: null,
    };
  }

  const raw = buildRaw(input);
  const score = round1(rawScore(input.sex, raw));

  // "Healthy person" reference, as defined by the official calculator: same
  // age/sex/ethnicity, no clinical conditions, never-smoker, cholesterol ratio
  // 4.0, a stable systolic BP of 125 (SD 0), BMI 25 and average deprivation.
  const healthyRaw: RawInput = {
    age: input.age as number,
    b_AF: 0, b_atypicalantipsy: 0, b_corticosteroids: 0, b_impotence2: 0, b_migraine: 0,
    b_ra: 0, b_renal: 0, b_semi: 0, b_sle: 0, b_treatedhyp: 0, b_type1: 0, b_type2: 0,
    bmi: 25, ethrisk: input.ethnicity, fh_cvd: 0, rati: 4, sbp: 125, sbps5: 0,
    smoke_cat: 0, town: 0,
  };
  const healthyScore = round1(rawScore(input.sex, healthyRaw));
  const relativeRisk = healthyScore > 0 ? round1(score / healthyScore) : null;

  return {
    ok: true,
    errors,
    score,
    healthyScore,
    relativeRisk,
    bmiUsed: raw.bmi,
    statinThresholdMet: score >= 10,
  };
}
