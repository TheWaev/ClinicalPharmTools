/**
 * Pure, UI-decoupled synchronisation logic for the Repeat Medication
 * Synchronisation tool. Implements the algorithm in PRD §6.2.
 *
 * Nothing in here touches the DOM, the network or any global clock — the
 * caller passes `today` in — so it is fully unit-testable. The worked example
 * in PRD §6.3 is covered in syncEngine.test.ts.
 */

export type SyncMode = 'catchUp' | 'wholeCycle' | 'targetDate';

export interface MedicationInput {
  id: string;
  name: string;
  /** Units currently held by the patient. */
  currentQuantity: number | null;
  /** Units taken per day; decimals allowed (e.g. 0.5). Must be > 0. */
  dailyDose: number | null;
  /** Standard ongoing prescription length in days. Falls back to the global default. */
  cycleLength: number | null;
  /** If set, enables rounding bridging/ongoing quantities to whole packs. */
  packSize?: number | null;
  /** Listed in output but excluded from calculation (PRN / variable dose). */
  excludeFromSync?: boolean;
}

export interface SyncSettings {
  mode: SyncMode;
  /** Default cycle length (days) applied to rows without their own. PRD default: 28. */
  defaultCycleLength: number;
  /** Date-only target used when mode === 'targetDate'. */
  targetDate?: Date | null;
  /** When true, round up to whole packs for rows that have a packSize. */
  roundToPacks: boolean;
}

export type MedFlag =
  | 'invalidDose' // dailyDose missing or <= 0
  | 'missingQuantity' // currentQuantity missing or negative
  | 'invalidCycle' // cycle length not a positive number
  | 'excluded' // excludeFromSync = true
  | 'alreadySupplied'; // supply already extends beyond the sync horizon

export interface MedResult {
  id: string;
  name: string;
  /** True when the row took part in the calculation. */
  included: boolean;
  /** currentQuantity / dailyDose, or null when not calculable. */
  daysRemaining: number | null;
  /** One-off quantity to bring this item up to the sync horizon (rounded up). */
  bridgingQty: number | null;
  /** Steady-state quantity to prescribe each cycle thereafter (rounded up). */
  ongoingQty: number | null;
  flags: MedFlag[];
}

export interface SyncResult {
  /** False when there is no valid input or a blocking error (see `errors`). */
  canCalculate: boolean;
  /** Synchronisation horizon H, in days from `today`. */
  horizonDays: number | null;
  syncRunOutDate: Date | null;
  meds: MedResult[];
  /** Blocking, suite-level problems (e.g. an invalid target date). */
  errors: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days from `from` to `to`, ignoring time-of-day. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

/** A new date `days` after `date` (date-only, local time). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function isNonNegative(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

/** Round a raw quantity UP to whole units, or whole packs when enabled. */
function roundUpQuantity(
  raw: number,
  packSize: number | null | undefined,
  roundToPacks: boolean,
): number {
  if (raw <= 0) return 0;
  if (roundToPacks && isPositive(packSize)) {
    return Math.ceil(raw / packSize) * packSize;
  }
  return Math.ceil(raw);
}

/**
 * Run the synchronisation calculation.
 *
 * @param meds     Medication rows entered by the user.
 * @param settings Global controls (mode, default cycle, target date, rounding).
 * @param today    The reference "today"; injected for testability.
 */
export function calculateSync(
  meds: MedicationInput[],
  settings: SyncSettings,
  today: Date,
): SyncResult {
  const errors: string[] = [];

  // Validate + classify every row.
  const classified = meds.map((med) => {
    const flags: MedFlag[] = [];
    if (med.excludeFromSync) flags.push('excluded');
    if (!isNonNegative(med.currentQuantity)) flags.push('missingQuantity');
    if (!isPositive(med.dailyDose)) flags.push('invalidDose');

    const cycle = isPositive(med.cycleLength) ? med.cycleLength : settings.defaultCycleLength;
    if (!isPositive(cycle)) flags.push('invalidCycle');

    const included = flags.length === 0;
    const daysRemaining =
      isNonNegative(med.currentQuantity) && isPositive(med.dailyDose)
        ? med.currentQuantity / med.dailyDose
        : null;

    return { med, flags, cycle, included, daysRemaining };
  });

  const included = classified.filter((c) => c.included);

  const baseMedResult = (c: (typeof classified)[number]): MedResult => ({
    id: c.med.id,
    name: c.med.name,
    included: false,
    daysRemaining: c.daysRemaining,
    bridgingQty: null,
    ongoingQty: null,
    flags: c.flags,
  });

  if (included.length === 0) {
    return {
      canCalculate: false,
      horizonDays: null,
      syncRunOutDate: null,
      meds: classified.map(baseMedResult),
      errors: [
        'Enter at least one medication with a quantity and a daily dose greater than zero.',
      ],
    };
  }

  const maxDaysRemaining = Math.max(...included.map((c) => c.daysRemaining as number));
  const minHorizon = Math.ceil(maxDaysRemaining);

  // Step 1 — synchronisation horizon H (days from today).
  let horizon: number;
  switch (settings.mode) {
    case 'catchUp':
      horizon = minHorizon;
      break;
    case 'wholeCycle': {
      const cycle = settings.defaultCycleLength;
      horizon = Math.ceil(maxDaysRemaining / cycle) * cycle;
      break;
    }
    case 'targetDate': {
      if (!settings.targetDate) {
        errors.push('Choose a target synchronisation date.');
        horizon = minHorizon;
      } else {
        horizon = daysBetween(today, settings.targetDate);
        if (horizon <= 0) {
          errors.push('The target date must be in the future.');
        } else if (horizon < minHorizon) {
          errors.push(
            'The target date is earlier than the longest current supply. Choose a later date.',
          );
        }
      }
      break;
    }
  }

  const canCalculate = errors.length === 0;
  const syncRunOutDate = canCalculate ? addDays(today, horizon) : null;

  const medResults: MedResult[] = classified.map((c) => {
    if (!c.included) return baseMedResult(c);

    const result: MedResult = { ...baseMedResult(c), included: true, flags: [...c.flags] };
    if (!canCalculate) return result;

    const dose = c.med.dailyDose as number;
    const qty = c.med.currentQuantity as number;

    // Step 2 — one-off bridging quantity for this cycle.
    const rawBridge = horizon * dose - qty;
    if (rawBridge < 0) {
      // Supply already extends beyond H — never emit a negative quantity.
      result.flags.push('alreadySupplied');
      result.bridgingQty = 0;
    } else {
      result.bridgingQty = roundUpQuantity(rawBridge, c.med.packSize, settings.roundToPacks);
    }

    // Step 3 — steady-state quantity per cycle thereafter.
    result.ongoingQty = roundUpQuantity(c.cycle * dose, c.med.packSize, settings.roundToPacks);

    return result;
  });

  return {
    canCalculate,
    horizonDays: canCalculate ? horizon : null,
    syncRunOutDate,
    meds: medResults,
    errors,
  };
}
