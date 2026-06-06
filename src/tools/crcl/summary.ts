import type { CrClInput, CrClResult, WeightBasis } from './crclEngine';

const BASIS_LABEL: Record<WeightBasis, string> = {
  actual: 'actual body weight',
  ideal: 'ideal body weight (Devine)',
  adjusted: 'adjusted body weight',
};

function flagNote(flag: string): string {
  if (flag === 'lowCreatinine')
    return 'Low serum creatinine may overestimate CrCl (low muscle mass / elderly).';
  if (flag === 'paediatric') return 'Cockcroft–Gault is not validated in under-18s.';
  return flag;
}

/** Plain-text summary for pasting into a record (no patient identifiers). */
export function buildCrClSummary(input: CrClInput, result: CrClResult): string {
  const lines: string[] = [];
  lines.push('Creatinine clearance (Cockcroft–Gault) estimate');
  lines.push('(Calculation aid only — clinical review required. No patient identifiers.)');
  lines.push('');
  lines.push(`Age: ${input.age ?? '—'} years`);
  lines.push(`Sex: ${input.sex}`);
  lines.push(`Serum creatinine: ${input.creatinine ?? '—'} ${input.creatinineUnit}`);
  lines.push(`Weight basis: ${BASIS_LABEL[input.weightBasis]}`);
  if (result.weightUsedKg != null) {
    lines.push(`Weight used: ${result.weightUsedKg.toFixed(1)} kg`);
  }

  lines.push('');
  if (result.ok && result.crclMlMin != null) {
    lines.push(`Estimated CrCl: ${result.crclMlMin.toFixed(0)} mL/min`);
  } else {
    lines.push('Estimated CrCl: not calculated');
    for (const e of result.errors) lines.push(`! ${e}`);
  }

  for (const f of result.flags) lines.push(`Note: ${flagNote(f)}`);

  return lines.join('\n');
}
