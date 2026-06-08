#!/usr/bin/env node
/**
 * Regenerates src/tools/qrisk3/townsendBySector.json — a postcode-SECTOR →
 * Townsend deprivation score lookup for QRISK3.
 *
 * The 2011 Townsend data is static, so the JSON is generated once and committed
 * (it does not need the periodic refresh that dm+d does). This script documents
 * provenance and lets the table be rebuilt.
 *
 * Inputs (both Open Government Licence) — download and place in scripts/data/:
 *   1. PCD11_OA11_LSOA11_MSOA11_LAD11_EW_LU_aligned_v2.csv
 *      Postcode → LSOA (Dec 2011, England & Wales), ONS Open Geography Portal.
 *      Columns: PCD7, PCD8, OA11CD, LSOA11CD, LSOA11NM, ...
 *   2. "Scores- 2011 UK LSOA.csv"
 *      2011 UK Townsend Deprivation Scores by LSOA (UK Data Service / JISC,
 *      statistics.digitalresources.jisc.ac.uk/dataset/2011-uk-townsend-deprivation-scores).
 *      Columns: ID, GEO_CODE (LSOA code), GEO_LABEL, TDS, quintile.
 *   (Both are bundled together in FlamingTempura/townsend-score-server's data.7z.)
 *
 * Method: map LSOA code → TDS; for each postcode take its sector key (outward
 * code + first inward digit, no spaces, e.g. "BR1 2AB" → "BR12"); average the
 * TDS of all postcodes in each sector. Coverage is England & Wales.
 *
 * Usage: node scripts/build-townsend.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function sectorKey(postcode) {
  const pc = postcode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (pc.length < 5 || pc.length > 7) return null;
  return pc.slice(0, -2);
}

async function readLines(file, onRow) {
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  let first = true;
  for await (const line of rl) {
    if (first) { first = false; continue; } // header
    if (line.trim() === '') continue;
    onRow(parseCsvLine(line));
  }
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dataDir = path.join(here, 'data');
  const pcdFile = path.join(dataDir, 'PCD11_OA11_LSOA11_MSOA11_LAD11_EW_LU_aligned_v2.csv');
  const tdsFile = path.join(dataDir, 'Scores- 2011 UK LSOA.csv');
  const outFile = path.join(here, '..', 'src', 'tools', 'qrisk3', 'townsendBySector.json');

  for (const f of [pcdFile, tdsFile]) {
    if (!fs.existsSync(f)) {
      console.error(`Missing input: ${f}\nSee the header of this script for the OGL download sources.`);
      process.exit(1);
    }
  }

  const tds = new Map();
  await readLines(tdsFile, (row) => {
    const code = (row[1] || '').trim();
    const score = Number(row[3]);
    if (code && Number.isFinite(score)) tds.set(code, score);
  });
  console.log(`LSOA Townsend scores: ${tds.size}`);

  const agg = new Map(); // sector -> [sum, count]
  let missing = 0;
  await readLines(pcdFile, (row) => {
    if (row.length < 4) return;
    const sector = sectorKey(row[0]);
    if (!sector) return;
    const score = tds.get((row[3] || '').trim());
    if (score == null) { missing++; return; }
    const a = agg.get(sector) || [0, 0];
    a[0] += score; a[1] += 1;
    agg.set(sector, a);
  });

  const out = {};
  for (const [sector, [sum, count]] of [...agg.entries()].sort()) {
    if (count > 0) out[sector] = Math.round((sum / count) * 100) / 100;
  }
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.log(`Sectors: ${Object.keys(out).length} | postcodes with no TDS match: ${missing}`);
  console.log(`Wrote ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
