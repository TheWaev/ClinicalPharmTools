import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  calculateSync,
  type MedicationInput,
  type MedResult,
  type SyncMode,
  type SyncResult,
  type SyncSettings,
} from './syncEngine';
import { buildSummaryText } from './summary';
import { medicationNames, packSizesFor } from './dmdData';

const DEFAULT_CYCLE = 28;

// Native <datalist> renders every option into the DOM; cap it so a full dm+d
// extract (tens of thousands of products) can't bloat the page. A production
// build with the whole dictionary should switch to a filtered combobox.
const DATALIST_CAP = 1000;
const datalistNames = medicationNames.slice(0, DATALIST_CAP);

let rowCounter = 0;
function newRow(cycleLength = DEFAULT_CYCLE): MedicationInput {
  rowCounter += 1;
  return {
    id: `row-${rowCounter}`,
    name: '',
    currentQuantity: null,
    dailyDose: null,
    cycleLength,
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

/** True once the user has put anything meaningful in a row. */
function rowHasInput(m: MedicationInput): boolean {
  return (
    m.name.trim() !== '' ||
    m.currentQuantity != null ||
    m.dailyDose != null ||
    m.packSize != null
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
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
  const resultById = useMemo(
    () => Object.fromEntries(result.meds.map((m) => [m.id, m])),
    [result],
  );

  function updateMed(id: string, patch: Partial<MedicationInput>) {
    setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function addRow() {
    setMeds((prev) => [...prev, newRow(defaultCycleLength)]);
  }
  function removeRow(id: string) {
    setMeds((prev) => prev.filter((m) => m.id !== id));
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildSummaryText(result, settings));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the printable
      // summary below remains selectable as a fallback.
    }
  }

  // Only rows the user has started filling appear in the results.
  const populatedMeds = meds.filter(rowHasInput);
  const populatedResults = populatedMeds
    .map((m) => resultById[m.id])
    .filter((r): r is MedResult => Boolean(r));

  return (
    <div>
      {/* Shared medication-name suggestions, sourced from the bundled dm+d subset. */}
      <datalist id="dmd-medications">
        {datalistNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <header className="no-print mb-4">
        <Link to="/" className="text-sm font-medium text-blue-700 hover:underline">
          &larr; All tools
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Repeat Medication Synchronisation
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Enter each repeat item to calculate a one-off <strong>bridging quantity</strong> that
          brings everything onto a common run-out date, plus the steady-state quantity to prescribe
          each cycle thereafter.
        </p>
        <p className="mt-2 rounded border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600">
          Reminder: use medication names only — do not enter patient names, NHS numbers or other
          identifiers.
        </p>
      </header>

      <SettingsPanel
        mode={mode}
        setMode={setMode}
        defaultCycleLength={defaultCycleLength}
        setDefaultCycleLength={setDefaultCycleLength}
        targetDate={targetDate}
        setTargetDate={setTargetDate}
        roundToPacks={roundToPacks}
        setRoundToPacks={setRoundToPacks}
      />

      <section className="no-print mb-6" aria-labelledby="meds-heading">
        <h2
          id="meds-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500"
        >
          Medications
        </h2>
        <div className="space-y-3">
          {meds.map((m, i) => (
            <MedicationRow
              key={m.id}
              index={i}
              med={m}
              result={resultById[m.id]}
              onChange={(patch) => updateMed(m.id, patch)}
              onRemove={meds.length > 1 ? () => removeRow(m.id) : undefined}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          + Add medication
        </button>
      </section>

      <ResultsPanel
        result={result}
        settings={settings}
        rows={populatedResults}
        onCopy={copySummary}
        copied={copied}
      />
    </div>
  );
}

function SettingsPanel({
  mode,
  setMode,
  defaultCycleLength,
  setDefaultCycleLength,
  targetDate,
  setTargetDate,
  roundToPacks,
  setRoundToPacks,
}: {
  mode: SyncMode;
  setMode: (m: SyncMode) => void;
  defaultCycleLength: number;
  setDefaultCycleLength: (n: number) => void;
  targetDate: string;
  setTargetDate: (s: string) => void;
  roundToPacks: boolean;
  setRoundToPacks: (b: boolean) => void;
}) {
  return (
    <section
      className="no-print mb-6 rounded-lg border border-slate-200 bg-white p-4"
      aria-labelledby="settings-heading"
    >
      <h2
        id="settings-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
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
          <legend className="font-medium text-slate-700">Synchronisation mode</legend>
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
          <span className="text-slate-700">
            Round up to whole packs (where a pack size is set)
          </span>
        </label>
      </div>
    </section>
  );
}

function MedicationRow({
  index,
  med,
  result,
  onChange,
  onRemove,
}: {
  index: number;
  med: MedicationInput;
  result: MedResult | undefined;
  onChange: (patch: Partial<MedicationInput>) => void;
  onRemove?: () => void;
}) {
  const active = rowHasInput(med);
  const qtyError = active && (med.currentQuantity == null || med.currentQuantity < 0);
  const doseError = active && (med.dailyDose == null || med.dailyDose <= 0);
  const cycleError = med.cycleLength != null && med.cycleLength <= 0;

  const qtyErrId = `${med.id}-qty-err`;
  const doseErrId = `${med.id}-dose-err`;
  const cycleErrId = `${med.id}-cycle-err`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="grid items-start gap-3 sm:grid-cols-12">
        <Field className="sm:col-span-4" label="Medication">
          <input
            type="text"
            value={med.name}
            placeholder="e.g. Amlodipine 5mg tablets"
            list="dmd-medications"
            aria-label={`Medication name, row ${index + 1}`}
            onChange={(e) => {
              const name = e.target.value;
              const patch: Partial<MedicationInput> = { name };
              // Helpfully prefill pack size when the picked dm+d item has a
              // single known pack and the user hasn't set one.
              const packs = packSizesFor(name);
              if (med.packSize == null && packs.length === 1) patch.packSize = packs[0];
              onChange(patch);
            }}
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
          />
        </Field>

        <Field
          className="sm:col-span-2"
          label="Current qty"
          error={qtyError && <FieldError id={qtyErrId}>Enter the current quantity held.</FieldError>}
        >
          <input
            type="number"
            min={0}
            inputMode="decimal"
            value={numStr(med.currentQuantity)}
            aria-label={`Current qty, row ${index + 1}`}
            aria-invalid={qtyError || undefined}
            aria-describedby={qtyError ? qtyErrId : undefined}
            onChange={(e) => onChange({ currentQuantity: toNum(e.target.value) })}
            className={inputCls(qtyError)}
          />
        </Field>

        <Field
          className="sm:col-span-2"
          label="Dose/day"
          error={
            doseError && <FieldError id={doseErrId}>Daily dose must be greater than 0.</FieldError>
          }
        >
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={numStr(med.dailyDose)}
            aria-label={`Dose/day, row ${index + 1}`}
            aria-invalid={doseError || undefined}
            aria-describedby={doseError ? doseErrId : undefined}
            onChange={(e) => onChange({ dailyDose: toNum(e.target.value) })}
            className={inputCls(doseError)}
          />
        </Field>

        <Field
          className="sm:col-span-2"
          label="Cycle (days)"
          error={cycleError && <FieldError id={cycleErrId}>Cycle must be 1 day or more.</FieldError>}
        >
          <input
            type="number"
            min={1}
            value={numStr(med.cycleLength)}
            aria-label={`Cycle (days), row ${index + 1}`}
            aria-invalid={cycleError || undefined}
            aria-describedby={cycleError ? cycleErrId : undefined}
            onChange={(e) => onChange({ cycleLength: toNum(e.target.value) })}
            className={inputCls(cycleError)}
          />
        </Field>

        <Field className="sm:col-span-2" label="Pack size">
          <input
            type="number"
            min={1}
            value={numStr(med.packSize)}
            aria-label={`Pack size, row ${index + 1}`}
            onChange={(e) => onChange({ packSize: toNum(e.target.value) })}
            className={inputCls(false)}
          />
        </Field>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={med.excludeFromSync ?? false}
            onChange={(e) => onChange({ excludeFromSync: e.target.checked })}
          />
          <span>Variable / PRN — list but don’t calculate</span>
        </label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove row ${index + 1}`}
            className="rounded px-2 py-1 text-sm text-red-700 hover:bg-red-50"
          >
            Remove
          </button>
        )}
      </div>

      {active && result && (
        <p className="mt-2 text-sm text-slate-600">
          {result.included && result.bridgingQty != null ? (
            <>
              Bridge now:{' '}
              <span className="font-semibold text-slate-900">{result.bridgingQty}</span> · ongoing
              per cycle: {result.ongoingQty} · current supply ~
              {Math.floor(result.daysRemaining ?? 0)} days
              {result.flags.includes('alreadySupplied') && (
                <span className="text-amber-700"> · already supplied beyond sync date</span>
              )}
            </>
          ) : (
            <span className="text-amber-700">{describeExclusion(result)}</span>
          )}
        </p>
      )}
    </div>
  );
}

function ResultsPanel({
  result,
  settings,
  rows,
  onCopy,
  copied,
}: {
  result: SyncResult;
  settings: SyncSettings;
  rows: MedResult[];
  onCopy: () => void;
  copied: boolean;
}) {
  const summaryText = buildSummaryText(result, settings);
  const hasRows = rows.length > 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4" aria-labelledby="results-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2
          id="results-heading"
          className="text-sm font-semibold uppercase tracking-wide text-slate-500"
        >
          Results
        </h2>
        <div className="no-print flex gap-2">
          <button
            type="button"
            onClick={onCopy}
            disabled={!result.canCalculate}
            className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Announce key results to screen readers when they change. */}
      <div aria-live="polite">
        {result.errors.length > 0 && (
          <ul className="mb-3 list-disc rounded border border-amber-300 bg-amber-50 py-2 pl-8 pr-3 text-sm text-amber-900">
            {result.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        {result.canCalculate && result.horizonDays != null && result.syncRunOutDate && (
          <dl className="mb-4 grid grid-cols-2 gap-3 rounded-md bg-blue-50 p-3 text-sm sm:grid-cols-4">
            <SummaryStat label="Mode" value={MODE_OPTIONS.find((o) => o.value === settings.mode)?.label ?? settings.mode} />
            <SummaryStat label="Cycle length" value={`${settings.defaultCycleLength} days`} />
            <SummaryStat label="Sync horizon" value={`${result.horizonDays} days`} />
            <SummaryStat label="Common run-out / next order" value={formatDate(result.syncRunOutDate)} />
          </dl>
        )}
      </div>

      {hasRows ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Bridging and ongoing quantities per medication
            </caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th scope="col" className="py-2 pr-3 font-medium">Medication</th>
                <th scope="col" className="py-2 pr-3 font-medium">Current supply</th>
                <th scope="col" className="py-2 pr-3 font-medium">Bridge now</th>
                <th scope="col" className="py-2 pr-3 font-medium">Ongoing / cycle</th>
                <th scope="col" className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <ResultRow key={r.id} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Add at least one medication with a quantity and a daily dose to see results.
        </p>
      )}

      {/* Plain-text summary for copy/paste and print. */}
      {hasRows && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            Plain-text summary (copyable)
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm text-slate-800">
            {summaryText}
          </pre>
        </details>
      )}
    </section>
  );
}

function ResultRow({ r }: { r: MedResult }) {
  const calculated = r.included && r.bridgingQty != null;
  return (
    <tr className={['border-b border-slate-100', calculated ? '' : 'bg-amber-50/60'].join(' ')}>
      <th scope="row" className="py-2 pr-3 text-left font-medium text-slate-900">
        {r.name || <span className="italic text-slate-400">(unnamed)</span>}
      </th>
      <td className="py-2 pr-3 text-slate-600">
        {r.daysRemaining != null ? `~${Math.floor(r.daysRemaining)} days` : '—'}
      </td>
      <td className="py-2 pr-3">
        {calculated ? (
          // Bridging quantity is the visually dominant figure per PRD §9.
          <span className="text-xl font-bold tabular-nums text-slate-900">{r.bridgingQty}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="py-2 pr-3 tabular-nums text-slate-600">
        {calculated ? r.ongoingQty : '—'}
      </td>
      <td className="py-2 text-slate-600">
        {calculated ? (
          r.flags.includes('alreadySupplied') ? (
            <span className="text-amber-700">Already supplied beyond sync date</span>
          ) : (
            <span className="text-green-700">OK</span>
          )
        ) : (
          <span className="text-amber-700">{describeExclusion(r)}</span>
        )}
      </td>
    </tr>
  );
}

function describeExclusion(r: MedResult | undefined): string {
  if (!r) return 'Not calculated';
  if (r.flags.includes('excluded')) return 'Not calculated (variable / PRN)';
  if (r.flags.includes('invalidDose')) return 'Not calculated (missing or invalid daily dose)';
  if (r.flags.includes('missingQuantity')) return 'Not calculated (missing quantity)';
  if (r.flags.includes('invalidCycle')) return 'Not calculated (invalid cycle length)';
  return 'Not calculated';
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function Field({
  label,
  className,
  error,
  children,
}: {
  label: string;
  className?: string;
  // Rendered as a sibling of the label so it never becomes part of the input's
  // accessible name.
  error?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={['text-sm', className].filter(Boolean).join(' ')}>
      <label className="block">
        <span className="font-medium text-slate-700">{label}</span>
        {children}
      </label>
      {error}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span id={id} role="alert" className="mt-1 block text-xs text-red-700">
      {children}
    </span>
  );
}

function inputCls(error: boolean): string {
  return [
    'mt-1 block w-full rounded border px-2 py-1',
    error ? 'border-red-400 bg-red-50' : 'border-slate-300',
  ].join(' ');
}
