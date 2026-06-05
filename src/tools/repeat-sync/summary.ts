import type { MedResult, SyncResult, SyncSettings, SyncMode } from './syncEngine';

const MODE_LABELS: Record<SyncMode, string> = {
  catchUp: 'Catch up to longest supply',
  wholeCycle: 'Round up to a whole cycle',
  targetDate: 'Sync to a specific date',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function flagNote(m: MedResult): string {
  if (m.flags.includes('excluded')) return ' — not calculated (variable/PRN)';
  if (m.flags.includes('invalidDose')) return ' — not calculated (missing/invalid daily dose)';
  if (m.flags.includes('missingQuantity')) return ' — not calculated (missing quantity)';
  if (m.flags.includes('alreadySupplied')) return ' — already supplied beyond sync date';
  return '';
}

/**
 * Plain-text summary suitable for pasting into a clinical record or message
 * (PRD §6.4). Deliberately free of any patient identifiers.
 */
export function buildSummaryText(result: SyncResult, settings: SyncSettings): string {
  const lines: string[] = [];
  lines.push('Repeat medication synchronisation summary');
  lines.push('(Calculation aid only — clinical review required. No patient identifiers.)');
  lines.push('');
  lines.push(`Mode: ${MODE_LABELS[settings.mode]}`);
  lines.push(`Default cycle length: ${settings.defaultCycleLength} days`);

  if (result.canCalculate && result.horizonDays != null && result.syncRunOutDate) {
    lines.push(`Synchronisation horizon: ${result.horizonDays} days from today`);
    lines.push(`Synchronised run-out date: ${formatDate(result.syncRunOutDate)}`);
  } else {
    lines.push('Synchronisation horizon: not calculated');
    for (const e of result.errors) lines.push(`! ${e}`);
  }

  lines.push('');
  lines.push('Per medication:');
  for (const m of result.meds) {
    if (m.included && m.bridgingQty != null) {
      lines.push(
        `- ${m.name}: bridge now ${m.bridgingQty}, then ${m.ongoingQty} per cycle ` +
          `(currently ~${Math.floor(m.daysRemaining ?? 0)} days’ supply)`,
      );
    } else {
      lines.push(`- ${m.name}${flagNote(m)}`);
    }
  }

  return lines.join('\n');
}
