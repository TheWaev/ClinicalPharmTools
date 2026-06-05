import { describe, it, expect } from 'vitest';
import {
  calculateSync,
  daysBetween,
  addDays,
  type MedicationInput,
  type SyncSettings,
} from './syncEngine';

// Fixed reference date so date-dependent assertions are deterministic.
const TODAY = new Date(2026, 5, 5); // 5 June 2026 (month is 0-indexed)

function med(partial: Partial<MedicationInput> & { id: string }): MedicationInput {
  return {
    name: 'Test med',
    currentQuantity: 0,
    dailyDose: 1,
    cycleLength: 28,
    ...partial,
  };
}

const baseSettings: SyncSettings = {
  mode: 'catchUp',
  defaultCycleLength: 28,
  targetDate: null,
  roundToPacks: false,
};

describe('date helpers', () => {
  it('counts whole calendar days between dates', () => {
    expect(daysBetween(TODAY, addDays(TODAY, 35))).toBe(35);
    expect(daysBetween(TODAY, TODAY)).toBe(0);
    expect(daysBetween(TODAY, addDays(TODAY, -3))).toBe(-3);
  });

  it('addDays returns a date-only value the given number of days later', () => {
    const out = addDays(TODAY, 35);
    expect(out.getFullYear()).toBe(2026);
    expect(out.getMonth()).toBe(6); // July
    expect(out.getDate()).toBe(10); // 5 June + 35 days = 10 July
  });
});

describe('calculateSync — PRD §6.3 worked example', () => {
  const meds: MedicationInput[] = [
    med({ id: 'amlodipine', name: 'Amlodipine 5mg', currentQuantity: 20, dailyDose: 1 }),
    med({ id: 'atorvastatin', name: 'Atorvastatin 40mg', currentQuantity: 35, dailyDose: 1 }),
    med({ id: 'ramipril', name: 'Ramipril 5mg', currentQuantity: 14, dailyDose: 1 }),
  ];

  const result = calculateSync(meds, baseSettings, TODAY);

  it('computes horizon H = 35', () => {
    expect(result.canCalculate).toBe(true);
    expect(result.horizonDays).toBe(35);
  });

  it('computes the bridging quantities 15 / 0 / 21', () => {
    const byId = Object.fromEntries(result.meds.map((m) => [m.id, m]));
    expect(byId.amlodipine.bridgingQty).toBe(15);
    expect(byId.atorvastatin.bridgingQty).toBe(0);
    expect(byId.ramipril.bridgingQty).toBe(21);
  });

  it('computes ongoing quantity 28 for each item', () => {
    for (const m of result.meds) expect(m.ongoingQty).toBe(28);
  });

  it('sets the synchronised run-out date to today + 35 days', () => {
    expect(result.syncRunOutDate).toEqual(addDays(TODAY, 35));
  });

  it('reports current days of supply per item', () => {
    const byId = Object.fromEntries(result.meds.map((m) => [m.id, m]));
    expect(byId.amlodipine.daysRemaining).toBe(20);
    expect(byId.atorvastatin.daysRemaining).toBe(35);
    expect(byId.ramipril.daysRemaining).toBe(14);
  });
});

describe('calculateSync — synchronisation modes', () => {
  const meds: MedicationInput[] = [
    med({ id: 'a', currentQuantity: 20, dailyDose: 1 }),
    med({ id: 'b', currentQuantity: 35, dailyDose: 1 }),
  ];

  it('round up to a whole cycle rounds the horizon up to the next multiple', () => {
    const result = calculateSync(meds, { ...baseSettings, mode: 'wholeCycle' }, TODAY);
    // max days remaining = 35; ceil(35 / 28) * 28 = 56
    expect(result.horizonDays).toBe(56);
    const byId = Object.fromEntries(result.meds.map((m) => [m.id, m]));
    expect(byId.a.bridgingQty).toBe(36); // 56 - 20
    expect(byId.b.bridgingQty).toBe(21); // 56 - 35
  });

  it('sync to a specific date uses the day count to that date', () => {
    const result = calculateSync(
      meds,
      { ...baseSettings, mode: 'targetDate', targetDate: addDays(TODAY, 50) },
      TODAY,
    );
    expect(result.canCalculate).toBe(true);
    expect(result.horizonDays).toBe(50);
    const byId = Object.fromEntries(result.meds.map((m) => [m.id, m]));
    expect(byId.a.bridgingQty).toBe(30); // 50 - 20
    expect(byId.b.bridgingQty).toBe(15); // 50 - 35
  });

  it('rejects a target date earlier than the longest current supply', () => {
    const result = calculateSync(
      meds,
      { ...baseSettings, mode: 'targetDate', targetDate: addDays(TODAY, 30) },
      TODAY,
    );
    expect(result.canCalculate).toBe(false);
    expect(result.horizonDays).toBeNull();
    expect(result.errors.join(' ')).toMatch(/earlier than the longest current supply/i);
  });

  it('rejects a target date in the past', () => {
    const result = calculateSync(
      meds,
      { ...baseSettings, mode: 'targetDate', targetDate: addDays(TODAY, -1) },
      TODAY,
    );
    expect(result.canCalculate).toBe(false);
    expect(result.errors.join(' ')).toMatch(/future/i);
  });
});

describe('calculateSync — validation & edge cases', () => {
  it('flags and excludes a zero/blank dose row without breaking the result', () => {
    const meds: MedicationInput[] = [
      med({ id: 'good', currentQuantity: 20, dailyDose: 1 }),
      med({ id: 'baddose', currentQuantity: 30, dailyDose: 0 }),
      med({ id: 'noqty', currentQuantity: null, dailyDose: 1 }),
    ];
    const result = calculateSync(meds, baseSettings, TODAY);
    const byId = Object.fromEntries(result.meds.map((m) => [m.id, m]));

    expect(result.canCalculate).toBe(true);
    expect(result.horizonDays).toBe(20); // only the "good" row counts
    expect(byId.baddose.included).toBe(false);
    expect(byId.baddose.flags).toContain('invalidDose');
    expect(byId.noqty.included).toBe(false);
    expect(byId.noqty.flags).toContain('missingQuantity');
  });

  it('lists excludeFromSync items but does not calculate them', () => {
    const meds: MedicationInput[] = [
      med({ id: 'good', currentQuantity: 20, dailyDose: 1 }),
      med({ id: 'prn', currentQuantity: 50, dailyDose: 1, excludeFromSync: true }),
    ];
    const result = calculateSync(meds, baseSettings, TODAY);
    const prn = result.meds.find((m) => m.id === 'prn')!;
    expect(prn.included).toBe(false);
    expect(prn.flags).toContain('excluded');
    expect(prn.bridgingQty).toBeNull();
  });

  it('flags an item already supplied beyond the horizon and never emits a negative qty', () => {
    const meds: MedicationInput[] = [
      med({ id: 'short', currentQuantity: 10, dailyDose: 1 }),
      med({ id: 'long', currentQuantity: 40, dailyDose: 1 }),
    ];
    // catchUp horizon = 40; "long" has exactly 40 → bridging 0, not negative.
    const result = calculateSync(meds, baseSettings, TODAY);
    const byId = Object.fromEntries(result.meds.map((m) => [m.id, m]));
    expect(byId.short.bridgingQty).toBe(30);
    expect(byId.long.bridgingQty).toBe(0);
    expect(byId.long.bridgingQty).toBeGreaterThanOrEqual(0);
  });

  it('never presents fractional quantities — rounds up decimal-dose results', () => {
    const meds: MedicationInput[] = [
      med({ id: 'half', currentQuantity: 10, dailyDose: 0.5 }), // 20 days remaining
      med({ id: 'full', currentQuantity: 35, dailyDose: 1 }), // 35 days remaining (sets H)
    ];
    const result = calculateSync(meds, baseSettings, TODAY);
    const half = result.meds.find((m) => m.id === 'half')!;
    // H = 35; raw bridge = 35 * 0.5 - 10 = 7.5 → rounds up to 8
    expect(half.bridgingQty).toBe(8);
    expect(Number.isInteger(half.bridgingQty)).toBe(true);
    // ongoing = 28 * 0.5 = 14 (already whole)
    expect(half.ongoingQty).toBe(14);
  });

  it('rounds up to whole packs when roundToPacks is enabled and a packSize is set', () => {
    const meds: MedicationInput[] = [
      med({ id: 'short', currentQuantity: 10, dailyDose: 1, packSize: 28 }),
      med({ id: 'long', currentQuantity: 35, dailyDose: 1, packSize: 28 }),
    ];
    const result = calculateSync(meds, { ...baseSettings, roundToPacks: true }, TODAY);
    const short = result.meds.find((m) => m.id === 'short')!;
    // H = 35; raw bridge = 25 → ceil(25 / 28) * 28 = 28
    expect(short.bridgingQty).toBe(28);
    // ongoing = 28 → ceil(28 / 28) * 28 = 28
    expect(short.ongoingQty).toBe(28);
  });

  it('returns canCalculate=false when there are no valid rows', () => {
    const meds: MedicationInput[] = [med({ id: 'bad', currentQuantity: null, dailyDose: 0 })];
    const result = calculateSync(meds, baseSettings, TODAY);
    expect(result.canCalculate).toBe(false);
    expect(result.horizonDays).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('uses a per-row cycle length for ongoing quantity, falling back to the default', () => {
    const meds: MedicationInput[] = [
      med({ id: 'monthly', currentQuantity: 20, dailyDose: 1, cycleLength: 28 }),
      med({ id: 'bimonthly', currentQuantity: 30, dailyDose: 1, cycleLength: 56 }),
    ];
    const result = calculateSync(meds, baseSettings, TODAY);
    const byId = Object.fromEntries(result.meds.map((m) => [m.id, m]));
    expect(byId.monthly.ongoingQty).toBe(28);
    expect(byId.bimonthly.ongoingQty).toBe(56);
  });
});
