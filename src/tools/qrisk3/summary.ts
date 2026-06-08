import { type Qrisk3Input, type Qrisk3Result, ETHNICITIES, SMOKING } from './qrisk3';

function label(list: { value: number; label: string }[], v: number): string {
  return list.find((x) => x.value === v)?.label ?? String(v);
}

export function buildQrisk3Summary(input: Qrisk3Input, r: Qrisk3Result): string {
  if (!r.ok || r.score == null) return 'QRISK3 — inputs incomplete.';
  const lines: string[] = [];
  lines.push('QRISK3-2017 — 10-year cardiovascular risk');
  lines.push('(Decision aid only. Calculated locally — no patient identifiers, no postcode.)');
  lines.push('');
  lines.push(`10-year CVD risk: ${r.score}%`);
  if (r.healthyScore != null)
    lines.push(`Healthy person (same age/sex/ethnicity): ${r.healthyScore}%${r.relativeRisk != null ? ` (≈${r.relativeRisk}× higher)` : ''}`);
  lines.push('');
  lines.push(`Sex: ${input.sex} · Age: ${input.age} · Ethnicity: ${label(ETHNICITIES, input.ethnicity)}`);
  lines.push(`Smoking: ${label(SMOKING, input.smoking)}`);
  if (r.bmiUsed != null) lines.push(`BMI: ${r.bmiUsed.toFixed(1)} kg/m²`);
  lines.push('');
  lines.push(
    r.statinThresholdMet
      ? 'QRISK3 ≥ 10% — discuss a statin (atorvastatin 20 mg) for primary prevention (NICE NG238).'
      : 'QRISK3 < 10% — focus on lifestyle; shared decision-making on statin (NICE NG238).',
  );
  lines.push('');
  lines.push('QRISK®3-2017 algorithm © ClinRisk Ltd (GNU LGPL). Verify against https://qrisk.org.');
  return lines.join('\n');
}
