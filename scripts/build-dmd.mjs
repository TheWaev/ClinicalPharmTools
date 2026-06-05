#!/usr/bin/env node
/**
 * Build-time ingestion of the NHS dm+d (Dictionary of Medicines and Devices)
 * into a slim JSON the app bundles for medication-name autocomplete + pack-size
 * hints.
 *
 * Why build-time: the PRD requires the app to be fully client-side with NO
 * runtime network calls and no embedded secrets (a public static site). So we
 * fetch dm+d here, in dev or CI, and bundle only a derived subset. See
 * docs/the PRD §7-§8 and the dm+d/TRUD memory.
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
 * NOTE: dm+d's XML schema element names are encoded below. They are stable but
 * the release packaging (single vs nested zips, file-name suffixes) can vary by
 * release — the script logs counts at each step so a mismatch is obvious. If a
 * count is 0, inspect the extracted file names and adjust the matchers.
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

const TRUD_API_BASE = 'https://isd.digital.nhs.uk/trud/api/v1';
const DMD_ITEM = 24;
const OUT_FILE = fileURLToPath(
  new URL('../src/tools/repeat-sync/data/dmd.json', import.meta.url),
);
const CACHE_DIR = fileURLToPath(new URL('../.dmd-cache', import.meta.url));

const apiKey = process.env.TRUD_API_KEY;

if (!apiKey) {
  console.log(
    '[build-dmd] TRUD_API_KEY not set — skipping ingestion. ' +
      'The committed sample data/dmd.json will be bundled.',
  );
  process.exit(0); // graceful: never fail the build for a missing key
}

const asArray = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]);

function findXml(xmls, includes, excludes = []) {
  return xmls.find(
    (x) =>
      includes.every((i) => x.name.includes(i)) &&
      excludes.every((e) => !x.name.includes(e)),
  );
}

/** Recursively collect every .xml entry, descending into nested .zip entries. */
function collectXml(zipBuffer) {
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

/** Build [{ name, packSizes }] from the VMP (names) + VMPP (pack sizes) files. */
function extractItems(xmls, parser) {
  const vmpFile = findXml(xmls, ['f_vmp'], ['f_vmpp']);
  const vmppFile = findXml(xmls, ['f_vmpp']);
  if (!vmpFile) {
    throw new Error(
      'Could not find the VMP file (f_vmp*.xml). Extracted files: ' +
        xmls.map((x) => x.name).join(', '),
    );
  }

  // VMP: VPID -> name. Root <VIRTUAL_MED_PRODUCTS><VMPS><VMP><VPID/><NM/>.
  const vmpDoc = parser.parse(vmpFile.data.toString('utf8'));
  const vmps = asArray(vmpDoc?.VIRTUAL_MED_PRODUCTS?.VMPS?.VMP);
  const nameByVpid = new Map();
  for (const v of vmps) {
    if (v?.VPID != null && v?.NM) nameByVpid.set(String(v.VPID), String(v.NM));
  }
  console.log(`[build-dmd] VMPs (named products): ${nameByVpid.size}`);

  // VMPP: VPID -> {pack sizes}. Root <VIRTUAL_MED_PRODUCT_PACK><VMPPS><VMPP>.
  const packsByVpid = new Map();
  if (vmppFile) {
    const vmppDoc = parser.parse(vmppFile.data.toString('utf8'));
    const vmpps = asArray(vmppDoc?.VIRTUAL_MED_PRODUCT_PACK?.VMPPS?.VMPP);
    for (const p of vmpps) {
      const vpid = p?.VPID != null ? String(p.VPID) : null;
      const qty = Number(p?.QTYVAL);
      if (vpid && Number.isFinite(qty) && qty > 0) {
        if (!packsByVpid.has(vpid)) packsByVpid.set(vpid, new Set());
        packsByVpid.get(vpid).add(qty);
      }
    }
    console.log(`[build-dmd] VMPPs (packs) covering ${packsByVpid.size} products`);
  } else {
    console.warn('[build-dmd] No VMPP file found — pack sizes will be empty.');
  }

  const items = [];
  for (const [vpid, name] of nameByVpid) {
    const packs = [...(packsByVpid.get(vpid) ?? [])].sort((a, b) => a - b);
    items.push({ name, packSizes: packs });
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

async function main() {
  // 1. Resolve the latest dm+d release.
  const releasesUrl = `${TRUD_API_BASE}/keys/${apiKey}/items/${DMD_ITEM}/releases?latest`;
  const metaRes = await fetch(releasesUrl);
  if (!metaRes.ok) {
    throw new Error(`TRUD releases request failed: ${metaRes.status} ${metaRes.statusText}`);
  }
  const meta = await metaRes.json();
  const release = meta.releases?.[0];
  if (!release?.archiveFileUrl) {
    throw new Error('TRUD returned no release / archiveFileUrl. Is the API key subscribed to item 24?');
  }
  console.log(`[build-dmd] Latest dm+d release: ${release.id} (${release.releaseDate ?? 'date n/a'})`);

  // 2. Download the release archive.
  mkdirSync(CACHE_DIR, { recursive: true });
  const dlRes = await fetch(release.archiveFileUrl);
  if (!dlRes.ok) throw new Error(`Archive download failed: ${dlRes.status}`);
  const archive = Buffer.from(await dlRes.arrayBuffer());
  console.log(`[build-dmd] Downloaded ${(archive.length / 1e6).toFixed(1)} MB`);

  // 3. Extract all XML (handles nested zips).
  const xmls = collectXml(archive);
  console.log(`[build-dmd] Extracted ${xmls.length} XML file(s)`);

  // 4. Parse names + pack sizes.
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });
  const items = extractItems(xmls, parser);
  console.log(`[build-dmd] Built ${items.length} medication entries`);

  // 5. Write the slim bundle (minified — this file can be large).
  const out = {
    source: `NHS dm+d via TRUD (item ${DMD_ITEM}), release ${release.id}`,
    generatedAt: release.releaseDate ?? '',
    items,
  };
  writeFileSync(OUT_FILE, JSON.stringify(out) + '\n');
  console.log(`[build-dmd] Wrote ${OUT_FILE}`);

  rmSync(CACHE_DIR, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('[build-dmd] FAILED:', err.message);
  process.exit(1);
});
