/**
 * Chronic kidney disease classification (KDIGO GFR/ACR categories) and NICE
 * NG203 referral prompts — pure, UI-decoupled, testable. Nothing here touches
 * the DOM or the network.
 *
 * Classification is based on eGFR (mL/min/1.73 m²) and urine albumin:creatinine
 * ratio (ACR, mg/mmol). CKD requires abnormalities present for >3 months — this
 * tool does not assess chronicity; confirm with repeat testing.
 *
 * Decision aid only — does not replace clinical judgement.
 */

export type GfrCategory = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';
export type AcrCategory = 'A1' | 'A2' | 'A3';
/** KDIGO heat-map: low (green), moderate (yellow), high (orange), very-high (red). */
export type Risk = 'low' | 'moderate' | 'high' | 'very-high';

export interface CkdInput {
  eGFR: number | null; // mL/min/1.73 m²
  acr: number | null; // mg/mmol
  diabetes: boolean;
  haematuria: boolean;
  /** Sustained ↓eGFR ≥25% + category change in 12 months, or ↓≥15 mL/min/1.73 m²/year. */
  acceleratedProgression: boolean;
  /** Poorly controlled BP despite ≥4 antihypertensives at therapeutic doses. */
  resistantHypertension: boolean;
  geneticCause: boolean;
  renalArteryStenosis: boolean;
}

export interface CkdResult {
  ok: boolean;
  errors: string[];
  gfrCategory: GfrCategory | null;
  acrCategory: AcrCategory | null;
  stageLabel: string | null;
  risk: Risk | null;
  ckdPresent: boolean | null;
  ckdNote: string;
  referral: boolean;
  referralReasons: string[];
  recommendations: string[];
}

function isNonNegative(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

export function gfrCategory(eGFR: number): GfrCategory {
  if (eGFR >= 90) return 'G1';
  if (eGFR >= 60) return 'G2';
  if (eGFR >= 45) return 'G3a';
  if (eGFR >= 30) return 'G3b';
  if (eGFR >= 15) return 'G4';
  return 'G5';
}

export function acrCategory(acr: number): AcrCategory {
  if (acr < 3) return 'A1';
  if (acr <= 30) return 'A2';
  return 'A3';
}

const RISK_GRID: Record<GfrCategory, Record<AcrCategory, Risk>> = {
  G1: { A1: 'low', A2: 'moderate', A3: 'high' },
  G2: { A1: 'low', A2: 'moderate', A3: 'high' },
  G3a: { A1: 'moderate', A2: 'high', A3: 'very-high' },
  G3b: { A1: 'high', A2: 'very-high', A3: 'very-high' },
  G4: { A1: 'very-high', A2: 'very-high', A3: 'very-high' },
  G5: { A1: 'very-high', A2: 'very-high', A3: 'very-high' },
};

export function heatMapRisk(g: GfrCategory, a: AcrCategory): Risk {
  return RISK_GRID[g][a];
}

export function classifyCkd(input: CkdInput): CkdResult {
  const { eGFR, acr } = input;
  const errors: string[] = [];
  if (!isNonNegative(eGFR)) errors.push('Enter the eGFR (mL/min/1.73 m²).');
  if (!isNonNegative(acr)) errors.push('Enter the urine ACR (mg/mmol).');

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      gfrCategory: null,
      acrCategory: null,
      stageLabel: null,
      risk: null,
      ckdPresent: null,
      ckdNote: '',
      referral: false,
      referralReasons: [],
      recommendations: [],
    };
  }

  const g = gfrCategory(eGFR as number);
  const a = acrCategory(acr as number);
  const risk = heatMapRisk(g, a);
  const stageLabel = `${g} ${a}`;

  // CKD present? G3a–G5 always; G1/G2 only with a marker of kidney damage.
  const reducedGfr = g !== 'G1' && g !== 'G2';
  const damageMarker = a !== 'A1' || input.haematuria;
  const ckdPresent = reducedGfr || damageMarker;
  let ckdNote: string;
  if (reducedGfr) {
    ckdNote = `eGFR in category ${g} meets the threshold for CKD (confirm it is sustained for >3 months).`;
  } else if (damageMarker) {
    ckdNote = `eGFR is preserved (${g}) but a marker of kidney damage is present (${a !== 'A1' ? `albuminuria ${a}` : 'haematuria'}) — classified as CKD if persistent for >3 months.`;
  } else {
    ckdNote = `eGFR ${g} with ${a} and no other markers — does not meet the definition of CKD.`;
  }

  // NICE NG203 referral prompts.
  const referralReasons: string[] = [];
  if ((eGFR as number) < 30) {
    referralReasons.push('eGFR < 30 mL/min/1.73 m² (GFR category G4 or G5).');
  }
  if ((acr as number) >= 70 && !input.diabetes) {
    referralReasons.push('ACR ≥ 70 mg/mmol.');
  } else if ((acr as number) >= 70 && input.diabetes) {
    referralReasons.push('ACR ≥ 70 mg/mmol — refer unless caused by diabetes and already optimally treated.');
  }
  if ((acr as number) >= 30 && input.haematuria) {
    referralReasons.push('ACR ≥ 30 mg/mmol (A3) with haematuria.');
  }
  if (input.acceleratedProgression) {
    referralReasons.push('Accelerated progression (sustained fall in eGFR).');
  }
  if (input.resistantHypertension) {
    referralReasons.push('Hypertension poorly controlled despite ≥ 4 antihypertensives.');
  }
  if (input.geneticCause) {
    referralReasons.push('Known or suspected rare/genetic cause of CKD.');
  }
  if (input.renalArteryStenosis) {
    referralReasons.push('Suspected renal artery stenosis.');
  }
  const referral = referralReasons.length > 0;

  // General management prompts (NG203).
  const recommendations: string[] = [];
  if (ckdPresent) {
    if ((acr as number) >= 30 || (input.diabetes && (acr as number) >= 3)) {
      recommendations.push(
        'Offer an ACE inhibitor or ARB, titrated to the maximum tolerated dose (ACR ≥30, or ≥3 with diabetes/hypertension).',
      );
    }
    recommendations.push(
      'Consider an SGLT2 inhibitor per NG203 (e.g. with type 2 diabetes, or ACR ≥22.6 mg/mmol).',
    );
    recommendations.push('Optimise blood pressure and cardiovascular risk (offer atorvastatin 20 mg).');
    recommendations.push('Review and avoid nephrotoxic drugs; consider sick-day guidance.');
    recommendations.push('Consider the 4-variable Kidney Failure Risk Equation (refer if 5-year risk ≥ 5%).');
  }

  return {
    ok: true,
    errors,
    gfrCategory: g,
    acrCategory: a,
    stageLabel,
    risk,
    ckdPresent,
    ckdNote,
    referral,
    referralReasons,
    recommendations,
  };
}
