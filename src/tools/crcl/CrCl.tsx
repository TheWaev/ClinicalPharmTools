import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  calculateCrCl,
  type CreatinineUnit,
  type CrClInput,
  type Sex,
  type WeightBasis,
} from './crclEngine';
import { buildCrClSummary } from './summary';
import {
  HeartPulseIcon,
  ClipboardIcon,
  CopyIcon,
  PrinterIcon,
  ChevronLeftIcon,
  InfoIcon,
  CheckIcon,
  AlertIcon,
  ArrowRightIcon,
} from '../../components/icons';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const sectionTitle =
  'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500';
const fieldLabel = 'text-sm font-medium text-slate-700';
const inputCls =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25';

function toNum(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function numStr(value: number | null): string {
  return value == null ? '' : String(value);
}

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];
const UNIT_OPTIONS = [
  { value: 'umol/L', label: 'µmol/L' },
  { value: 'mg/dL', label: 'mg/dL' },
];
const BASIS_OPTIONS = [
  { value: 'actual', label: 'Actual' },
  { value: 'ideal', label: 'Ideal (Devine)' },
  { value: 'adjusted', label: 'Adjusted' },
];

export default function CrCl() {
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex>('male');
  const [creatinine, setCreatinine] = useState<number | null>(null);
  const [creatinineUnit, setCreatinineUnit] = useState<CreatinineUnit>('umol/L');
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightBasis, setWeightBasis] = useState<WeightBasis>('actual');
  const [copied, setCopied] = useState(false);

  const input: CrClInput = { age, sex, creatinine, creatinineUnit, weightKg, heightCm, weightBasis };
  const result = useMemo(() => calculateCrCl(input), [input]);

  const touched = age != null || creatinine != null || weightKg != null;

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildCrClSummary(input, result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — printable summary remains */
    }
  }

  const needsHeight = weightBasis !== 'actual';

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
            <HeartPulseIcon className="h-6 w-6" weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Creatinine Clearance (CrCl)
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Estimates creatinine clearance using the <strong>Cockcroft–Gault</strong> equation —
              an aid for renal dose adjustment, not a measured GFR.
            </p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          <InfoIcon className="h-4 w-4 shrink-0 text-slate-400" weight="fill" />
          Enter clinical values only — do not enter patient names, NHS numbers or other identifiers.
        </p>
      </div>

      <div className="space-y-5">
        <section className={`no-print ${card}`} aria-labelledby="inputs-heading">
          <h2 id="inputs-heading" className={`mb-4 ${sectionTitle}`}>
            <HeartPulseIcon className="h-4 w-4 text-teal-600" weight="fill" />
            Patient values
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="crcl-age" className={fieldLabel}>
                Age (years)
              </label>
              <input
                id="crcl-age"
                type="number"
                min={0}
                inputMode="numeric"
                value={numStr(age)}
                onChange={(e) => setAge(toNum(e.target.value))}
                className={inputCls}
              />
            </div>

            <Segmented legend="Sex" name="crcl-sex" value={sex} options={SEX_OPTIONS} onChange={(v) => setSex(v as Sex)} />

            <div>
              <label htmlFor="crcl-scr" className={fieldLabel}>
                Serum creatinine
              </label>
              <input
                id="crcl-scr"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={numStr(creatinine)}
                onChange={(e) => setCreatinine(toNum(e.target.value))}
                className={inputCls}
              />
            </div>

            <Segmented
              legend="Creatinine units"
              name="crcl-unit"
              value={creatinineUnit}
              options={UNIT_OPTIONS}
              onChange={(v) => setCreatinineUnit(v as CreatinineUnit)}
            />

            <div>
              <label htmlFor="crcl-weight" className={fieldLabel}>
                Weight (kg)
              </label>
              <input
                id="crcl-weight"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={numStr(weightKg)}
                onChange={(e) => setWeightKg(toNum(e.target.value))}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="crcl-height" className={fieldLabel}>
                Height (cm){' '}
                <span className="font-normal text-slate-400">
                  {needsHeight ? '· required' : '· for ideal/adjusted'}
                </span>
              </label>
              <input
                id="crcl-height"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={numStr(heightCm)}
                onChange={(e) => setHeightCm(toNum(e.target.value))}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <Segmented
                legend="Weight used in the equation"
                name="crcl-basis"
                value={weightBasis}
                options={BASIS_OPTIONS}
                onChange={(v) => setWeightBasis(v as WeightBasis)}
              />
            </div>
          </div>
        </section>

        <ResultsPanel input={input} result={result} touched={touched} onCopy={copySummary} copied={copied} />
      </div>
    </div>
  );
}

function ResultsPanel({
  input,
  result,
  touched,
  onCopy,
  copied,
}: {
  input: CrClInput;
  result: ReturnType<typeof calculateCrCl>;
  touched: boolean;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <section className={card} aria-labelledby="crcl-results-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="crcl-results-heading" className={sectionTitle}>
          <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
          Result
        </h2>
        <div className="no-print flex gap-2">
          <button
            type="button"
            onClick={onCopy}
            disabled={!result.ok}
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
        {touched && result.errors.length > 0 && (
          <div className="mb-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" weight="fill" />
            <ul className="space-y-1">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {result.ok && result.crclMlMin != null ? (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-teal-700">Estimated CrCl</p>
            <p className="mt-1">
              <span className="text-4xl font-extrabold tabular-nums text-teal-800">
                {result.crclMlMin.toFixed(0)}
              </span>
              <span className="ml-1.5 text-lg font-medium text-teal-700">mL/min</span>
            </p>
            <p className="mt-1 text-xs text-teal-700/80">
              Using {result.weightUsedKg?.toFixed(1)} kg ({input.weightBasis} body weight),
              Cockcroft–Gault
            </p>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
            Enter age, serum creatinine and weight to estimate creatinine clearance.
          </p>
        )}

        {(result.idealBodyWeightKg != null || result.adjustedBodyWeightKg != null) && (
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {input.weightKg != null && <Stat label="Actual weight" value={`${input.weightKg} kg`} />}
            {result.idealBodyWeightKg != null && (
              <Stat label="Ideal (Devine)" value={`${result.idealBodyWeightKg.toFixed(1)} kg`} />
            )}
            {result.adjustedBodyWeightKg != null && (
              <Stat label="Adjusted" value={`${result.adjustedBodyWeightKg.toFixed(1)} kg`} />
            )}
          </dl>
        )}

        {result.flags.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm text-amber-800">
            {result.flags.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" weight="fill" />
                {f === 'lowCreatinine'
                  ? 'Low serum creatinine may overestimate CrCl (low muscle mass / elderly). Consider local rounding policy.'
                  : 'Cockcroft–Gault is not validated in under-18s.'}
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="mt-4">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowRightIcon className="h-3.5 w-3.5" />
          Plain-text summary (copyable)
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          {buildCrClSummary(input, result)}
        </pre>
      </details>
    </section>
  );
}

function Segmented({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className={`mb-2 ${fieldLabel}`}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label key={opt.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="peer sr-only"
            />
            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 transition hover:border-slate-300 peer-checked:border-teal-500 peer-checked:bg-teal-50 peer-checked:font-medium peer-checked:text-teal-700 peer-checked:ring-1 peer-checked:ring-teal-500 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500/40">
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

