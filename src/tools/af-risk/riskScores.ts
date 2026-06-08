/**
 * Pure scoring for atrial-fibrillation stroke risk (CHA₂DS₂-VASc) and bleeding
 * risk (HAS-BLED). UI-decoupled and testable. Decision aid only.
 *
 * Thresholds follow NICE NG196. Note: NG196 now prefers the ORBIT score over
 * HAS-BLED for bleeding risk; HAS-BLED remains widely used and is included here.
 */

export type Sex = 'male' | 'female';

export interface ScoreItem {
  label: string;
  points: number;
}

// ---------- CHA₂DS₂-VASc ----------

export interface ChadsVascInput {
  age: number | null;
  sex: Sex;
  chf: boolean; // congestive heart failure / LV dysfunction
  hypertension: boolean;
  diabetes: boolean;
  strokeTia: boolean; // prior stroke / TIA / thromboembolism (2 points)
  vascular: boolean; // MI, peripheral arterial disease, aortic plaque
}

export interface ChadsVascResult {
  score: number;
  items: ScoreItem[];
  recommendation: string;
}

function agePoints(age: number | null): number {
  if (age == null) return 0;
  if (age >= 75) return 2;
  if (age >= 65) return 1;
  return 0;
}

export function chadsVasc(i: ChadsVascInput): ChadsVascResult {
  const items: ScoreItem[] = [
    { label: 'Congestive heart failure / LV dysfunction', points: i.chf ? 1 : 0 },
    { label: 'Hypertension', points: i.hypertension ? 1 : 0 },
    {
      label: i.age != null && i.age >= 75 ? 'Age ≥75' : i.age != null && i.age >= 65 ? 'Age 65–74' : 'Age',
      points: agePoints(i.age),
    },
    { label: 'Diabetes', points: i.diabetes ? 1 : 0 },
    { label: 'Prior stroke / TIA / thromboembolism', points: i.strokeTia ? 2 : 0 },
    { label: 'Vascular disease', points: i.vascular ? 1 : 0 },
    { label: 'Sex category (female)', points: i.sex === 'female' ? 1 : 0 },
  ];
  const score = items.reduce((s, it) => s + it.points, 0);

  let recommendation: string;
  if (i.sex === 'female') {
    recommendation =
      score >= 2
        ? 'Offer anticoagulation (weigh against bleeding risk).'
        : 'Anticoagulation not recommended on stroke risk alone (sex point only).';
  } else {
    recommendation =
      score >= 2
        ? 'Offer anticoagulation (weigh against bleeding risk).'
        : score === 1
          ? 'Consider anticoagulation (weigh against bleeding risk).'
          : 'Anticoagulation not recommended on stroke risk alone.';
  }

  return { score, items, recommendation };
}

// ---------- ORBIT (bleeding risk; preferred by NICE NG196) ----------

export interface OrbitInput {
  age: number | null; // older = age ≥ 75
  anaemia: boolean; // reduced haemoglobin/haematocrit or history of anaemia (2)
  bleeding: boolean; // prior GI/intracranial bleed or haemorrhagic stroke (2)
  eGFRLow: boolean; // insufficient kidney function, eGFR < 60 (1)
  antiplatelet: boolean; // treatment with an antiplatelet (1)
}

export type OrbitRisk = 'low' | 'medium' | 'high';

export interface OrbitResult {
  score: number;
  items: ScoreItem[];
  risk: OrbitRisk;
  recommendation: string;
}

export function orbit(i: OrbitInput): OrbitResult {
  const items: ScoreItem[] = [
    { label: 'Older (age ≥ 75)', points: i.age != null && i.age >= 75 ? 1 : 0 },
    { label: 'Reduced haemoglobin / anaemia', points: i.anaemia ? 2 : 0 },
    { label: 'Bleeding history', points: i.bleeding ? 2 : 0 },
    { label: 'Insufficient kidney function (eGFR < 60)', points: i.eGFRLow ? 1 : 0 },
    { label: 'Treatment with antiplatelet', points: i.antiplatelet ? 1 : 0 },
  ];
  const score = items.reduce((s, it) => s + it.points, 0);
  const risk: OrbitRisk = score <= 2 ? 'low' : score === 3 ? 'medium' : 'high';
  const recommendation =
    risk === 'high'
      ? 'High bleeding risk (~8.1 major bleeds per 100 patient-years). Address modifiable factors and review regularly — NOT a contraindication to anticoagulation.'
      : risk === 'medium'
        ? 'Medium bleeding risk (~4.7 major bleeds per 100 patient-years). Address modifiable factors.'
        : 'Low bleeding risk (~2.4 major bleeds per 100 patient-years).';
  return { score, items, risk, recommendation };
}
