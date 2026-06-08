import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkDoacDose, type DoacInput, type DoacKey } from './doacDosing';
import { calculateCrCl, type CreatinineUnit, type Sex } from '../crcl/crclEngine';
import { buildDoacSummary } from './summary';
import References, { type Reference } from '../../components/References';
import {
  DropIcon,
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

const DRUG_OPTIONS: { value: DoacKey; label: string }[] = [
  { value: 'apixaban', label: 'Apixaban' },
  { value: 'rivaroxaban', label: 'Rivaroxaban' },
  { value: 'edoxaban', label: 'Edoxaban' },
  { value: 'dabigatran', label: 'Dabigatran' },
];

const REFERENCES: Reference[] = [
  {
    label: 'Summaries of Product Characteristics (SmPC) — apixaban, rivaroxaban, edoxaban, dabigatran (emc).',
    href: 'https://www.medicines.org.uk/emc',
  },
  {
    label: 'BNF — Apixaban / Rivaroxaban / Edoxaban / Dabigatran etexilate (dosing in AF and renal impairment).',
    href: 'https://bnf.nice.org.uk/',
  },
  {
    label: 'NICE NG196 — Atrial fibrillation: diagnosis and management (choice of anticoagulant).',
    href: 'https://www.nice.org.uk/guidance/ng196',
  },
  {
    label:
      'Specialist Pharmacy Service (SPS) — Using direct-acting oral anticoagulants (DOACs): dosing and monitoring.',
  },
];

export default function DoacChecker() {
  const [drug, setDrug] = useState<DoacKey>('apixaban');
  const [age, setAge] = useState<number | null>(null);
  const [weightKg, setWeight] = useState<number | null>(null);
  const [crcl, setCrcl] = useState<number | null>(null);
  const [creatinineUmol, setCreatinine] = useState<number | null>(null);
  const [pgpInhibitor, setPgp] = useState(false);
  const [verapamil, setVerapamil] = useState(false);
  const [copied, setCopied] = useState(false);

  // Inline Cockcroft–Gault calculator (optional, for when CrCl isn't to hand).
  const [showCrclCalc, setShowCrclCalc] = useState(false);
  const [calcSex, setCalcSex] = useState<Sex>('male');

  const input: DoacInput = { drug, age, weightKg, crcl, creatinineUmol, pgpInhibitor, verapamil };
  const result = useMemo(() => checkDoacDose(input), [input]);
  const touched = crcl != null || age != null || weightKg != null;

  // The calculator reuses the patient values already entered (age, weight,
  // serum creatinine in µmol/L) plus a sex toggle, so there is no duplicate
  // data entry. Serum creatinine stays in µmol/L to match the apixaban criterion.
  const CALC_CREATININE_UNIT: CreatinineUnit = 'umol/L';
  const crclCalc = useMemo(
    () =>
      calculateCrCl({
        age,
        sex: calcSex,
        creatinine: creatinineUmol,
        creatinineUnit: CALC_CREATININE_UNIT,
        weightKg,
        heightCm: null,
        weightBasis: 'actual',
      }),
    [age, calcSex, creatinineUmol, weightKg],
  );

  function useCalculatedCrcl() {
    if (crclCalc.crclMlMin != null) setCrcl(Math.round(crclCalc.crclMlMin));
  }

  const needsAge = drug === 'apixaban' || drug === 'dabigatran' || showCrclCalc;
  const needsWeight = drug === 'apixaban' || drug === 'edoxaban' || showCrclCalc;
  const needsCreatinine = drug === 'apixaban' || showCrclCalc;

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildDoacSummary(result));
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
            <DropIcon className="h-6 w-6" weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">DOAC Dose Checker</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Checks the licensed dose and reduction criteria for DOACs in{' '}
              <strong>non-valvular AF</strong>. A decision aid — always confirm against the current
              SmPC/BNF.
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
            <DropIcon className="h-4 w-4 text-teal-600" weight="fill" />
            Drug &amp; patient values
          </h2>

          <fieldset className="mb-5">
            <legend className={`mb-2 ${fieldLabel}`}>DOAC</legend>
            <div className="flex flex-wrap gap-2">
              {DRUG_OPTIONS.map((opt) => (
                <label key={opt.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="doac-drug"
                    value={opt.value}
                    checked={drug === opt.value}
                    onChange={() => setDrug(opt.value)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 transition hover:border-slate-300 peer-checked:border-teal-500 peer-checked:bg-teal-50 peer-checked:font-medium peer-checked:text-teal-700 peer-checked:ring-1 peer-checked:ring-teal-500">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="doac-crcl" className={fieldLabel}>
                Creatinine clearance (mL/min)
              </label>
              <input
                id="doac-crcl"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={numStr(crcl)}
                onChange={(e) => setCrcl(toNum(e.target.value))}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-400">
                Cockcroft–Gault, not eGFR.{' '}
                <button
                  type="button"
                  onClick={() => setShowCrclCalc((v) => !v)}
                  className="font-medium text-teal-700 hover:underline"
                >
                  {showCrclCalc ? 'Hide calculator' : "Don't have it? Calculate CrCl"}
                </button>
              </p>
            </div>

            {needsAge && (
              <div>
                <label htmlFor="doac-age" className={fieldLabel}>
                  Age (years)
                </label>
                <input
                  id="doac-age"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={numStr(age)}
                  onChange={(e) => setAge(toNum(e.target.value))}
                  className={inputCls}
                />
              </div>
            )}

            {needsWeight && (
              <div>
                <label htmlFor="doac-weight" className={fieldLabel}>
                  Weight (kg)
                </label>
                <input
                  id="doac-weight"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={numStr(weightKg)}
                  onChange={(e) => setWeight(toNum(e.target.value))}
                  className={inputCls}
                />
              </div>
            )}

            {needsCreatinine && (
              <div>
                <label htmlFor="doac-scr" className={fieldLabel}>
                  Serum creatinine (µmol/L)
                </label>
                <input
                  id="doac-scr"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={numStr(creatinineUmol)}
                  onChange={(e) => setCreatinine(toNum(e.target.value))}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {showCrclCalc && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Calculate CrCl (Cockcroft–Gault)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Uses the age, weight and serum creatinine entered above — just add sex.
              </p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <Segmented
                  legend="Sex"
                  name="doac-calc-sex"
                  value={calcSex}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                  ]}
                  onChange={(v) => setCalcSex(v as Sex)}
                />
                <div className="text-right">
                  {crclCalc.crclMlMin != null ? (
                    <p className="text-sm text-slate-600">
                      Estimated CrCl:{' '}
                      <span className="text-lg font-bold text-slate-900">
                        {crclCalc.crclMlMin.toFixed(0)} mL/min
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Enter age, weight and serum creatinine above.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={useCalculatedCrcl}
                    disabled={crclCalc.crclMlMin == null}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                    Use this CrCl
                  </button>
                </div>
              </div>
              {crclCalc.flags.includes('lowCreatinine') && (
                <p className="mt-3 inline-flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" weight="fill" />
                  Low serum creatinine can overestimate CrCl (low muscle mass / elderly) — consider
                  your local rounding policy.
                </p>
              )}
            </div>
          )}

          {(drug === 'edoxaban' || drug === 'dabigatran') && (
            <div className="mt-4">
              {drug === 'edoxaban' && (
                <label className={checkboxRow}>
                  <input
                    type="checkbox"
                    checked={pgpInhibitor}
                    onChange={() => setPgp((p) => !p)}
                    className={checkboxCls}
                  />
                  <span>
                    Concomitant P-gp inhibitor (ciclosporin, dronedarone, erythromycin, ketoconazole)
                  </span>
                </label>
              )}
              {drug === 'dabigatran' && (
                <label className={checkboxRow}>
                  <input
                    type="checkbox"
                    checked={verapamil}
                    onChange={() => setVerapamil((p) => !p)}
                    className={checkboxCls}
                  />
                  <span>Concomitant verapamil</span>
                </label>
              )}
            </div>
          )}
        </section>

        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className={sectionTitle}>
              <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
              Recommended dose
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

            {result.ok ? (
              result.contraindicated ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                  <p className="text-xs uppercase tracking-wide text-red-700">{result.drugLabel}</p>
                  <p className="mt-1 text-xl font-bold text-red-800">Not recommended</p>
                  <p className="mt-1 text-sm text-red-700">{result.rationale[0]}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-5 text-center">
                  <p className="text-xs uppercase tracking-wide text-teal-700">{result.drugLabel}</p>
                  <p className="mt-1 text-3xl font-extrabold text-teal-800">{result.dose}</p>
                  {result.rationale.map((reason) => (
                    <p key={reason} className="mt-1 text-sm text-teal-700/90">
                      {reason}
                    </p>
                  ))}
                </div>
              )
            ) : (
              !touched && (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
                  Select a DOAC and enter the patient values to check the dose.
                </p>
              )
            )}

            {result.ok && result.warnings.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm text-amber-800">
                {result.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" weight="fill" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {result.ok && (
            <details className="mt-4">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                <ArrowRightIcon className="h-3.5 w-3.5" />
                Plain-text summary (copyable)
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                {buildDoacSummary(result)}
              </pre>
            </details>
          )}
        </section>

        <References
          note="For non-valvular AF only — DOACs are contraindicated in mechanical heart valves and moderate-to-severe mitral stenosis, and this tool does not cover VTE treatment/prophylaxis dosing. Always confirm against the current SmPC/BNF and assess bleeding risk (e.g. ORBIT)."
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
