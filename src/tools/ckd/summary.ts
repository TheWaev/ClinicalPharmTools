import { type CkdResult, type Risk } from './ckdStaging';

const RISK_LABEL: Record<Risk, string> = {
  low: 'Low risk (green)',
  moderate: 'Moderately increased risk (yellow)',
  high: 'High risk (orange)',
  'very-high': 'Very high risk (red)',
};

export function buildCkdSummary(r: CkdResult): string {
  if (!r.ok) return 'CKD classification — inputs incomplete.';
  const lines: string[] = [];
  lines.push('CKD classification (KDIGO) & NICE NG203 referral check');
  lines.push('(Decision aid only — confirm chronicity over >3 months. No patient identifiers.)');
  lines.push('');
  lines.push(`Stage: ${r.stageLabel}`);
  if (r.risk) lines.push(`KDIGO risk: ${RISK_LABEL[r.risk]}`);
  lines.push(`CKD: ${r.ckdPresent ? 'yes' : 'not by these values'} — ${r.ckdNote}`);
  lines.push('');
  if (r.referral) {
    lines.push('Refer to nephrology — reasons:');
    for (const reason of r.referralReasons) lines.push(`  - ${reason}`);
  } else {
    lines.push('No NICE NG203 referral criterion met on these inputs.');
  }
  if (r.recommendations.length) {
    lines.push('');
    lines.push('Management prompts:');
    for (const rec of r.recommendations) lines.push(`  - ${rec}`);
  }
  return lines.join('\n');
}
