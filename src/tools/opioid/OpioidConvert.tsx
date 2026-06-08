import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OPIOIDS, totalOme, convertOmeTo, type OmeItem } from './opioidConvert';
import { buildOpioidSummary } from './summary';
import References, { type Reference } from '../../components/References';
import {
  ConvertIcon,
  ClipboardIcon,
  CopyIcon,
  PrinterIcon,
  ChevronLeftIcon,
  AlertIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
} from '../../components/icons';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const sectionTitle =
  'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500';
const inputCls =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25';

const REFERENCES: Reference[] = [
  { label: 'BNF — Prescribing in palliative care (opioid equivalences).', href: 'https://bnf.nice.org.uk/medicines-guidance/prescribing-in-palliative-care/' },
  { label: 'Faculty of Pain Medicine — Opioids Aware: dose equivalents and changing opioids.', href: 'https://fpm.ac.uk/opioids-aware-structured-approach-opioid-prescribing/dose-equivalents-and-changing-opioids' },
  { label: 'Specialist Pharmacy Service — Switching between opioids.', href: 'https://www.sps.nhs.uk/articles/switching-between-morphine-and-other-opioids-in-palliative-care/' },
];

let rowId = 0;
const newRow = (): Row => ({ id: `r${++rowId}`, key: 'morphine_oral', dose: null });
interface Row {
  id: string;
  key: string;
  dose: number | null;
}
const round = (n: number) => Math.round(n * 10) / 10;
const toNum = (v: string) => (v.trim() === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export default function OpioidConvert() {
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [target, setTarget] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const items: OmeItem[] = rows.map((r) => ({ key: r.key, dose: r.dose }));
  const result = useMemo(() => totalOme(items), [items]);
  const conversion = useMemo(
    () => (target ? convertOmeTo(result.totalOme, target) : null),
    [target, result.totalOme],
  );

  function update(id: string, patch: Partial<Row>) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildOpioidSummary(items, target || null));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  const unitOf = (key: string) => OPIOIDS.find((o) => o.key === key)?.unit ?? 'mg/day';
  const targetLabel = OPIOIDS.find((o) => o.key === target);

  return (
    <div>
      <div className="no-print mb-5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900">
          <ChevronLeftIcon className="h-4 w-4" />
          All tools
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100">
            <ConvertIcon className="h-6 w-6" weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Opioid Dose Converter</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Approximate <strong>oral morphine equivalent (OME)</strong> and switching guide. A
              decision aid — not a prescription.
            </p>
          </div>
        </div>
      </div>

      {/* Prominent safety banner */}
      <div className="mb-5 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" weight="fill" />
        <div className="space-y-1">
          <p className="font-semibold">Use with caution</p>
          <p>
            Ratios are approximate and vary between sources. When switching, <strong>reduce the
            calculated dose by 25–50%</strong> for incomplete cross-tolerance and titrate. Do
            <strong> not</strong> initiate or rotate <strong>patches</strong> or convert
            <strong> methadone</strong> from these figures — use product-specific tables / specialist
            advice. No patient identifiers.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <section className={`no-print ${card}`} aria-labelledby="cur-heading">
          <h2 id="cur-heading" className={`mb-3 ${sectionTitle}`}>
            <ConvertIcon className="h-4 w-4 text-teal-600" weight="fill" />
            Current opioid(s)
          </h2>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <select
                  value={r.key}
                  aria-label="Opioid"
                  onChange={(e) => update(r.id, { key: e.target.value })}
                  className={`${inputCls} flex-1`}
                >
                  {OPIOIDS.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
                <div className="relative w-40 shrink-0">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={r.dose == null ? '' : r.dose}
                    aria-label="Dose"
                    onChange={(e) => update(r.id, { dose: toNum(e.target.value) })}
                    className={`${inputCls} pr-16`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    {unitOf(r.key)}
                  </span>
                </div>
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows((p) => p.filter((x) => x.id !== r.id))}
                    aria-label="Remove" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setRows((p) => [...p, newRow()])}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700">
            <PlusIcon className="h-4 w-4" />
            Add opioid
          </button>
        </section>

        {/* Total OME */}
        <section className={['rounded-2xl border p-5', result.highDose ? 'border-amber-200 bg-amber-50' : 'border-teal-200 bg-teal-50'].join(' ')}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-xs uppercase tracking-wide ${result.highDose ? 'text-amber-700' : 'text-teal-700'}`}>
                Total oral morphine equivalent
              </p>
              <p className={`text-sm ${result.highDose ? 'text-amber-800' : 'text-teal-800'}`}>
                {result.highDose
                  ? '≥120 mg/day — seek specialist advice; review benefit vs harm.'
                  : 'per 24 hours (approximate).'}
              </p>
            </div>
            <span className={['flex h-14 items-center justify-center rounded-xl px-4 text-2xl font-extrabold tabular-nums', result.highDose ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'].join(' ')}>
              {round(result.totalOme)}<span className="ml-1 text-sm font-medium">mg</span>
            </span>
          </div>
        </section>

        {/* Convert to target */}
        <section className={card} aria-labelledby="to-heading">
          <h2 id="to-heading" className={`mb-3 ${sectionTitle}`}>
            <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
            Switch to (optional)
          </h2>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className={`${inputCls} no-print`}>
            <option value="">Select a target opioid…</option>
            {OPIOIDS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          {conversion && targetLabel && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                Equianalgesic: <strong>~{round(conversion.equivalent)} {conversion.unit}</strong> of {targetLabel.label}.
              </p>
              <p className="mt-1">
                Suggested start after 25–50% reduction:{' '}
                <strong>~{round(conversion.reducedLow)}–{round(conversion.reducedHigh)} {conversion.unit}</strong>, then titrate.
              </p>
              {targetLabel.note && (
                <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="fill" />
                  {targetLabel.note}
                </p>
              )}
            </div>
          )}
        </section>

        <div className="no-print flex gap-2">
          <button type="button" onClick={copySummary}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700">
            {copied ? <CheckIcon className="h-4 w-4" weight="bold" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy summary'}
          </button>
          <button type="button" onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <PrinterIcon className="h-4 w-4" />
            Print
          </button>
        </div>

        <References
          note="Oral morphine equivalents are approximate and source-dependent. Always reduce for cross-tolerance when switching, titrate to effect, and seek specialist advice for high doses, patches and methadone."
          items={REFERENCES}
        />
      </div>
    </div>
  );
}
