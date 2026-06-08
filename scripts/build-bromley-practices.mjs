#!/usr/bin/env node
/**
 * Pulls Bromley PCNs and their member GP practices from the NHS Organisation
 * Data Service (ODS / ORD API) and writes src/auth/bromleyPractices.json.
 *
 * Source of truth: ODS. Each Bromley PCN is listed by code; member practices
 * are the organisations that "IS PARTNER TO" (relationship RE8) that PCN and
 * are currently Active. Re-run to refresh:  npm run build:practices
 *
 * No key required — the ORD API is public reference data. This runs at build
 * time only; the app bundles the committed JSON (no runtime ODS calls).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ORD = 'https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations';

// Bromley sub-ICB (72Q) PCN ODS codes, verified via the ORD API.
const PCNS = [
  { name: 'Beckenham PCN', code: 'U36188' },
  { name: 'Bromley Connect PCN', code: 'U43112' },
  { name: 'Crays Collaborative PCN', code: 'U50277' },
  { name: 'Five Elms PCN', code: 'U77447' },
  { name: 'Hayes Wick PCN', code: 'U98580' },
  { name: 'Mottingham, Downham & Chislehurst PCN', code: 'U03551' },
  { name: 'Orpington PCN', code: 'U87524' },
  { name: 'Penge PCN', code: 'U76778' },
];

const titleCase = (s) =>
  s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bPcn\b/g, 'PCN');

async function membersOf(code) {
  const url = `${ORD}?RelTypeId=RE8&TargetOrgId=${code}&RelStatus=Active&Limit=200`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ODS request failed for ${code}: ${res.status}`);
  const data = await res.json();
  return [
    ...new Set(
      (data.Organisations ?? [])
        .filter((o) => o.Status === 'Active')
        .map((o) => titleCase(o.Name)),
    ),
  ].sort();
}

async function main() {
  const pcns = [];
  for (const { name, code } of PCNS) {
    const practices = await membersOf(code);
    console.log(`[practices] ${name}: ${practices.length}`);
    pcns.push({ name, code, practices });
  }
  pcns.sort((a, b) => a.name.localeCompare(b.name));

  const out = {
    source: 'NHS ODS (ORD API) — Bromley sub-ICB (72Q) PCNs and RE8 member practices',
    pcns,
  };
  const file = fileURLToPath(new URL('../src/auth/bromleyPractices.json', import.meta.url));
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  const total = pcns.reduce((n, p) => n + p.practices.length, 0);
  console.log(`[practices] Wrote ${pcns.length} PCNs, ${total} practices to ${file}`);
}

main().catch((err) => {
  console.error('[practices] FAILED:', err.message);
  process.exit(1);
});
