import { type LipidResult, type LipidInput, STATIN_LABELS } from './lipidOptimiser';

const INTENSITY_LABEL: Record<LipidResult['currentIntensity'], string> = {
  none: 'none',
  low: 'low intensity',
  medium: 'medium intensity',
  high: 'high intensity',
};

export function buildLipidSummary(input: LipidInput, r: LipidResult): string {
  const lines: string[] = [];
  lines.push('Lipid / statin optimisation');
  lines.push('(Decision aid only — NICE NG238 / NHSE lipid pathway. No patient identifiers.)');
  lines.push('');
  lines.push(`Indication: ${input.prevention === 'secondary' ? 'secondary prevention (established CVD)' : 'primary prevention'}`);
  lines.push(`  ${r.indicationReason}`);
  lines.push('');
  if (input.currentStatin !== 'none') {
    lines.push(
      `Current therapy: ${STATIN_LABELS[input.currentStatin]} ${input.currentDoseMg ?? '?'} mg — ${INTENSITY_LABEL[r.currentIntensity]}`,
    );
  } else {
    lines.push('Current therapy: not on a statin');
  }
  lines.push(`Recommended start/optimise: ${r.recommendedStart}`);
  lines.push('');
  lines.push(`Response/target: ${r.targetAssessment}`);
  if (r.percentReduction != null) lines.push(`  Non-HDL reduction: ${r.percentReduction}%`);
  if (r.recommendations.length) {
    lines.push('');
    lines.push('Next steps:');
    for (const rec of r.recommendations) lines.push(`  - ${rec}`);
  }
  if (r.warnings.length) {
    lines.push('');
    for (const w of r.warnings) lines.push(`! ${w}`);
  }
  return lines.join('\n');
}
