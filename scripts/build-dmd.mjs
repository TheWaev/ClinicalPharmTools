#!/usr/bin/env node
/**
 * Build-time ingestion of the NHS dm+d (Dictionary of Medicines and Devices)
 * into a slim JSON the app bundles for medication-name autocomplete + pack-size
 * hints.
 *
 * Why build-time: the PRD requires the app to be fully client-side with NO
 * runtime network calls and no embedded secrets (a public static site). So we
 * fetch dm+d here, in dev or CI, and bundle only a derived subset (PRD §7-§8).
 *
 * Scope: we read only the VIRTUAL products — VMP (generic names) and VMPP
 * (generic pack sizes). We deliberately ignore the ACTUAL/branded products
 * (AMP/AMPP), which the clinical team does not need.
 *
 * Usage:
 *   TRUD_API_KEY=xxxxxxxx npm run build:dmd
 *
 * With no TRUD_API_KEY set, this no-ops (exit 0) and the committed sample
 * data/dmd.json is used instead — so `npm run build` always works.
 *
 * TRUD facts (verified June 2026):
 *   - dm+d is TRUD item 24. You need a free TRUD account, must subscribe to the
 *     item, and get an API key.
 *   - The "API" lists/downloads release files; it is not a per-drug lookup.
 *   - Endpoint: GET /trud/api/v1/keys/{API_KEY}/items/24/releases?latest
 *
 * The parser is intentionally robust: it deep-searches the parsed XML for the
 * VMP/VMPP records by shape rather than assuming an exact element path, and it
 * keeps SNOMED ids (VPID) as STRINGS — they are 17+ digits and would lose
 * precision as JS numbers, breaking the VMP↔VMPP join. The parsing logic is
 * unit-tested in build-dmd.test.mjs.
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

export const TRUD_API_BASE = 'https://isd.digital.nhs.uk/trud/api/v1';
export const DMD_ITEM = 24;

// Keep VPID/QTYVAL as strings — see note above about SNOMED id precision.
export const xmlParser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });

/** Find one extracted XML by file-name substrings. */
export function findXml(xmls, includes, excludes = []) {
  return xmls.find(
    (x) =>
      includes.every((i) => x.name.includes(i)) &&
      excludes.every((e) => !x.name.includes(e)),
  );
}

/** Recursively collect every .xml entry, descending into nested .zip entries. */
export function collectXml(zipBuffer) {
  const out = [];
  const zip = new AdmZip(zipBuffer);
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.toLowerCase();
    const buf = entry.getData();
    if (name.endsWith('.zip')) out.push(...collectXml(buf));
    else if (name.endsWith('.xml')) out.push({ name, data: buf });
  }
  return out;
}

/** Collect every object in a parsed tree that matches `predicate` (records are leaves). */
export function collectRecords(node, predicate, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectRecords(item, predicate, out);
  } else if (node && typeof node === 'object') {
    if (predicate(node)) {
      out.push(node);
      return out; // a matched record is a leaf of interest; don't descend further
    }
    for (const key of Object.keys(node)) collectRecords(node[key], predicate, out);
  }
  return out;
}

const isActive = (rec) => String(rec.INVALID ?? '') !== '1';

// dm+d VMP prescribing status (PRES_STATCD): keep only products valid to
// prescribe in primary care — 0001 (valid) and 0009 (caution, AMP-level
// advised). Exclude 0002 (invalid in primary care), 0004 (never valid as a
// VMP), etc. If the field is absent we keep the record, so a parsing change can
// never silently wipe the dataset.
const PRESCRIBABLE_STATUS = new Set(['0001', '0009']);
const isPrescribable = (rec) =>
  rec.PRES_STATCD == null || PRESCRIBABLE_STATUS.has(String(rec.PRES_STATCD));

/** Build [{ name, packSizes }] from the VMP (names) + VMPP (pack sizes) files. */
export function extractItems(xmls, parser = xmlParser) {
  // Match the virtual files; exclude the actual/branded (amp) and pack (vmpp) ones.
  const vmpFile = findXml(xmls, ['vmp'], ['vmpp', 'amp']);
  const vmppFile = findXml(xmls, ['vmpp']);
  if (!vmpFile) {
    throw new Error(
      'Could not find the VMP file (…vmp….xml). Extracted: ' +
        xmls.map((x) => x.name).join(', '),
    );
  }

  // VMP records carry both a VPID and a name (NM).
  const vmpDoc = parser.parse(vmpFile.data.toString('utf8'));
  const vmpRecords = collectRecords(vmpDoc, (n) => n.VPID != null && n.NM != null);
  const nameByVpid = new Map();
  for (const v of vmpRecords) {
    if (!isActive(v)) continue; // skip discontinued products
    if (!isPrescribable(v)) continue; // keep only primary-care prescribable VMPs
    nameByVpid.set(String(v.VPID), String(v.NM));
  }

  // VMPP records carry a VPID and a pack quantity (QTYVAL).
  const packsByVpid = new Map();
  if (vmppFile) {
    const vmppDoc = parser.parse(vmppFile.data.toString('utf8'));
    const vmppRecords = collectRecords(vmppDoc, (n) => n.VPID != null && n.QTYVAL != null);
    for (const p of vmppRecords) {
      if (!isActive(p)) continue;
      const qty = Number(p.QTYVAL);
      if (Number.isFinite(qty) && qty > 0) {
        const vpid = String(p.VPID);
        if (!packsByVpid.has(vpid)) packsByVpid.set(vpid, new Set());
        packsByVpid.get(vpid).add(qty);
      }
    }
  }

  const items = [];
  for (const [vpid, name] of nameByVpid) {
    const packs = [...(packsByVpid.get(vpid) ?? [])].sort((a, b) => a - b);
    items.push({ name, packSizes: packs });
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  return {
    items,
    vmpCount: nameByVpid.size,
    packCount: packsByVpid.size,
    rawVmpCount: vmpRecords.length,
  };
}

async function main(apiKey) {
  const OUT_FILE = fileURLToPath(
    new URL('../src/tools/repeat-sync/data/dmd.json', import.meta.url),
  );
  const CACHE_DIR = fileURLToPath(new URL('../.dmd-cache', import.meta.url));

  // 1. Resolve the latest dm+d release.
  const releasesUrl = `${TRUD_API_BASE}/keys/${apiKey}/items/${DMD_ITEM}/releases?latest`;
  const metaRes = await fetch(releasesUrl);
  if (!metaRes.ok) {
    throw new Error(`TRUD releases request failed: ${metaRes.status} ${metaRes.statusText}`);
  }
  const meta = await metaRes.json();
  const release = meta.releases?.[0];
  if (!release?.archiveFileUrl) {
    throw new Error('TRUD returned no release / archiveFileUrl. Is the key subscribed to item 24?');
  }
  console.log(`[build-dmd] Latest dm+d release: ${release.id} (${release.releaseDate ?? 'date n/a'})`);

  // 2. Download the release archive.
  mkdirSync(CACHE_DIR, { recursive: true });
  const dlRes = await fetch(release.archiveFileUrl);
  if (!dlRes.ok) throw new Error(`Archive download failed: ${dlRes.status}`);
  const archive = Buffer.from(await dlRes.arrayBuffer());
  console.log(`[build-dmd] Downloaded ${(archive.length / 1e6).toFixed(1)} MB`);

  // 3. Extract XML (handles nested zips) and parse.
  const xmls = collectXml(archive);
  console.log(`[build-dmd] Extracted ${xmls.length} XML file(s)`);
  const { items, vmpCount, packCount, rawVmpCount } = extractItems(xmls);
  console.log(
    `[build-dmd] VMPs: ${vmpCount} prescribable kept of ${rawVmpCount} named (dropped ${rawVmpCount - vmpCount})`,
  );
  console.log(`[build-dmd] Products with pack sizes: ${packCount}`);
  if (items.length === 0) {
    throw new Error('Parsed 0 medications — the release layout may have changed; inspect file names.');
  }

  // 4. Write the slim bundle (minified — this file can be large).
  const out = {
    source: `NHS dm+d via TRUD (item ${DMD_ITEM}), release ${release.id}`,
    generatedAt: release.releaseDate ?? '',
    items,
  };
  const json = JSON.stringify(out) + '\n';
  writeFileSync(OUT_FILE, json);
  console.log(`[build-dmd] Wrote ${items.length} entries (${(json.length / 1e6).toFixed(1)} MB) to ${OUT_FILE}`);

  rmSync(CACHE_DIR, { recursive: true, force: true });
}

// Only run when executed directly (so tests can import the parsing helpers).
let isMain = false;
try {
  isMain = process.argv[1] === fileURLToPath(import.meta.url);
} catch {
  isMain = false;
}
if (isMain) {
  const apiKey = process.env.TRUD_API_KEY;
  if (!apiKey) {
    console.log(
      '[build-dmd] TRUD_API_KEY not set — skipping ingestion. ' +
        'The committed sample data/dmd.json will be bundled.',
    );
    process.exit(0); // graceful: never fail the build for a missing key
  }
  main(apiKey).catch((err) => {
    console.error('[build-dmd] FAILED:', err.message);
    process.exit(1);
  });
}
