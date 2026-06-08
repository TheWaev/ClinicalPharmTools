/**
 * Postcode → Townsend deprivation score, at postcode-SECTOR level.
 * Pure, UI-decoupled, testable. The lookup table is bundled at build time
 * (townsendBySector.json) so there is no runtime network call, and the postcode
 * the user types is never stored or transmitted — it only indexes a local table.
 *
 * The table maps a sector key (outward code + first inward digit, no spaces,
 * e.g. "BR1 2AB" → "BR12") to the mean 2011 Townsend score of the LSOAs in that
 * sector. Sector level (rather than full unit postcode) keeps the dataset tiny
 * and is less identifying. Coverage is England & Wales; unknown sectors return
 * null so the model falls back to the population average.
 *
 * Data: ONS postcode→LSOA (Dec 2011) + 2011 UK Townsend scores by LSOA, both
 * Open Government Licence. See scripts/build-townsend.mjs for regeneration.
 */
import table from './townsendBySector.json';

const TABLE = table as Record<string, number>;

/** Normalise a UK postcode to its sector key (no spaces). Returns null if implausible. */
export function postcodeSector(postcode: string): string | null {
  const pc = postcode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // UK postcodes are 5–7 chars without the space; the inward part is always 3
  // chars, so the sector = everything except the final two (inward) letters.
  if (pc.length < 5 || pc.length > 7) return null;
  if (!/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9]/.test(pc)) return null;
  return pc.slice(0, -2);
}

export interface TownsendLookup {
  /** Townsend score, or null if the postcode is invalid or the sector is unknown. */
  townsend: number | null;
  /** The sector key used, e.g. "BR12" (null if the postcode was invalid). */
  sector: string | null;
  /** True only when a score was found for the sector. */
  matched: boolean;
}

export function lookupTownsend(postcode: string): TownsendLookup {
  const sector = postcodeSector(postcode);
  if (!sector) return { townsend: null, sector: null, matched: false };
  const t = TABLE[sector];
  return { townsend: t ?? null, sector, matched: t != null };
}
