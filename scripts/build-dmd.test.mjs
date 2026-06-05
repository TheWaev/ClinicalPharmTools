// @vitest-environment node
import { describe, it, expect } from 'vitest';
import AdmZip from 'adm-zip';
import { collectXml, extractItems } from './build-dmd.mjs';

function zipOf(files) {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) {
    zip.addFile(name, Buffer.from(content, 'utf8'));
  }
  return zip.toBuffer();
}

const VMP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<VIRTUAL_MED_PRODUCTS>
  <VMPS>
    <VMP><VPID>319773006</VPID><NM>Amlodipine 5mg tablets</NM></VMP>
    <VMP><VPID>318274004</VPID><NM>Ramipril 5mg capsules</NM></VMP>
    <VMP><VPID>99999999999999999</VPID><NM>Bigid 1mg tablets</NM></VMP>
    <VMP><VPID>11111111</VPID><NM>Discontinued 1mg tablets</NM><INVALID>1</INVALID></VMP>
  </VMPS>
</VIRTUAL_MED_PRODUCTS>`;

const VMPP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<VIRTUAL_MED_PRODUCT_PACK>
  <VMPPS>
    <VMPP><VPPID>1</VPPID><VPID>319773006</VPID><NM>Amlodipine 28</NM><QTYVAL>28</QTYVAL></VMPP>
    <VMPP><VPPID>2</VPPID><VPID>319773006</VPID><NM>Amlodipine 56</NM><QTYVAL>56</QTYVAL></VMPP>
    <VMPP><VPPID>3</VPPID><VPID>99999999999999999</VPID><NM>Bigid pack</NM><QTYVAL>30</QTYVAL></VMPP>
  </VMPPS>
</VIRTUAL_MED_PRODUCT_PACK>`;

// Actual/branded products — these must be ignored entirely.
const AMP_XML = `<?xml version="1.0"?><ACTUAL_MEDICINAL_PRODUCTS><AMPS><AMP><VPID>319773006</VPID><NM>Brandipine 5mg tablets</NM></AMP></AMPS></ACTUAL_MEDICINAL_PRODUCTS>`;

describe('dm+d parser', () => {
  const xmls = collectXml(
    zipOf({
      'f_vmp2_3000000.xml': VMP_XML,
      'f_vmpp2_3000000.xml': VMPP_XML,
      'f_amp2_3000000.xml': AMP_XML,
    }),
  );

  it('extracts active VMP names with pack sizes joined from VMPP', () => {
    const { items } = extractItems(xmls);
    const byName = Object.fromEntries(items.map((i) => [i.name, i]));
    expect(byName['Amlodipine 5mg tablets'].packSizes).toEqual([28, 56]);
    expect(byName['Ramipril 5mg capsules'].packSizes).toEqual([]);
  });

  it('joins on 17-digit SNOMED VPIDs without numeric precision loss', () => {
    const { items } = extractItems(xmls);
    const big = items.find((i) => i.name === 'Bigid 1mg tablets');
    expect(big.packSizes).toEqual([30]);
  });

  it('excludes discontinued (INVALID) products', () => {
    const { items } = extractItems(xmls);
    expect(items.some((i) => i.name.startsWith('Discontinued'))).toBe(false);
  });

  it('ignores branded AMP products entirely', () => {
    const { items } = extractItems(xmls);
    expect(items.some((i) => i.name === 'Brandipine 5mg tablets')).toBe(false);
    expect(items).toHaveLength(3); // Amlodipine, Bigid, Ramipril
  });

  it('keeps only primary-care prescribable VMPs (PRES_STATCD 0001/0009)', () => {
    const vmp = `<?xml version="1.0"?>
<VIRTUAL_MED_PRODUCTS><VMPS>
  <VMP><VPID>1</VPID><NM>Valid prescribable tablets</NM><PRES_STATCD>0001</PRES_STATCD></VMP>
  <VMP><VPID>2</VPID><NM>Caution AMP-level tablets</NM><PRES_STATCD>0009</PRES_STATCD></VMP>
  <VMP><VPID>3</VPID><NM>Invalid in primary care tablets</NM><PRES_STATCD>0002</PRES_STATCD></VMP>
  <VMP><VPID>4</VPID><NM>Never valid as VMP tablets</NM><PRES_STATCD>0004</PRES_STATCD></VMP>
  <VMP><VPID>5</VPID><NM>No status field tablets</NM></VMP>
</VMPS></VIRTUAL_MED_PRODUCTS>`;
    const { items } = extractItems(collectXml(zipOf({ 'f_vmp2_x.xml': vmp })));
    const names = items.map((i) => i.name);
    expect(names).toContain('Valid prescribable tablets'); // 0001
    expect(names).toContain('Caution AMP-level tablets'); // 0009
    expect(names).toContain('No status field tablets'); // absent -> kept (safety)
    expect(names).not.toContain('Invalid in primary care tablets'); // 0002
    expect(names).not.toContain('Never valid as VMP tablets'); // 0004
  });

  it('handles nested zips when collecting XML', () => {
    const inner = zipOf({ 'f_vmp2_x.xml': VMP_XML, 'f_vmpp2_x.xml': VMPP_XML });
    const outer = new AdmZip();
    outer.addFile('week3-files.zip', inner);
    const nested = collectXml(outer.toBuffer());
    expect(nested).toHaveLength(2);
    const { items } = extractItems(nested);
    expect(items.length).toBeGreaterThan(0);
  });
});
