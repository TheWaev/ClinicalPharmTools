/**
 * Lipid / statin optimisation aid — pure, UI-decoupled, testable.
 * Nothing here touches the DOM or the network.
 *
 * Encodes NICE NG238 (CVD risk assessment & lipid modification, 2023) plus the
 * NHS England lipid optimisation pathway:
 *   - Statin intensity bands by % reduction in LDL-C.
 *   - Primary prevention: atorvastatin 20 mg if QRISK3 ≥10% (or qualifying
 *     condition); aim for >40% reduction in non-HDL cholesterol at 2–3 months.
 *   - Secondary prevention (established CVD): atorvastatin 80 mg; treatment
 *     target LDL-C ≤2.0 mmol/L or non-HDL-C ≤2.6 mmol/L.
 *
 * Decision aid only — it does not replace clinical judgement, and does not
 * cover familial hypercholesterolaemia targets or specialist therapies in full.
 */

export type Prevention = 'primary' | 'secondary';
export type StatinKey =
  | 'none'
  | 'atorvastatin'
  | 'rosuvastatin'
  | 'simvastatin'
  | 'pravastatin'
  | 'fluvastatin';
export type Intensity = 'none' | 'low' | 'medium' | 'high';

export const QRISK_THRESHOLD = 10; // % 10-year CVD risk
export const PRIMARY_REDUCTION_TARGET = 40; // % reduction in non-HDL
export const SECONDARY_NONHDL_TARGET = 2.6; // mmol/L
export const SECONDARY_LDL_TARGET = 2.0; // mmol/L

export const STATIN_LABELS: Record<StatinKey, string> = {
  none: 'Not currently on a statin',
  atorvastatin: 'Atorvastatin',
  rosuvastatin: 'Rosuvastatin',
  simvastatin: 'Simvastatin',
  pravastatin: 'Pravastatin',
  fluvastatin: 'Fluvastatin',
};

/** Map a statin + daily dose (mg) to its NICE NG238 intensity band. */
export function statinIntensity(statin: StatinKey, dose: number | null): Intensity {
  if (statin === 'none' || dose == null || dose <= 0) return 'none';
  switch (statin) {
    case 'atorvastatin':
      return dose >= 20 ? 'high' : 'medium'; // 10 mg medium; 20–80 mg high
    case 'rosuvastatin':
      return dose >= 10 ? 'high' : 'medium'; // 5 mg medium; 10–40 mg high
    case 'simvastatin':
      if (dose >= 80) return 'high'; // 80 mg high but not recommended (myopathy)
      if (dose >= 20) return 'medium'; // 20–40 mg medium
      return 'low'; // 10 mg low
    case 'pravastatin':
      return 'low'; // 10–40 mg low
    case 'fluvastatin':
      return dose >= 80 ? 'medium' : 'low'; // 80 mg medium; 20–40 mg low
    default:
      return 'none';
  }
}

export interface LipidInput {
  prevention: Prevention;
  /** Primary prevention only — 10-year QRISK3 (%). */
  qrisk: number | null;
  /** Primary-prevention qualifying conditions (statin offered regardless of QRISK). */
  ckd: boolean;
  type1Diabetes: boolean;
  type2Diabetes: boolean;
  currentStatin: StatinKey;
  currentDoseMg: number | null;
  /** Optional response monitoring (mmol/L). */
  baselineNonHdl: number | null;
  currentNonHdl: number | null;
  /** Optional current LDL-C (mmol/L) — used for the secondary-prevention target. */
  currentLdl: number | null;
}

export interface LipidResult {
  /** Whether lipid-lowering therapy is indicated. */
  indicated: boolean;
  indicationReason: string;
  recommendedStart: string;
  currentIntensity: Intensity;
  /** % reduction in non-HDL from baseline, when both values are supplied. */
  percentReduction: number | null;
  /** Whether the relevant target / response is met (null when not assessable). */
  targetMet: boolean | null;
  targetAssessment: string;
  recommendations: string[];
  warnings: string[];
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function optimiseLipids(input: LipidInput): LipidResult {
  const {
    prevention,
    qrisk,
    ckd,
    type1Diabetes,
    type2Diabetes,
    currentStatin,
    currentDoseMg,
    baselineNonHdl,
    currentNonHdl,
    currentLdl,
  } = input;

  const currentIntensity = statinIntensity(currentStatin, currentDoseMg);
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (currentStatin === 'simvastatin' && (currentDoseMg ?? 0) >= 80) {
    warnings.push(
      'Simvastatin 80 mg carries an increased risk of myopathy and is generally not recommended — consider switching to atorvastatin.',
    );
  }

  // --- Indication ---
  let indicated: boolean;
  let indicationReason: string;
  let recommendedStart: string;

  if (prevention === 'secondary') {
    indicated = true;
    indicationReason = 'Established CVD — secondary prevention is indicated.';
    recommendedStart = 'Atorvastatin 80 mg once daily (high intensity).';
  } else {
    const qualifying = ckd || type1Diabetes || type2Diabetes;
    const qriskHigh = qrisk != null && qrisk >= QRISK_THRESHOLD;
    indicated = qualifying || qriskHigh;
    if (qualifying && !qriskHigh) {
      indicationReason =
        'Qualifying condition (CKD / type 1 or type 2 diabetes) — offer a statin irrespective of QRISK3.';
    } else if (qriskHigh) {
      indicationReason = `QRISK3 ${qrisk}% ≥ ${QRISK_THRESHOLD}% — offer atorvastatin for primary prevention.`;
    } else if (qrisk != null) {
      indicationReason = `QRISK3 ${qrisk}% is below ${QRISK_THRESHOLD}% and no qualifying condition — focus on lifestyle; statin not routinely indicated (use shared decision-making).`;
    } else {
      indicationReason =
        'Enter QRISK3 or a qualifying condition to assess whether a statin is indicated.';
    }
    recommendedStart = 'Atorvastatin 20 mg once daily.';
  }

  // --- Response / target assessment ---
  let percentReduction: number | null = null;
  let targetMet: boolean | null = null;
  let targetAssessment: string;

  if (prevention === 'primary') {
    if (baselineNonHdl != null && currentNonHdl != null && baselineNonHdl > 0) {
      percentReduction = round(((baselineNonHdl - currentNonHdl) / baselineNonHdl) * 100);
      targetMet = percentReduction >= PRIMARY_REDUCTION_TARGET;
      targetAssessment = targetMet
        ? `Non-HDL reduced by ${percentReduction}% — meets the >${PRIMARY_REDUCTION_TARGET}% goal at 2–3 months.`
        : `Non-HDL reduced by ${percentReduction}% — below the >${PRIMARY_REDUCTION_TARGET}% goal. Check adherence and lifestyle, then consider increasing the dose.`;
    } else {
      targetAssessment = `Goal: >${PRIMARY_REDUCTION_TARGET}% reduction in non-HDL cholesterol at 2–3 months (enter baseline and current non-HDL to assess).`;
    }
  } else {
    if (currentLdl != null) {
      targetMet = currentLdl <= SECONDARY_LDL_TARGET;
      targetAssessment = targetMet
        ? `LDL-C ${currentLdl} mmol/L — at or below the ≤${SECONDARY_LDL_TARGET} mmol/L target.`
        : `LDL-C ${currentLdl} mmol/L — above the ≤${SECONDARY_LDL_TARGET} mmol/L target.`;
    } else if (currentNonHdl != null) {
      targetMet = currentNonHdl <= SECONDARY_NONHDL_TARGET;
      targetAssessment = targetMet
        ? `Non-HDL ${currentNonHdl} mmol/L — at or below the ≤${SECONDARY_NONHDL_TARGET} mmol/L target.`
        : `Non-HDL ${currentNonHdl} mmol/L — above the ≤${SECONDARY_NONHDL_TARGET} mmol/L target.`;
    } else {
      targetAssessment = `Target: LDL-C ≤${SECONDARY_LDL_TARGET} mmol/L or non-HDL-C ≤${SECONDARY_NONHDL_TARGET} mmol/L (enter a current value to assess).`;
    }
    if (baselineNonHdl != null && currentNonHdl != null && baselineNonHdl > 0) {
      percentReduction = round(((baselineNonHdl - currentNonHdl) / baselineNonHdl) * 100);
    }
  }

  // --- Next-step recommendations ---
  if (indicated) {
    if (prevention === 'secondary' && currentIntensity !== 'high') {
      recommendations.push(
        currentStatin === 'none'
          ? 'Start atorvastatin 80 mg (high intensity).'
          : 'Up-titrate to a high-intensity statin (e.g. atorvastatin 80 mg).',
      );
    }
    if (prevention === 'primary' && currentStatin === 'none') {
      recommendations.push('Start atorvastatin 20 mg.');
    }
    if (targetMet === false) {
      if (currentIntensity !== 'high' && !(prevention === 'secondary')) {
        recommendations.push('Target not met — optimise to a higher-intensity statin if tolerated.');
      }
      recommendations.push(
        'If the target is still not met on a maximally tolerated statin, add ezetimibe 10 mg and escalate per the NHS England lipid optimisation pathway (e.g. bempedoic acid, PCSK9 inhibitor / inclisiran).',
      );
    }
    if (targetMet === true) {
      recommendations.push('Target met — continue and review per local recall.');
    }
  }

  return {
    indicated,
    indicationReason,
    recommendedStart,
    currentIntensity,
    percentReduction,
    targetMet,
    targetAssessment,
    recommendations,
    warnings,
  };
}
