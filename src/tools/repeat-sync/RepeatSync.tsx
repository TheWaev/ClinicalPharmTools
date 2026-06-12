import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
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
import { packSizesFor, searchMedications, TOP_PRIMARY_CARE_DRUGS } from './dmdData';
import References from '../../components/References';
import {
  CalculatorIcon,
  SettingsIcon,
  PillIcon,
  ClipboardIcon,
  CalendarIcon,
  CopyIcon,
  PrinterIcon,
  PlusIcon,
  TrashIcon,
  ChevronLeftIcon,
  InfoIcon,
  CheckIcon,
  AlertIcon,
  ArrowRightIcon,
} from '../../components/icons';

const DEFAULT_CYCLE = 56;

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

function toNum(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function numStr(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

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

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const sectionTitle =
  'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500';
const fieldLabel = 'text-sm font-medium text-slate-700';

function inputCls(error = false): string {
  return [
    'mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 shadow-sm transition',
    'placeholder:text-slate-400 focus:outline-none focus:ring-2',
    error
      ? 'border border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-500/20'
      : 'border border-slate-300 bg-white focus:border-teal-500 focus:ring-teal-500/25',
  ].join(' ');
}

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

  const populatedResults = meds
    .filter(rowHasInput)
    .map((m) => resultById[m.id])
    .filter((r): r is MedResult => Boolean(r));

  return (
    <div>
      <div className="no-print mb-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          All tools
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100">
            <CalculatorIcon className="h-6 w-6" weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Repeat Medication Synchronisation
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Enter each repeat item to calculate a one-off <strong>bridging quantity</strong> that
              brings everything onto a common run-out date, plus the steady-state quantity to
              prescribe each cycle.
            </p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          <InfoIcon className="h-4 w-4 shrink-0 text-slate-400" weight="fill" />
          Use medication names only — do not enter patient names, NHS numbers or other identifiers.
        </p>
      </div>

      <div className="space-y-5">
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

        <section className="no-print" aria-labelledby="meds-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="meds-heading" className={sectionTitle}>
              <PillIcon className="h-4 w-4 text-teal-600" weight="fill" />
              Medications
            </h2>
            <span className="text-xs text-slate-400">{meds.length} rows</span>
          </div>
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
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-teal-300 hover:bg-teal-50/40 hover:text-teal-700"
          >
            <PlusIcon className="h-4 w-4" />
            Add medication
          </button>
        </section>

        <ResultsPanel
          result={result}
          settings={settings}
          rows={populatedResults}
          onCopy={copySummary}
          copied={copied}
        />

        <References
          title="Method & assumptions"
          note={
            <>
              Days of supply = current quantity ÷ daily dose. Each included item is topped up to a
              common run-out horizon (its bridging quantity), then the ongoing quantity per cycle =
              cycle length × daily dose. Quantities are always rounded up — to whole units, or whole
              packs when a pack size is given. The default 56-day (2-monthly) cycle reflects common UK
              repeat-prescribing practice; variable-dose / PRN items are listed but excluded from the
              calculation.
            </>
          }
        />
      </div>
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
    <section className={`no-print ${card}`} aria-labelledby="settings-heading">
      <h2 id="settings-heading" className={`mb-4 ${sectionTitle}`}>
        <SettingsIcon className="h-4 w-4 text-teal-600" weight="bold" />
        Synchronisation settings
      </h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="default-cycle" className={fieldLabel}>
            Default cycle length (days)
          </label>
          <input
            id="default-cycle"
            type="number"
            min={1}
            step={1}
            value={defaultCycleLength}
            onChange={(e) => setDefaultCycleLength(toNum(e.target.value) ?? DEFAULT_CYCLE)}
            className={`${inputCls()} w-32`}
          />
        </div>

        <div className="sm:col-span-2">
          <fieldset>
            <legend className={`mb-2 ${fieldLabel}`}>Synchronisation mode</legend>
            <div className="flex flex-wrap gap-2">
              {MODE_OPTIONS.map((opt) => (
                <label key={opt.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="sync-mode"
                    value={opt.value}
                    checked={mode === opt.value}
                    onChange={() => setMode(opt.value)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 transition hover:border-slate-300 peer-checked:border-teal-500 peer-checked:bg-teal-50 peer-checked:font-medium peer-checked:text-teal-700 peer-checked:ring-1 peer-checked:ring-teal-500 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500/40">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {mode === 'targetDate' && (
          <div>
            <label htmlFor="target-date" className={fieldLabel}>
              Target date
            </label>
            <div className="relative">
              <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={`${inputCls()} pl-9`}
              />
            </div>
          </div>
        )}

        <label className="flex items-center gap-2.5 self-end text-sm">
          <input
            type="checkbox"
            checked={roundToPacks}
            onChange={(e) => setRoundToPacks(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-teal-600 focus:ring-teal-500/30"
          />
          <span className="text-slate-700">Round up to whole packs (where a pack size is set)</span>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
          {index + 1}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Medication
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove row ${index + 1}`}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
            Remove
          </button>
        )}
      </div>

      <div className="grid items-start gap-3 sm:grid-cols-12">
        <Field className="sm:col-span-4" label="Medication">
          <MedicationCombobox
            value={med.name}
            ariaLabel={`Medication name, row ${index + 1}`}
            onChange={(name) => {
              const patch: Partial<MedicationInput> = { name };
              const packs = packSizesFor(name);
              if (med.packSize == null && packs.length === 1) patch.packSize = packs[0];
              onChange(patch);
            }}
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
            className={inputCls()}
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={med.excludeFromSync ?? false}
            onChange={(e) => onChange({ excludeFromSync: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 accent-teal-600 focus:ring-teal-500/30"
          />
          <span>Variable / PRN — list but don’t calculate</span>
        </label>
      </div>

      {active && result && (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          {result.included && result.bridgingQty != null ? (
            <span className="text-slate-600">
              Bridge now:{' '}
              <span className="font-semibold text-teal-700">{result.bridgingQty}</span> · ongoing per
              cycle: {result.ongoingQty} · current supply ~{Math.floor(result.daysRemaining ?? 0)}{' '}
              days
              {result.flags.includes('alreadySupplied') && (
                <span className="text-amber-700"> · already supplied beyond sync date</span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <AlertIcon className="h-4 w-4" weight="fill" />
              {describeExclusion(result)}
            </span>
          )}
        </div>
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
  const showStats = result.canCalculate && result.horizonDays != null && result.syncRunOutDate;

  return (
    <section className={card} aria-labelledby="results-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="results-heading" className={sectionTitle}>
          <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
          Results
        </h2>
        <div className="no-print flex gap-2">
          <button
            type="button"
            onClick={onCopy}
            disabled={!result.canCalculate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? <CheckIcon className="h-4 w-4" weight="bold" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy summary'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <PrinterIcon className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      <div aria-live="polite">
        {result.errors.length > 0 && (
          <div className="mb-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" weight="fill" />
            <ul className="space-y-1">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {showStats && result.horizonDays != null && result.syncRunOutDate && (
          <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Mode" value={MODE_OPTIONS.find((o) => o.value === settings.mode)?.label ?? settings.mode} />
            <Stat label="Cycle length" value={`${settings.defaultCycleLength} days`} />
            <Stat label="Sync horizon" value={`${result.horizonDays} days`} highlight />
            <Stat
              label="Common run-out / next order"
              value={formatDate(result.syncRunOutDate)}
              icon={<CalendarIcon className="h-4 w-4 text-teal-600" />}
            />
          </dl>
        )}
      </div>

      {hasRows ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Bridging and ongoing quantities per medication</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th scope="col" className="py-2 pr-3 font-medium">Medication</th>
                <th scope="col" className="py-2 pr-3 font-medium">Supply</th>
                <th scope="col" className="py-2 pr-3 font-medium">Bridge now</th>
                <th scope="col" className="py-2 pr-3 font-medium">Ongoing</th>
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
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
          Add at least one medication with a quantity and a daily dose to see results.
        </p>
      )}

      {hasRows && (
        <details className="mt-4">
          <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowRightIcon className="h-3.5 w-3.5" />
            Plain-text summary (copyable)
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
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
    <tr className={['border-b border-slate-100', calculated ? '' : 'bg-amber-50/40'].join(' ')}>
      <th scope="row" className="py-3 pr-3 text-left font-medium text-slate-900">
        {r.name || <span className="italic text-slate-400">(unnamed)</span>}
      </th>
      <td className="py-3 pr-3 text-slate-500">
        {r.daysRemaining != null ? `~${Math.floor(r.daysRemaining)} days` : '—'}
      </td>
      <td className="py-3 pr-3">
        {calculated ? (
          // Bridging quantity is the visually dominant figure per PRD §9.
          <span className="text-2xl font-extrabold tabular-nums text-teal-700">{r.bridgingQty}</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="py-3 pr-3 tabular-nums text-slate-600">{calculated ? r.ongoingQty : '—'}</td>
      <td className="py-3">
        {calculated ? (
          r.flags.includes('alreadySupplied') ? (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <AlertIcon className="h-4 w-4" weight="fill" />
              Already supplied
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-teal-700">
              <CheckIcon className="h-4 w-4" weight="fill" />
              OK
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <AlertIcon className="h-4 w-4" weight="fill" />
            {describeExclusion(r)}
          </span>
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

function Stat({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={[
        'rounded-xl border p-3',
        highlight ? 'border-teal-200 bg-teal-50' : 'border-slate-200 bg-slate-50/60',
      ].join(' ')}
    >
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </dt>
      <dd
        className={[
          'mt-1 font-semibold',
          highlight ? 'text-lg text-teal-800' : 'text-slate-900',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  );
}

function MedicationCombobox({
  value,
  ariaLabel,
  onChange,
}: {
  value: string;
  ariaLabel: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Before the user has typed enough to search dm+d (<2 chars), offer the common
  // primary-care drugs (filtered by any leading character). Picking one is a
  // "narrow" step — it fills the generic name and keeps the list open so the
  // dm+d search can then surface the specific strength/form.
  const query = value.trim().toLowerCase();
  const quickPick = query.length < 2;
  const suggestions = useMemo(
    () =>
      quickPick
        ? TOP_PRIMARY_CARE_DRUGS.filter((d) => d.toLowerCase().startsWith(query))
        : searchMedications(value, 50),
    [value, quickPick, query],
  );
  const showList = open && suggestions.length > 0;

  function choose(name: string) {
    onChange(name);
    setActive(-1);
    // Narrowing to a generic keeps the list open to pick a strength; selecting a
    // full dm+d product closes it.
    setOpen(quickPick);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && showList && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder="Start typing, e.g. ramipril"
        aria-label={ariaLabel}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={inputCls()}
      />
      {showList && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {quickPick && (
            <li
              aria-hidden
              className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
            >
              Common in primary care
            </li>
          )}
          {suggestions.map((name, i) => (
            <li key={name} role="option" aria-selected={i === active}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(name)}
                onMouseEnter={() => setActive(i)}
                className={[
                  'block w-full px-3 py-1.5 text-left',
                  i === active ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50',
                ].join(' ')}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
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
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={['text-sm', className].filter(Boolean).join(' ')}>
      <label className="block">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {children}
      </label>
      {error}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} role="alert" className="mt-1 block text-xs text-red-600">
      {children}
    </span>
  );
}
