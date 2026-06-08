import { type DoacResult } from './doacDosing';

export function buildDoacSummary(r: DoacResult): string {
  if (!r.ok) return `${r.drugLabel} dose check — inputs incomplete.`;
  const lines: string[] = [];
  lines.push(`DOAC dose check — ${r.drugLabel} (non-valvular AF)`);
  lines.push('(Decision aid only — check current SmPC/BNF. Renal dosing uses CrCl. No patient identifiers.)');
  lines.push('');
  if (r.contraindicated) {
    lines.push('Recommendation: NOT recommended / contraindicated.');
  } else {
    lines.push(`Recommended dose: ${r.dose}`);
  }
  for (const reason of r.rationale) lines.push(`  ${reason}`);
  if (r.warnings.length) {
    lines.push('');
    for (const w of r.warnings) lines.push(`! ${w}`);
  }
  return lines.join('\n');
}
