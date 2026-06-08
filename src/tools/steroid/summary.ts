import {
  type SteroidResult,
  type SteroidKey,
  getSteroid,
  ADRENAL_SUPPRESSION_THRESHOLD_MG,
} from './steroidEquiv';

function fmt(mg: number): string {
  // up to 3 significant-ish places, trimming trailing zeros
  return Number(mg.toFixed(3)).toString();
}

export function buildSteroidSummary(fromKey: SteroidKey, dose: number | null, r: SteroidResult): string {
  if (!r.ok || dose == null) return 'Steroid equivalence — enter a dose.';
  const from = getSteroid(fromKey);
  const lines: string[] = [];
  lines.push('Glucocorticoid dose equivalence');
  lines.push('(Conversion aid only — approximate; mineralocorticoid effect & duration differ. No patient identifiers.)');
  lines.push('');
  lines.push(`From: ${from.name} ${fmt(dose)} mg`);
  lines.push(`Prednisolone-equivalent: ${r.prednisoloneEquivalent != null ? fmt(r.prednisoloneEquivalent) : '?'} mg/day`);
  lines.push('');
  lines.push('Equivalent doses:');
  for (const row of r.rows) {
    lines.push(`  ${row.steroid.name}: ${fmt(row.dose)} mg`);
  }
  if (r.adrenalRisk) {
    lines.push('');
    lines.push(
      `! Prednisolone-equivalent ≥ ${ADRENAL_SUPPRESSION_THRESHOLD_MG} mg/day: if continued ≥3–4 weeks, risk of adrenal suppression — do not stop abruptly, apply sick-day rules and issue an NHS Steroid Emergency Card.`,
    );
  }
  return lines.join('\n');
}
