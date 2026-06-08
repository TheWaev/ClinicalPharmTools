import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  calculateEligibility,
  BOROUGHS,
  COMORBIDITIES,
  type Borough,
  type ComorbidityKey,
  type WeightMgmtInput,
} from './eligibilityEngine';
import { buildWeightMgmtSummary } from './summary';
import References, { type Reference } from '../../components/References';
import {
  ScalesIcon,
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
const checkboxCls = 'mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-teal-600 focus:ring-teal-500/30';

function toNum(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function numStr(value: number | null): string {
  return value == null ? '' : String(value);
}

const REFERENCES: Reference[] = [
  {
    label: 'NHS South East London — Weight-loss medicine (local pathway & eligibility).',
    href: 'https://www.selondonics.org/our-residents/your-health/local-nhs-services/weight-loss-medicine/',
  },
  {
    label: 'NHS England — Interim commissioning guidance: NICE TA1026 (tirzepatide) primary-care phased rollout.',
    href: 'https://www.england.nhs.uk/long-read/interim-commissioning-guidance-nice-ta1026-tirzepatide/',
  },
  {
    label: 'NICE TA1026 — Tirzepatide for managing overweight and obesity.',
    href: 'https://www.nice.org.uk/guidance/ta1026',
  },
];

export default function WeightMgmt() {
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [bmiOverride, setBmiOverride] = useState<number | null>(null);
  const [ethnicityAdjusted, setEthnicityAdjusted] = useState(false);
  const [comorbidities, setComorbidities] = useState<Record<ComorbidityKey, boolean>>({
    t2dm: false,
    hypertension: false,
    dyslipidaemia: false,
    osa: false,
    cvd: false,
  });
  const [borough, setBorough] = useState<Borough>('bromley');
  const [isAdult, setIsAdult] = useState(true);
  const [pregnancyExclusion, setPregnancyExclusion] = useState(false);
  const [hasWeightRelatedCondition, setHasWeightRelatedCondition] = useState(false);
  const [urgentReason, setUrgentReason] = useState(false);
  const [copied, setCopied] = useState(false);

  const input: WeightMgmtInput = {
    heightCm,
    weightKg,
    bmiOverride,
    ethnicityAdjusted,
    comorbidities,
    borough,
    isAdult,
    pregnancyExclusion,
    hasWeightRelatedCondition,
    urgentReason,
  };
  const result = useMemo(() => calculateEligibility(input, new Date()), [input]);

  function toggleComorbidity(key: ComorbidityKey) {
    setComorbidities((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildWeightMgmtSummary(input, result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div>
      <div className="no-print mb-5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900">
          <ChevronLeftIcon className="h-4 w-4" />
          All tools
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100">
            <ScalesIcon className="h-6 w-6" weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Weight Management Eligibility
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Checks eligibility for NHS <strong>tirzepatide (Mounjaro)</strong> weight management
              against the South East London pathway. A decision aid — confirm against current SEL
              guidance.
            </p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          <InfoIcon className="h-4 w-4 shrink-0 text-slate-400" weight="fill" />
          Enter clinical values only — do not enter patient names, NHS numbers or other identifiers.
        </p>
      </div>

      <div className="space-y-5">
        {/* Measurements */}
        <section className={`no-print ${card}`} aria-labelledby="m-heading">
          <h2 id="m-heading" className={`mb-4 ${sectionTitle}`}>
            <ScalesIcon className="h-4 w-4 text-teal-600" weight="fill" />
            Measurements
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="wm-height" className={fieldLabel}>Height (cm)</label>
              <input id="wm-height" type="number" min={0} step="any" inputMode="decimal"
                value={numStr(heightCm)} onChange={(e) => setHeightCm(toNum(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label htmlFor="wm-weight" className={fieldLabel}>Weight (kg)</label>
              <input id="wm-weight" type="number" min={0} step="any" inputMode="decimal"
                value={numStr(weightKg)} onChange={(e) => setWeightKg(toNum(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label htmlFor="wm-bmi" className={fieldLabel}>
                BMI <span className="font-normal text-slate-400">· or enter directly</span>
              </label>
              <input id="wm-bmi" type="number" min={0} step="any" inputMode="decimal"
                value={numStr(bmiOverride)} onChange={(e) => setBmiOverride(toNum(e.target.value))}
                placeholder={result.bmi != null && bmiOverride == null ? result.bmi.toFixed(1) : ''}
                className={inputCls} />
            </div>
          </div>
          <label className="mt-4 flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={ethnicityAdjusted} onChange={(e) => setEthnicityAdjusted(e.target.checked)} className={checkboxCls} />
            <span className="text-slate-700">
              South Asian, Chinese, other Asian, Middle Eastern, Black African or African-Caribbean
              background <span className="text-slate-500">(lowers BMI thresholds by 2.5)</span>
            </span>
          </label>
        </section>

        {/* Conditions */}
        <section className={`no-print ${card}`} aria-labelledby="c-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="c-heading" className={sectionTitle}>
              <CheckIcon className="h-4 w-4 text-teal-600" weight="fill" />
              Qualifying conditions
            </h2>
            <span className="text-xs text-slate-400">{result.comorbidityCount} of 5 · ≥4 needed</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {COMORBIDITIES.map((c) => (
              <label key={c.key} className="flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={comorbidities[c.key]} onChange={() => toggleComorbidity(c.key)} className={checkboxCls} />
                <span className="text-slate-700">{c.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Borough + eligibility factors */}
        <section className={`no-print ${card}`} aria-labelledby="b-heading">
          <h2 id="b-heading" className={`mb-4 ${sectionTitle}`}>
            <InfoIcon className="h-4 w-4 text-teal-600" weight="fill" />
            Borough & eligibility factors
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="wm-borough" className={fieldLabel}>Borough</label>
              <select id="wm-borough" value={borough} onChange={(e) => setBorough(e.target.value as Borough)} className={inputCls}>
                {BOROUGHS.map((b) => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 self-end text-sm">
              <label className="flex items-start gap-2.5">
                <input type="checkbox" checked={isAdult} onChange={(e) => setIsAdult(e.target.checked)} className={checkboxCls} />
                <span className="text-slate-700">Adult (18 or over)</span>
              </label>
              <label className="flex items-start gap-2.5">
                <input type="checkbox" checked={pregnancyExclusion} onChange={(e) => setPregnancyExclusion(e.target.checked)} className={checkboxCls} />
                <span className="text-slate-700">Pregnant, planning pregnancy, or breastfeeding</span>
              </label>
            </div>
          </div>

          <details className="mt-4 rounded-lg bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-600">
              Urgent access (optional)
            </summary>
            <div className="mt-3 space-y-2 text-sm">
              <label className="flex items-start gap-2.5">
                <input type="checkbox" checked={hasWeightRelatedCondition} onChange={(e) => setHasWeightRelatedCondition(e.target.checked)} className={checkboxCls} />
                <span className="text-slate-700">Has at least one weight-related health condition</span>
              </label>
              <label className="flex items-start gap-2.5">
                <input type="checkbox" checked={urgentReason} onChange={(e) => setUrgentReason(e.target.checked)} className={checkboxCls} />
                <span className="text-slate-700">
                  An urgent clinical reason applies (cancer treatment, organ transplant, idiopathic
                  intracranial hypertension, barrier to planned surgery, fertility treatment, or
                  obesity hypoventilation syndrome)
                </span>
              </label>
            </div>
          </details>
        </section>

        <ResultPanel input={input} result={result} onCopy={copySummary} copied={copied} />

        <References
          note="Eligibility is phased and access differs by borough; this reflects the South East London pathway and the NHS England primary-care rollout. Always confirm against the current SEL guidance."
          items={REFERENCES}
        />
      </div>
    </div>
  );
}

function ResultPanel({
  input,
  result,
  onCopy,
  copied,
}: {
  input: WeightMgmtInput;
  result: ReturnType<typeof calculateEligibility>;
  onCopy: () => void;
  copied: boolean;
}) {
  const phaseLabel =
    result.phase === 'expanded-35' ? 'BMI ≥35 + ≥4 conditions' : 'BMI ≥40 + ≥4 conditions';

  return (
    <section className={card} aria-labelledby="r-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="r-heading" className={sectionTitle}>
          <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
          Outcome
        </h2>
        <div className="no-print flex gap-2">
          <button type="button" onClick={onCopy} disabled={!result.ok}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
            {copied ? <CheckIcon className="h-4 w-4" weight="bold" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy summary'}
          </button>
          <button type="button" onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <PrinterIcon className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      <div aria-live="polite">
        {!result.ok ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
            Enter height and weight (or a BMI) to assess eligibility.
          </p>
        ) : (
          <>
            <OutcomeBanner result={result} />

            {result.eligible && result.accessRoute && (
              <div className="mt-3 flex gap-2.5 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
                <ArrowRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <div>
                  <p className="font-medium">Next step</p>
                  <p className="mt-0.5">{result.accessRoute}</p>
                  <p className="mt-1 text-teal-800">
                    Requires the mandatory 9-month lifestyle / wraparound support programme.
                  </p>
                </div>
              </div>
            )}

            <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
              {(result.excluded ? result.exclusionReasons : result.reasons).map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  {r}
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs text-slate-400">
              Active phase ({phaseLabel}) · {input.ethnicityAdjusted ? 'ethnicity-adjusted thresholds' : 'standard thresholds'}.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function OutcomeBanner({ result }: { result: ReturnType<typeof calculateEligibility> }) {
  if (result.excluded) {
    return (
      <Banner tone="red" icon={<AlertIcon className="h-6 w-6" weight="fill" />} title="Not eligible — excluded" />
    );
  }
  if (result.eligible) {
    return (
      <Banner tone="teal" icon={<CheckIcon className="h-6 w-6" weight="fill" />} title="Meets eligibility criteria" />
    );
  }
  return (
    <Banner tone="amber" icon={<AlertIcon className="h-6 w-6" weight="fill" />} title="Does not currently meet criteria" />
  );
}

function Banner({ tone, icon, title }: { tone: 'teal' | 'amber' | 'red'; icon: ReactNode; title: string }) {
  const tones = {
    teal: 'border-teal-200 bg-teal-50 text-teal-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-200 bg-red-50 text-red-800',
  } as const;
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${tones[tone]}`}>
      {icon}
      <span className="text-lg font-bold tracking-tight">{title}</span>
    </div>
  );
}
