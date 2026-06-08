import type { ChadsVascResult, OrbitResult } from './riskScores';

export function buildAfSummary(cv: ChadsVascResult, ob: OrbitResult): string {
  const lines: string[] = [];
  lines.push('Atrial fibrillation risk assessment');
  lines.push('(Decision aid only — clinical judgement required. No patient identifiers.)');
  lines.push('');
  lines.push(`CHA₂DS₂-VASc (stroke): ${cv.score}`);
  lines.push(`  ${cv.recommendation}`);
  for (const it of cv.items.filter((i) => i.points > 0)) lines.push(`  + ${it.label} (${it.points})`);
  lines.push('');
  lines.push(`ORBIT (bleeding): ${ob.score} — ${ob.risk} risk`);
  lines.push(`  ${ob.recommendation}`);
  for (const it of ob.items.filter((i) => i.points > 0)) lines.push(`  + ${it.label} (${it.points})`);
  return lines.join('\n');
}
