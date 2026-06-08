import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  qrisk3,
  ETHNICITIES,
  SMOKING,
  type Qrisk3Input,
  type QSex,
} from './qrisk3';
import { buildQrisk3Summary } from './summary';
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

function toNum(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
const numStr = (v: number | null) => (v == null ? '' : String(v));

type BoolKey =
  | 'af'
  | 'treatedHypertension'
  | 'type1Diabetes'
  | 'type2Diabetes'
  | 'ckd'
  | 'rheumatoidArthritis'
  | 'sle'
  | 'migraine'
  | 'severeMentalIllness'
  | 'atypicalAntipsychotic'
  | 'corticosteroids'
  | 'familyHistoryCvd'
  | 'erectileDysfunction';

const CONDITIONS: { key: BoolKey; label: string; maleOnly?: boolean }[] = [
  { key: 'af', label: 'Atrial fibrillation' },
  { key: 'treatedHypertension', label: 'On blood-pressure treatment' },
  { key: 'type1Diabetes', label: 'Type 1 diabetes' },
  { key: 'type2Diabetes', label: 'Type 2 diabetes' },
  { key: 'ckd', label: 'CKD (stage 3, 4 or 5)' },
  { key: 'rheumatoidArthritis', label: 'Rheumatoid arthritis' },
  { key: 'sle', label: 'Systemic lupus erythematosus' },
  { key: 'migraine', label: 'Migraine' },
  { key: 'severeMentalIllness', label: 'Severe mental illness' },
  { key: 'atypicalAntipsychotic', label: 'On atypical antipsychotics' },
  { key: 'corticosteroids', label: 'On regular corticosteroids' },
  { key: 'familyHistoryCvd', label: 'Angina/heart attack in 1st-degree relative < 60' },
  { key: 'erectileDysfunction', label: 'Erectile dysfunction', maleOnly: true },
];

const REFERENCES: Reference[] = [
  {
    label: 'Hippisley-Cox J, Coupland C, Brindle P. Development and validation of QRISK3. BMJ. 2017;357:j2099.',
    href: 'https://www.bmj.com/content/357/bmj.j2099',
  },
  { label: 'Official calculator and source code — https://qrisk.org (QRISK®3-2017, ClinRisk Ltd, GNU LGPL).', href: 'https://qrisk.org' },
  {
    label: 'NICE NG238 — CVD risk assessment and lipid modification (statin offered at QRISK3 ≥ 10%).',
    href: 'https://www.nice.org.uk/guidance/ng238',
  },
];

function riskBand(score: number): { label: string; banner: string; bar: string } {
  if (score < 10) return { label: 'Low', banner: 'border-emerald-200 bg-emerald-50 text-emerald-800', bar: 'bg-emerald-500' };
  if (score < 20) return { label: 'Moderate', banner: 'border-amber-200 bg-amber-50 text-amber-800', bar: 'bg-amber-500' };
  return { label: 'High', banner: 'border-red-200 bg-red-50 text-red-900', bar: 'bg-red-500' };
}

export default function Qrisk3() {
  const [sex, setSex] = useState<QSex>('female');
  const [age, setAge] = useState<number | null>(null);
  const [ethnicity, setEthnicity] = useState<number>(1);
  const [smoking, setSmoking] = useState<number>(0);
  const [heightCm, setHeight] = useState<number | null>(null);
  const [weightKg, setWeight] = useState<number | null>(null);
  const [totalChol, setTotalChol] = useState<number | null>(null);
  const [hdl, setHdl] = useState<number | null>(null);
  const [sbp, setSbp] = useState<number | null>(null);
  const [sbpSd, setSbpSd] = useState<number | null>(null);
  const [townsend, setTownsend] = useState<number | null>(null);
  const [flags, setFlags] = useState<Record<BoolKey, boolean>>({
    af: false, treatedHypertension: false, type1Diabetes: false, type2Diabetes: false,
    ckd: false, rheumatoidArthritis: false, sle: false, migraine: false,
    severeMentalIllness: false, atypicalAntipsychotic: false, corticosteroids: false,
    familyHistoryCvd: false, erectileDysfunction: false,
  });
  const [copied, setCopied] = useState(false);

  const cholRatio = totalChol && hdl && hdl > 0 ? totalChol / hdl : null;

  const input: Qrisk3Input = {
    sex, age, ethnicity, smoking, heightCm, weightKg,
    cholRatio, sbp, sbpSd, townsend, ...flags,
    erectileDysfunction: sex === 'male' && flags.erectileDysfunction,
  };
  const result = useMemo(() => qrisk3(input), [input]);
  const touched = age != null;

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildQrisk3Summary(input, result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  const band = result.ok && result.score != null ? riskBand(result.score) : null;

  return (
    <div>
      <div className="no-print mb-5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900">
          <ChevronLeftIcon className="h-4 w-4" />
          All tools
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100">
            <HeartIcon className="h-6 w-6" weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">QRISK3 — 10-year CVD risk</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Estimates 10-year cardiovascular risk (QRISK®3-2017) to support primary-prevention
              decisions. Calculated entirely in your browser — no postcode, no identifiers.
            </p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          <InfoIcon className="h-4 w-4 shrink-0 text-slate-400" weight="fill" />
          Valid for ages 25–84 without prior CVD. Leave a value blank to use the population average.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <section className={`no-print ${card}`}>
            <h2 className={`mb-4 ${sectionTitle}`}>
              <HeartIcon className="h-4 w-4 text-teal-600" weight="fill" />
              About the patient
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Segmented legend="Sex" name="q-sex" value={sex} onChange={(v) => setSex(v as QSex)}
                options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} />
              <div>
                <label htmlFor="q-age" className={fieldLabel}>Age (years)</label>
                <input id="q-age" type="number" min={25} max={84} inputMode="numeric"
                  value={numStr(age)} onChange={(e) => setAge(toNum(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label htmlFor="q-eth" className={fieldLabel}>Ethnicity</label>
                <select id="q-eth" value={ethnicity} onChange={(e) => setEthnicity(Number(e.target.value))} className={inputCls}>
                  {ETHNICITIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="q-smoke" className={fieldLabel}>Smoking status</label>
                <select id="q-smoke" value={smoking} onChange={(e) => setSmoking(Number(e.target.value))} className={inputCls}>
                  {SMOKING.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className={`no-print ${card}`}>
            <h2 className={`mb-4 ${sectionTitle}`}>
              <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
              Measurements
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Num id="q-height" label="Height (cm)" value={heightCm} onChange={setHeight} />
              <Num id="q-weight" label="Weight (kg)" value={weightKg} onChange={setWeight} />
              <Num id="q-tc" label="Total cholesterol (mmol/L)" value={totalChol} onChange={setTotalChol} />
              <Num id="q-hdl" label="HDL cholesterol (mmol/L)" value={hdl} onChange={setHdl} />
              <Num id="q-sbp" label="Systolic BP (mmHg)" value={sbp} onChange={setSbp} />
              <Num id="q-sbpsd" label="SD of systolic BP" value={sbpSd} onChange={setSbpSd} optional />
              <Num id="q-town" label="Townsend deprivation score" value={townsend} onChange={setTownsend} optional />
            </div>
            {(result.bmiUsed != null && heightCm && weightKg) || cholRatio != null ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                {heightCm && weightKg && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">BMI {(weightKg / (heightCm / 100) ** 2).toFixed(1)}</span>
                )}
                {cholRatio != null && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Chol:HDL ratio {cholRatio.toFixed(1)}</span>
                )}
              </div>
            ) : null}
          </section>

          <section className={`no-print ${card}`}>
            <h2 className={`mb-4 ${sectionTitle}`}>
              <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
              Clinical history
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {CONDITIONS.filter((c) => !c.maleOnly || sex === 'male').map((c) => (
                <label key={c.key} className={checkboxRow}>
                  <input type="checkbox" checked={flags[c.key]} onChange={() => setFlags((p) => ({ ...p, [c.key]: !p[c.key] }))} className={checkboxCls} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Result column */}
        <div className="lg:col-span-2">
          <section className={`${card} lg:sticky lg:top-4`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className={sectionTitle}>
                <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
                Result
              </h2>
              <div className="no-print flex gap-2">
                <button type="button" onClick={copySummary} disabled={!result.ok}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {copied ? <CheckIcon className="h-4 w-4" weight="bold" /> : <CopyIcon className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button type="button" onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  <PrinterIcon className="h-4 w-4" />
                  Print
                </button>
              </div>
            </div>

            <div aria-live="polite">
              {touched && result.errors.length > 0 && (
                <div className="mb-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" weight="fill" />
                  <ul className="space-y-1">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                </div>
              )}

              {result.ok && result.score != null && band ? (
                <>
                  <div className={`rounded-xl border p-5 text-center ${band.banner}`}>
                    <p className="text-xs uppercase tracking-wide">10-year CVD risk</p>
                    <p className="mt-1">
                      <span className="text-5xl font-extrabold tabular-nums">{result.score}</span>
                      <span className="ml-1 text-2xl font-bold">%</span>
                    </p>
                    <p className="mt-1 text-sm font-semibold">{band.label} risk</p>
                    <p className="mt-1 text-xs opacity-80">
                      About {Math.round(result.score)} in 100 people like this would have a heart
                      attack or stroke within 10 years.
                    </p>
                  </div>

                  <div className="mt-3">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${band.bar}`} style={{ width: `${Math.min(result.score, 100)}%` }} />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>0%</span><span>10% (treat)</span><span>20%+</span>
                    </div>
                  </div>

                  {result.healthyScore != null && (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      A healthy person of the same age, sex and ethnicity would score{' '}
                      <strong>{result.healthyScore}%</strong>
                      {result.relativeRisk != null && result.relativeRisk > 1 && (
                        <> — this patient’s risk is about <strong>{result.relativeRisk}×</strong> higher.</>
                      )}
                    </p>
                  )}

                  <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${result.statinThresholdMet ? 'bg-teal-50 text-teal-800' : 'bg-slate-50 text-slate-600'}`}>
                    {result.statinThresholdMet
                      ? 'QRISK3 ≥ 10% — discuss a statin (atorvastatin 20 mg) for primary prevention (NICE NG238).'
                      : 'QRISK3 < 10% — focus on lifestyle; use shared decision-making on a statin (NICE NG238).'}
                  </div>
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
                  Enter age, sex and ethnicity to estimate risk.
                </p>
              )}

              <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
                Calculated with the QRISK®3-2017 algorithm, © 2017 ClinRisk Ltd, used under the GNU
                LGPL. This implementation is not warranted by ClinRisk; confirm results against the
                official calculator at qrisk.org. QRISK® is a registered trademark of ClinRisk Ltd.
              </p>
            </div>

            {result.ok && (
              <details className="mt-3">
                <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                  Plain-text summary (copyable)
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                  {buildQrisk3Summary(input, result)}
                </pre>
              </details>
            )}
          </section>
        </div>
      </div>

      <div className="mt-5">
        <References
          note="QRISK3 estimates risk in people aged 25–84 without existing CVD. It is not for people with type 1 diabetes under 25, established CVD, or familial hypercholesterolaemia. Deprivation is entered as an optional Townsend score (default 0 ≈ average) — postcode is never used."
          items={REFERENCES}
        />
      </div>
    </div>
  );
}

function Num({
  id, label, value, onChange, optional,
}: {
  id: string; label: string; value: number | null; onChange: (v: number | null) => void; optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>
        {label}{optional && <span className="font-normal text-slate-400"> · optional</span>}
      </label>
      <input id={id} type="number" min={0} step="any" inputMode="decimal"
        value={numStr(value)} onChange={(e) => onChange(toNum(e.target.value))} className={inputCls} />
    </div>
  );
}

function Segmented({
  legend, name, value, options, onChange,
}: {
  legend: string; name: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className={`mb-2 ${fieldLabel}`}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label key={opt.value} className="cursor-pointer">
            <input type="radio" name={name} value={opt.value} checked={value === opt.value}
              onChange={() => onChange(opt.value)} className="peer sr-only" />
            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 transition hover:border-slate-300 peer-checked:border-teal-500 peer-checked:bg-teal-50 peer-checked:font-medium peer-checked:text-teal-700 peer-checked:ring-1 peer-checked:ring-teal-500">
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
