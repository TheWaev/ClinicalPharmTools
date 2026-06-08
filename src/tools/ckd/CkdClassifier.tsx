import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  classifyCkd,
  heatMapRisk,
  type CkdInput,
  type Risk,
  type GfrCategory,
  type AcrCategory,
} from './ckdStaging';
import { buildCkdSummary } from './summary';
import References, { type Reference } from '../../components/References';
import {
  FunnelIcon,
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

const RISK_LABEL: Record<Risk, string> = {
  low: 'Low risk',
  moderate: 'Moderately increased risk',
  high: 'High risk',
  'very-high': 'Very high risk',
};
const RISK_CELL: Record<Risk, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  moderate: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-200 text-orange-900',
  'very-high': 'bg-red-200 text-red-900',
};
const RISK_BANNER: Record<Risk, string> = {
  low: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  moderate: 'border-amber-200 bg-amber-50 text-amber-800',
  high: 'border-orange-200 bg-orange-50 text-orange-900',
  'very-high': 'border-red-200 bg-red-50 text-red-900',
};

const GFR_ROWS: GfrCategory[] = ['G1', 'G2', 'G3a', 'G3b', 'G4', 'G5'];
const GFR_DESC: Record<GfrCategory, string> = {
  G1: '≥90',
  G2: '60–89',
  G3a: '45–59',
  G3b: '30–44',
  G4: '15–29',
  G5: '<15',
};
const ACR_COLS: AcrCategory[] = ['A1', 'A2', 'A3'];
const ACR_DESC: Record<AcrCategory, string> = {
  A1: '<3',
  A2: '3–30',
  A3: '>30',
};

const REFERENCES: Reference[] = [
  {
    label: 'NICE NG203 — Chronic kidney disease: assessment and management (2021).',
    href: 'https://www.nice.org.uk/guidance/ng203',
  },
  {
    label: 'KDIGO 2012/2024 — Clinical Practice Guideline for the Evaluation and Management of CKD (GFR/ACR categories and risk heat-map).',
  },
];

export default function CkdClassifier() {
  const [eGFR, setEgfr] = useState<number | null>(null);
  const [acr, setAcr] = useState<number | null>(null);
  const [diabetes, setDiabetes] = useState(false);
  const [haematuria, setHaematuria] = useState(false);
  const [acceleratedProgression, setAccel] = useState(false);
  const [resistantHypertension, setResHtn] = useState(false);
  const [geneticCause, setGenetic] = useState(false);
  const [renalArteryStenosis, setRas] = useState(false);
  const [copied, setCopied] = useState(false);

  const input: CkdInput = {
    eGFR,
    acr,
    diabetes,
    haematuria,
    acceleratedProgression,
    resistantHypertension,
    geneticCause,
    renalArteryStenosis,
  };
  const result = useMemo(() => classifyCkd(input), [input]);
  const touched = eGFR != null || acr != null;

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildCkdSummary(result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — printable summary remains */
    }
  }

  const flagOptions = [
    ['diabetes', 'Diabetes', diabetes, setDiabetes],
    ['haematuria', 'Persistent haematuria', haematuria, setHaematuria],
    ['accel', 'Accelerated progression (sustained fall in eGFR)', acceleratedProgression, setAccel],
    ['resHtn', 'BP uncontrolled on ≥4 antihypertensives', resistantHypertension, setResHtn],
    ['genetic', 'Suspected rare / genetic cause', geneticCause, setGenetic],
    ['ras', 'Suspected renal artery stenosis', renalArteryStenosis, setRas],
  ] as const;

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
            <FunnelIcon className="h-6 w-6" weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">CKD Classification (KDIGO)</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Classifies CKD by GFR and albuminuria (KDIGO heat-map) and checks{' '}
              <strong>NICE NG203</strong> nephrology referral criteria. Confirm abnormalities are
              sustained for &gt;3 months.
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
            <FunnelIcon className="h-4 w-4 text-teal-600" weight="fill" />
            Results
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="ckd-egfr" className={fieldLabel}>
                eGFR (mL/min/1.73 m²)
              </label>
              <input
                id="ckd-egfr"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={numStr(eGFR)}
                onChange={(e) => setEgfr(toNum(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="ckd-acr" className={fieldLabel}>
                Urine ACR (mg/mmol)
              </label>
              <input
                id="ckd-acr"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={numStr(acr)}
                onChange={(e) => setAcr(toNum(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>
          <fieldset className="mt-5">
            <legend className={`mb-2 ${fieldLabel}`}>Additional factors (for referral check)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {flagOptions.map(([key, label, val, set]) => (
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
        </section>

        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className={sectionTitle}>
              <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
              Classification
            </h2>
            <div className="no-print flex gap-2">
              <button
                type="button"
                onClick={copySummary}
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

            {result.ok && result.risk && result.gfrCategory && result.acrCategory ? (
              <>
                <div className={`rounded-xl border p-4 ${RISK_BANNER[result.risk]}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-bold">{result.stageLabel}</p>
                    <span className="rounded-full bg-white/60 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                      {RISK_LABEL[result.risk]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm">{result.ckdNote}</p>
                </div>

                <HeatMap gfr={result.gfrCategory} acr={result.acrCategory} />
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
                Enter eGFR and urine ACR to classify.
              </p>
            )}

            {result.ok && (
              <div
                className={[
                  'mt-4 rounded-xl border p-4',
                  result.referral ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50',
                ].join(' ')}
              >
                <p className="text-sm font-semibold text-slate-900">
                  {result.referral ? 'Consider nephrology referral' : 'No referral criterion met'}
                </p>
                {result.referral && (
                  <ul className="mt-1.5 space-y-1 text-sm text-amber-900">
                    {result.referralReasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-2">
                        <ArrowRightIcon className="mt-0.5 h-4 w-4 shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Management prompts (NG203)
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {result.recommendations.map((rec) => (
                    <li key={rec} className="flex items-start gap-2">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" weight="bold" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {result.ok && (
            <details className="mt-4">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                <ArrowRightIcon className="h-3.5 w-3.5" />
                Plain-text summary (copyable)
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                {buildCkdSummary(result)}
              </pre>
            </details>
          )}
        </section>

        <References
          note="CKD requires the abnormality to be present for >3 months — this tool classifies a single set of values and does not assess chronicity. ACR ≥70 mg/mmol referral does not apply if albuminuria is caused by diabetes and already optimally treated."
          items={REFERENCES}
        />
      </div>
    </div>
  );
}

function HeatMap({ gfr, acr }: { gfr: GfrCategory; acr: AcrCategory }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        KDIGO risk heat-map
      </p>
      <table className="border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="p-1 font-medium text-slate-400">
              GFR ↓ / ACR →
            </th>
            {ACR_COLS.map((a) => (
              <th key={a} className="p-1 font-semibold text-slate-600">
                {a}
                <span className="block font-normal text-slate-400">{ACR_DESC[a]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GFR_ROWS.map((g) => (
            <tr key={g}>
              <th className="p-1 text-right font-semibold text-slate-600">
                {g}
                <span className="block font-normal text-slate-400">{GFR_DESC[g]}</span>
              </th>
              {ACR_COLS.map((a) => {
                const cellRisk = heatMapRisk(g, a);
                const isCurrent = g === gfr && a === acr;
                return (
                  <td
                    key={a}
                    className={[
                      'h-9 w-14 rounded font-semibold',
                      RISK_CELL[cellRisk],
                      isCurrent ? 'ring-2 ring-slate-900 ring-offset-1' : 'opacity-70',
                    ].join(' ')}
                  >
                    {isCurrent ? '●' : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
