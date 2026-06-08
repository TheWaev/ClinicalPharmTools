import {
  BOROUGHS,
  COMORBIDITIES,
  type WeightMgmtInput,
  type WeightMgmtResult,
} from './eligibilityEngine';

export function buildWeightMgmtSummary(
  input: WeightMgmtInput,
  result: WeightMgmtResult,
): string {
  const lines: string[] = [];
  lines.push('Tirzepatide (Mounjaro) weight-management eligibility — South East London');
  lines.push('(Decision aid only — verify against current SEL guidance. No patient identifiers.)');
  lines.push('');

  if (result.bmi != null) lines.push(`BMI: ${result.bmi.toFixed(1)}`);
  if (input.ethnicityAdjusted) lines.push('Ethnicity-adjusted BMI thresholds applied.');

  const present = COMORBIDITIES.filter((c) => input.comorbidities[c.key]).map((c) => c.label);
  lines.push(`Qualifying conditions (${result.comorbidityCount}/5): ${present.join(', ') || 'none'}`);

  const borough = BOROUGHS.find((b) => b.key === input.borough);
  lines.push(`Borough: ${borough?.label ?? input.borough}`);
  lines.push(`Active phase: ${result.phase === 'expanded-35' ? 'BMI ≥35 + ≥4 conditions' : 'BMI ≥40 + ≥4 conditions'}`);
  lines.push('');

  if (!result.ok) {
    lines.push('Outcome: not assessed (missing inputs)');
    for (const e of result.errors) lines.push(`! ${e}`);
    return lines.join('\n');
  }

  if (result.excluded) {
    lines.push('Outcome: NOT ELIGIBLE (excluded)');
    for (const r of result.exclusionReasons) lines.push(`- ${r}`);
  } else if (result.eligible) {
    lines.push('Outcome: MEETS ELIGIBILITY CRITERIA');
    if (result.accessRoute) lines.push(`Action: ${result.accessRoute}`);
    lines.push('Requires the mandatory 9-month lifestyle / wraparound support programme.');
  } else {
    lines.push('Outcome: does not currently meet criteria');
  }

  lines.push('');
  lines.push('Reasoning:');
  for (const r of result.reasons) lines.push(`- ${r}`);

  return lines.join('\n');
}
