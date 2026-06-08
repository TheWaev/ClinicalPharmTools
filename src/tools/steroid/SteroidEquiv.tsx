import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  buildEquivalents,
  STEROIDS,
  DURATION_LABEL,
  MINERALO_LABEL,
  ADRENAL_SUPPRESSION_THRESHOLD_MG,
  type SteroidKey,
} from './steroidEquiv';
import { buildSteroidSummary } from './summary';
import References, { type Reference } from '../../components/References';
import {
  PillIcon,
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
function fmt(mg: number): string {
  return Number(mg.toFixed(3)).toString();
}

const REFERENCES: Reference[] = [
  {
    label: 'BNF — Glucocorticoid therapy (equivalent anti-inflammatory doses).',
    href: 'https://bnf.nice.org.uk/treatment-summaries/glucocorticoid-therapy/',
  },
  {
    label:
      'NHS England / Society for Endocrinology — Steroid Emergency Card and sick-day rules for adrenal insufficiency (National Patient Safety Alert, 2020).',
  },
  {
    label:
      'Doses are approximate anti-inflammatory equivalents; they ignore differences in mineralocorticoid activity and duration of action.',
  },
];

export default function SteroidEquiv() {
  const [fromKey, setFromKey] = useState<SteroidKey>('prednisolone');
  const [dose, setDose] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => buildEquivalents(fromKey, dose), [fromKey, dose]);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildSteroidSummary(fromKey, dose, result));
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
            <PillIcon className="h-6 w-6" weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Corticosteroid Equivalence
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Converts between glucocorticoids by equivalent anti-inflammatory dose (BNF). A
              conversion aid — it does not account for mineralocorticoid effect or duration of action.
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
            <PillIcon className="h-4 w-4 text-teal-600" weight="fill" />
            Current steroid
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="steroid-from" className={fieldLabel}>
                Steroid
              </label>
              <select
                id="steroid-from"
                value={fromKey}
                onChange={(e) => setFromKey(e.target.value as SteroidKey)}
                className={inputCls}
              >
                {STEROIDS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="steroid-dose" className={fieldLabel}>
                Dose (mg)
              </label>
              <input
                id="steroid-dose"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={numStr(dose)}
                onChange={(e) => setDose(toNum(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className={sectionTitle}>
              <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
              Equivalent doses
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
            {result.ok ? (
              <>
                {result.prednisoloneEquivalent != null && (
                  <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-teal-700">Prednisolone-equivalent</p>
                    <p className="mt-1">
                      <span className="text-3xl font-extrabold tabular-nums text-teal-800">
                        {fmt(result.prednisoloneEquivalent)}
                      </span>
                      <span className="ml-1.5 text-lg font-medium text-teal-700">mg/day</span>
                    </p>
                  </div>
                )}

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Steroid</th>
                        <th className="px-3 py-2 text-right font-semibold">Dose</th>
                        <th className="hidden px-3 py-2 font-semibold sm:table-cell">Duration</th>
                        <th className="hidden px-3 py-2 font-semibold md:table-cell">Salt-retaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.rows.map((row) => {
                        const isFrom = row.steroid.key === fromKey;
                        return (
                          <tr key={row.steroid.key} className={isFrom ? 'bg-teal-50/40' : ''}>
                            <td className="px-3 py-2 font-medium text-slate-800">
                              {row.steroid.name}
                              {isFrom && (
                                <span className="ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-teal-700">
                                  selected
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
                              {fmt(row.dose)} mg
                            </td>
                            <td className="hidden px-3 py-2 text-slate-500 sm:table-cell">
                              {DURATION_LABEL[row.steroid.duration]}
                            </td>
                            <td className="hidden px-3 py-2 text-slate-500 md:table-cell">
                              {MINERALO_LABEL[row.steroid.mineralocorticoid]}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {result.adrenalRisk && (
                  <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" weight="fill" />
                    <span>
                      Prednisolone-equivalent ≥ {ADRENAL_SUPPRESSION_THRESHOLD_MG} mg/day. If continued
                      for ≥3–4 weeks there is a risk of adrenal suppression — <strong>do not stop
                      abruptly</strong>, apply sick-day rules, and issue an NHS Steroid Emergency Card.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
                Choose a steroid and enter a dose to see equivalent doses.
              </p>
            )}
          </div>

          {result.ok && (
            <details className="mt-4">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                <ArrowRightIcon className="h-3.5 w-3.5" />
                Plain-text summary (copyable)
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                {buildSteroidSummary(fromKey, dose, result)}
              </pre>
            </details>
          )}
        </section>

        <References
          note="Equivalences are anti-inflammatory (glucocorticoid) potencies. They are not interchangeable for mineralocorticoid replacement (e.g. Addison’s), and topical/inhaled/intra-articular potencies differ."
          items={REFERENCES}
        />
      </div>
    </div>
  );
}
