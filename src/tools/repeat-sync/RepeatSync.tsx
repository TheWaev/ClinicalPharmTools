import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  calculateSync,
  type MedicationInput,
  type SyncMode,
  type SyncSettings,
} from './syncEngine';
import { buildSummaryText } from './summary';

const DEFAULT_CYCLE = 28;

let rowCounter = 0;
function newRow(): MedicationInput {
  rowCounter += 1;
  return {
    id: `row-${rowCounter}`,
    name: '',
    currentQuantity: null,
    dailyDose: null,
    cycleLength: DEFAULT_CYCLE,
    packSize: null,
    excludeFromSync: false,
  };
}

/** Parse a number input value into number | null (blank -> null). */
function toNum(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function numStr(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

const MODE_OPTIONS: { value: SyncMode; label: string }[] = [
  { value: 'catchUp', label: 'Catch up to longest supply' },
  { value: 'wholeCycle', label: 'Round up to a whole cycle' },
  { value: 'targetDate', label: 'Sync to a specific date' },
];

export default function RepeatSync() {
  const [meds, setMeds] = useState<MedicationInput[]>(() => [newRow(), newRow()]);
  const [mode, setMode] = useState<SyncMode>('catchUp');
  const [defaultCycleLength, setDefaultCycleLength] = useState<number>(DEFAULT_CYCLE);
  const [targetDate, setTargetDate] = useState<string>('');
  const [roundToPacks, setRoundToPacks] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  const settings: SyncSettings = useMemo(
    () => ({
      mode,
      defaultCycleLength,
      targetDate: mode === 'targetDate' && targetDate ? new Date(`${targetDate}T00:00:00`) : null,
      roundToPacks,
    }),
    [mode, defaultCycleLength, targetDate, roundToPacks],
  );

  // Recalculated live on every input change (PRD §8 performance).
  const result = useMemo(() => calculateSync(meds, settings, new Date()), [meds, settings]);

  function updateMed(id: string, patch: Partial<MedicationInput>) {
    setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function addRow() {
    setMeds((prev) => [...prev, { ...newRow(), cycleLength: defaultCycleLength }]);
  }
  function removeRow(id: string) {
    setMeds((prev) => prev.filter((m) => m.id !== id));
  }

  async function copySummary() {
    const text = buildSummaryText(result, settings);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — no-op; the
      // printable summary below remains selectable.
    }
  }

  const resultById = useMemo(
    () => Object.fromEntries(result.meds.map((m) => [m.id, m])),
    [result],
  );

  return (
    <div>
      <div className="no-print mb-4">
        <Link to="/" className="text-sm font-medium text-blue-700 hover:underline">
          &larr; All tools
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Repeat Medication Synchronisation
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Enter each repeat item to calculate a one-off bridging quantity that brings everything
          onto a common run-out date, plus the steady-state quantity to prescribe each cycle.
        </p>
        <p className="mt-2 rounded border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600">
          Reminder: use medication names only — do not enter patient names, NHS numbers or other
          identifiers.
        </p>
      </div>

      {/* Global controls */}
      <section className="no-print mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Synchronisation settings
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Default cycle length (days)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={defaultCycleLength}
              onChange={(e) => setDefaultCycleLength(toNum(e.target.value) ?? DEFAULT_CYCLE)}
              className="mt-1 block w-32 rounded border border-slate-300 px-2 py-1"
            />
          </label>

          <fieldset className="text-sm">
            <legend className="font-medium text-slate-700">Mode</legend>
            <div className="mt-1 space-y-1">
              {MODE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="sync-mode"
                    value={opt.value}
                    checked={mode === opt.value}
                    onChange={() => setMode(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {mode === 'targetDate' && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Target date</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="mt-1 block rounded border border-slate-300 px-2 py-1"
              />
            </label>
          )}

          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={roundToPacks}
              onChange={(e) => setRoundToPacks(e.target.checked)}
            />
            <span className="text-slate-700">Round up to whole packs (where a pack size is set)</span>
          </label>
        </div>
      </section>

      {/* Medication rows */}
      <section className="no-print mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Medications
        </h2>
        <div className="space-y-3">
          {meds.map((m) => {
            const r = resultById[m.id];
            return (
              <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="grid items-end gap-3 sm:grid-cols-12">
                  <label className="block text-sm sm:col-span-4">
                    <span className="font-medium text-slate-700">Medication</span>
                    <input
                      type="text"
                      value={m.name}
                      placeholder="e.g. Amlodipine 5mg tablets"
                      onChange={(e) => updateMed(m.id, { name: e.target.value })}
                      className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">Current qty</span>
                    <input
                      type="number"
                      min={0}
                      value={numStr(m.currentQuantity)}
                      onChange={(e) => updateMed(m.id, { currentQuantity: toNum(e.target.value) })}
                      className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">Dose/day</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={numStr(m.dailyDose)}
                      onChange={(e) => updateMed(m.id, { dailyDose: toNum(e.target.value) })}
                      className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">Cycle (days)</span>
                    <input
                      type="number"
                      min={1}
                      value={numStr(m.cycleLength)}
                      onChange={(e) => updateMed(m.id, { cycleLength: toNum(e.target.value) })}
                      className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">Pack size</span>
                    <input
                      type="number"
                      min={1}
                      value={numStr(m.packSize)}
                      onChange={(e) => updateMed(m.id, { packSize: toNum(e.target.value) })}
                      className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={m.excludeFromSync ?? false}
                      onChange={(e) => updateMed(m.id, { excludeFromSync: e.target.checked })}
                    />
                    <span>Variable / PRN — list but don’t calculate</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeRow(m.id)}
                    className="rounded px-2 py-1 text-sm text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>

                {/* Per-row inline result / flags */}
                {r && (r.included || r.flags.length > 0) && (
                  <RowResultHint
                    included={r.included}
                    bridgingQty={r.bridgingQty}
                    ongoingQty={r.ongoingQty}
                    daysRemaining={r.daysRemaining}
                    flags={r.flags}
                  />
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          + Add medication
        </button>
      </section>

      {/* Results / summary */}
      <Results result={result} settings={settings} onCopy={copySummary} copied={copied} />
    </div>
  );
}

function RowResultHint({
  included,
  bridgingQty,
  ongoingQty,
  daysRemaining,
  flags,
}: {
  included: boolean;
  bridgingQty: number | null;
  ongoingQty: number | null;
  daysRemaining: number | null;
  flags: string[];
}) {
  if (!included) {
    return (
      <p className="mt-2 text-sm text-amber-700">
        Not calculated{flags.length ? ` (${flags.join(', ')})` : ''}.
      </p>
    );
  }
  return (
    <p className="mt-2 text-sm text-slate-600">
      Bridge now: <span className="font-semibold text-slate-900">{bridgingQty}</span> · ongoing per
      cycle: {ongoingQty} · current supply ~{Math.floor(daysRemaining ?? 0)} days
      {flags.includes('alreadySupplied') && (
        <span className="text-amber-700"> · already supplied beyond sync date</span>
      )}
    </p>
  );
}

function Results({
  result,
  settings,
  onCopy,
  copied,
}: {
  result: ReturnType<typeof calculateSync>;
  settings: SyncSettings;
  onCopy: () => void;
  copied: boolean;
}) {
  const summaryText = buildSummaryText(result, settings);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Summary</h2>
        <div className="no-print flex gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            {copied ? 'Copied ✓' : 'Copy summary'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Print
          </button>
        </div>
      </div>

      {result.errors.length > 0 && (
        <ul className="mb-3 list-disc rounded border border-amber-300 bg-amber-50 py-2 pl-8 pr-3 text-sm text-amber-900">
          {result.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm text-slate-800">
        {summaryText}
      </pre>
    </section>
  );
}
