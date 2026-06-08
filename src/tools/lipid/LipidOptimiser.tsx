import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  optimiseLipids,
  type LipidInput,
  type Prevention,
  type StatinKey,
  type Intensity,
  STATIN_LABELS,
} from './lipidOptimiser';
import { buildLipidSummary } from './summary';
import References, { type Reference } from '../../components/References';
import {
  HeartIcon,
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
const checkboxRow =
  'flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700';
const checkboxCls =
  'mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-teal-600 focus:ring-teal-500/30';

function toNum(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function numStr(value: number | null): string {
  return value == null ? '' : String(value);
}

const PREVENTION_OPTIONS = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary (established CVD)' },
];

const STATIN_OPTIONS: { value: StatinKey; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'atorvastatin', label: 'Atorvastatin' },
  { value: 'rosuvastatin', label: 'Rosuvastatin' },
  { value: 'simvastatin', label: 'Simvastatin' },
  { value: 'pravastatin', label: 'Pravastatin' },
  { value: 'fluvastatin', label: 'Fluvastatin' },
];

const INTENSITY_STYLE: Record<Intensity, string> = {
  none: 'bg-slate-100 text-slate-600',
  low: 'bg-amber-100 text-amber-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-teal-100 text-teal-700',
};
const INTENSITY_LABEL: Record<Intensity, string> = {
  none: 'No statin',
  low: 'Low intensity',
  medium: 'Medium intensity',
  high: 'High intensity',
};

const REFERENCES: Reference[] = [
  {
    label: 'NICE NG238 — Cardiovascular disease: risk assessment and reduction, including lipid modification (2023).',
    href: 'https://www.nice.org.uk/guidance/ng238',
  },
  {
    label: 'NHS England — Lipid optimisation pathway: secondary prevention in primary care and the community.',
    href: 'https://www.england.nhs.uk/long-read/lipid-optimisation-pathway-secondary-prevention-in-primary-care-and-the-community/',
  },
  {
    label:
      'Statin intensity bands (% LDL-C reduction): low 20–30%, medium 31–40%, high >40% (NICE NG238).',
  },
];

export default function LipidOptimiser() {
  const [prevention, setPrevention] = useState<Prevention>('primary');
  const [qrisk, setQrisk] = useState<number | null>(null);
  const [ckd, setCkd] = useState(false);
  const [type1Diabetes, setType1] = useState(false);
  const [type2Diabetes, setType2] = useState(false);
  const [currentStatin, setCurrentStatin] = useState<StatinKey>('none');
  const [currentDoseMg, setCurrentDoseMg] = useState<number | null>(null);
  const [baselineNonHdl, setBaselineNonHdl] = useState<number | null>(null);
  const [currentNonHdl, setCurrentNonHdl] = useState<number | null>(null);
  const [currentLdl, setCurrentLdl] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const input: LipidInput = {
    prevention,
    qrisk,
    ckd,
    type1Diabetes,
    type2Diabetes,
    currentStatin,
    currentDoseMg,
    baselineNonHdl,
    currentNonHdl,
    currentLdl,
  };
  const result = useMemo(() => optimiseLipids(input), [input]);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildLipidSummary(input, result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — printable summary remains */
    }
  }

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
            <HeartIcon className="h-6 w-6" weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lipid / Statin Optimiser</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Checks statin indication, intensity and lipid targets per <strong>NICE NG238</strong> and
              the NHS England lipid optimisation pathway. A decision aid, not a substitute for clinical
              judgement.
            </p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          <InfoIcon className="h-4 w-4 shrink-0 text-slate-400" weight="fill" />
          Enter clinical values only — no patient identifiers.
        </p>
      </div>

      <div className="space-y-5">
        <section className={`no-print ${card}`}>
          <h2 className={`mb-4 ${sectionTitle}`}>
            <HeartIcon className="h-4 w-4 text-teal-600" weight="fill" />
            Indication
          </h2>
          <Segmented
            legend="Prevention"
            name="lipid-prevention"
            value={prevention}
            options={PREVENTION_OPTIONS}
            onChange={(v) => setPrevention(v as Prevention)}
          />
          {prevention === 'primary' && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="lipid-qrisk" className={fieldLabel}>
                  QRISK3 — 10-year CVD risk (%)
                </label>
                <input
                  id="lipid-qrisk"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={numStr(qrisk)}
                  onChange={(e) => setQrisk(toNum(e.target.value))}
                  className={`${inputCls} w-40`}
                />
                <p className="mt-1 text-xs text-slate-400">Statin offered at ≥10%.</p>
              </div>
              <fieldset>
                <legend className={`mb-2 ${fieldLabel}`}>Qualifying conditions (offer regardless of QRISK)</legend>
                <div className="grid gap-2">
                  {([
                    ['ckd', 'Chronic kidney disease', ckd, setCkd],
                    ['t1', 'Type 1 diabetes', type1Diabetes, setType1],
                    ['t2', 'Type 2 diabetes', type2Diabetes, setType2],
                  ] as const).map(([key, label, val, set]) => (
                    <label key={key} className={checkboxRow}>
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={() => set((p) => !p)}
                        className={checkboxCls}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
        </section>

        <section className={`no-print ${card}`}>
          <h2 className={`mb-4 ${sectionTitle}`}>
            <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
            Current therapy &amp; lipids
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="lipid-statin" className={fieldLabel}>
                Current statin
              </label>
              <select
                id="lipid-statin"
                value={currentStatin}
                onChange={(e) => setCurrentStatin(e.target.value as StatinKey)}
                className={inputCls}
              >
                {STATIN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lipid-dose" className={fieldLabel}>
                Daily dose (mg)
              </label>
              <input
                id="lipid-dose"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                disabled={currentStatin === 'none'}
                value={numStr(currentDoseMg)}
                onChange={(e) => setCurrentDoseMg(toNum(e.target.value))}
                className={`${inputCls} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
              />
            </div>
            <div>
              <label htmlFor="lipid-base" className={fieldLabel}>
                Baseline non-HDL (mmol/L)
              </label>
              <input
                id="lipid-base"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={numStr(baselineNonHdl)}
                onChange={(e) => setBaselineNonHdl(toNum(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="lipid-cur" className={fieldLabel}>
                Current non-HDL (mmol/L)
              </label>
              <input
                id="lipid-cur"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={numStr(currentNonHdl)}
                onChange={(e) => setCurrentNonHdl(toNum(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="lipid-ldl" className={fieldLabel}>
                Current LDL-C (mmol/L){' '}
                <span className="font-normal text-slate-400">· optional</span>
              </label>
              <input
                id="lipid-ldl"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={numStr(currentLdl)}
                onChange={(e) => setCurrentLdl(toNum(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className={sectionTitle}>
              <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
              Recommendation
            </h2>
            <div className="no-print flex gap-2">
              <button
                type="button"
                onClick={copySummary}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
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

          <div aria-live="polite" className="space-y-3">
            <div
              className={[
                'rounded-xl border p-4',
                result.indicated ? 'border-teal-200 bg-teal-50' : 'border-slate-200 bg-slate-50',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">
                  {result.indicated ? 'Lipid-lowering therapy indicated' : 'Not routinely indicated'}
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${INTENSITY_STYLE[result.currentIntensity]}`}
                >
                  {INTENSITY_LABEL[result.currentIntensity]}
                  {currentStatin !== 'none' ? ` · ${STATIN_LABELS[currentStatin]}` : ''}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-700">{result.indicationReason}</p>
              {result.indicated && (
                <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-medium text-teal-800">
                  {result.recommendedStart}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target / response</p>
              <p className="mt-1 text-sm text-slate-700">{result.targetAssessment}</p>
              {result.targetMet != null && (
                <p
                  className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium ${result.targetMet ? 'text-teal-700' : 'text-amber-700'}`}
                >
                  {result.targetMet ? (
                    <CheckIcon className="h-4 w-4" weight="bold" />
                  ) : (
                    <AlertIcon className="h-4 w-4" weight="fill" />
                  )}
                  {result.targetMet ? 'Target met' : 'Target not met'}
                </p>
              )}
            </div>

            {result.recommendations.length > 0 && (
              <ul className="space-y-1.5 text-sm text-slate-700">
                {result.recommendations.map((rec) => (
                  <li key={rec} className="flex items-start gap-2">
                    <ArrowRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    {rec}
                  </li>
                ))}
              </ul>
            )}

            {result.warnings.length > 0 && (
              <ul className="space-y-1.5 text-sm text-amber-800">
                {result.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" weight="fill" />
                    {w}
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
              {buildLipidSummary(input, result)}
            </pre>
          </details>
        </section>

        <References
          note="QRISK3 itself is not calculated here (it needs identifiable and detailed inputs) — enter the score from your clinical system. Familial hypercholesterolaemia has different targets and is not covered."
          items={REFERENCES}
        />
      </div>
    </div>
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
