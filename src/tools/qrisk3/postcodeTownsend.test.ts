import { describe, it, expect } from 'vitest';
import { postcodeSector, lookupTownsend } from './postcodeTownsend';

describe('postcodeSector', () => {
  it('reduces a postcode to its sector key (outward + first inward digit)', () => {
    expect(postcodeSector('BR1 2AB')).toBe('BR12');
    expect(postcodeSector('br1 2ab')).toBe('BR12');
    expect(postcodeSector('SO14 3JA')).toBe('SO143');
    expect(postcodeSector('E1 6AN')).toBe('E16');
    expect(postcodeSector('EC1A 1BB')).toBe('EC1A1');
  });

  it('tolerates missing/extra spacing', () => {
    expect(postcodeSector('br12ab')).toBe('BR12');
    expect(postcodeSector('  BR1  2AB ')).toBe('BR12');
  });

  it('returns null for implausible input', () => {
    expect(postcodeSector('')).toBeNull();
    expect(postcodeSector('XYZ')).toBeNull();
    expect(postcodeSector('12345')).toBeNull();
  });
});

describe('lookupTownsend', () => {
  it('resolves a known England/Wales sector to a Townsend score', () => {
    const r = lookupTownsend('BR1 2AB');
    expect(r.sector).toBe('BR12');
    expect(r.matched).toBe(true);
    expect(typeof r.townsend).toBe('number');
  });

  it('reflects relative deprivation (Newham E16 more deprived than Bromley BR1 2)', () => {
    const newham = lookupTownsend('E16 1AA').townsend;
    const bromley = lookupTownsend('BR1 2AB').townsend;
    expect(newham).not.toBeNull();
    expect(bromley).not.toBeNull();
    expect(newham!).toBeGreaterThan(bromley!);
  });

  it('returns matched=false for an unknown sector', () => {
    const r = lookupTownsend('ZZ99 9ZZ');
    expect(r.matched).toBe(false);
    expect(r.townsend).toBeNull();
  });

  it('returns null lookup for invalid postcodes', () => {
    expect(lookupTownsend('nonsense').townsend).toBeNull();
  });
});
