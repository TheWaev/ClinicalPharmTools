import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  chadsVasc,
  orbit,
  type ChadsVascInput,
  type OrbitInput,
  type ScoreItem,
  type Sex,
} from './riskScores';
import { buildAfSummary } from './summary';
import References, { type Reference } from '../../components/References';
import {
  PulseIcon,
  ClipboardIcon,
  CopyIcon,
  PrinterIcon,
  ChevronLeftIcon,
  InfoIcon,
  CheckIcon,
} from '../../components/icons';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const fieldLabel = 'text-sm font-medium text-slate-700';
const inputCls =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25';
const checkboxRow =
  'flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700';
const checkboxCls = 'mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-teal-600 focus:ring-teal-500/30';

const REFERENCES: Reference[] = [
  { label: 'NICE NG196 — Atrial fibrillation: diagnosis and management.', href: 'https://www.nice.org.uk/guidance/ng196' },
  { label: 'Lip GYH, Nieuwlaat R, Pisters R, et al. Refining clinical risk stratification (CHA₂DS₂-VASc). Chest. 2010;137(2):263–272.' },
  { label: 'O’Brien EC, Simon DN, Thomas LE, et al. The ORBIT bleeding score. Eur Heart J. 2015;36(46):3258–3264.' },
];

const toNum = (v: string) => (v.trim() === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export default function AfRisk() {
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex>('male');
  const [copied, setCopied] = useState(false);

  const [cvFlags, setCvFlags] = useState({
    chf: false,
    hypertension: false,
    diabetes: false,
    strokeTia: false,
    vascular: false,
  });
  const [obFlags, setObFlags] = useState({
    anaemia: false,
    bleeding: false,
    eGFRLow: false,
    antiplatelet: false,
  });

  const cvInput: ChadsVascInput = { age, sex, ...cvFlags };
  const obInput: OrbitInput = { age, ...obFlags };
  const cv = useMemo(() => chadsVasc(cvInput), [cvInput]);
  const ob = useMemo(() => orbit(obInput), [obInput]);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildAfSummary(cv, ob));
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
            <PulseIcon className="h-6 w-6" weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Atrial Fibrillation Risk
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              CHA₂DS₂-VASc (stroke risk) and ORBIT (bleeding risk) to support anticoagulation
              decisions, per NICE NG196. A decision aid, not a substitute for clinical judgement.
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
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="af-age" className={fieldLabel}>Age (years)</label>
              <input id="af-age" type="number" min={0} inputMode="numeric"
                value={age == null ? '' : age} onChange={(e) => setAge(toNum(e.target.value))} className={`${inputCls} w-32`} />
            </div>
            <Segmented legend="Sex" name="af-sex" value={sex} onChange={(v) => setSex(v as Sex)}
              options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
          </div>
        </section>

        <ScoreCard
          title="CHA₂DS₂-VASc — stroke risk"
          score={cv.score}
          recommendation={cv.recommendation}
          items={cv.items}
          elevated={cv.score >= 2}
        >
          <CheckboxGrid
            options={[
              ['chf', 'Congestive heart failure / LV dysfunction'],
              ['hypertension', 'Hypertension'],
              ['diabetes', 'Diabetes'],
              ['strokeTia', 'Prior stroke / TIA / thromboembolism (2)'],
              ['vascular', 'Vascular disease (MI, PAD, aortic plaque)'],
            ]}
            flags={cvFlags}
            onToggle={(k) => setCvFlags((p) => ({ ...p, [k]: !p[k as keyof typeof p] }))}
          />
          <p className="mt-2 text-xs text-slate-400">Age and sex are scored from the fields above.</p>
        </ScoreCard>

        <ScoreCard
          title="ORBIT — bleeding risk"
          score={ob.score}
          recommendation={ob.recommendation}
          items={ob.items}
          elevated={ob.risk !== 'low'}
        >
          <CheckboxGrid
            options={[
              ['anaemia', 'Reduced haemoglobin / anaemia (2)'],
              ['bleeding', 'Bleeding history — GI, intracranial or haemorrhagic stroke (2)'],
              ['eGFRLow', 'Insufficient kidney function (eGFR < 60)'],
              ['antiplatelet', 'Treatment with an antiplatelet'],
            ]}
            flags={obFlags}
            onToggle={(k) => setObFlags((p) => ({ ...p, [k]: !p[k as keyof typeof p] }))}
          />
          <p className="mt-2 inline-flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="fill" />
            "Older (age ≥ 75)" is scored from the age field above. NICE NG196 recommends ORBIT for
            bleeding-risk assessment.
          </p>
        </ScoreCard>

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

        <References items={REFERENCES} />
      </div>
    </div>
  );
}

function ScoreCard({
  title,
  score,
  recommendation,
  items,
  elevated,
  children,
}: {
  title: string;
  score: number;
  recommendation: string;
  items: ScoreItem[];
  elevated: boolean;
  children: ReactNode;
}) {
  const high = elevated;
  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <ClipboardIcon className="h-4 w-4 text-teal-600" weight="fill" />
          {title}
        </h2>
        <span
          className={[
            'flex h-12 min-w-12 items-center justify-center rounded-xl px-3 text-2xl font-extrabold tabular-nums',
            high ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700',
          ].join(' ')}
        >
          {score}
        </span>
      </div>
      <div className="no-print">{children}</div>
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{recommendation}</p>
      {items.some((i) => i.points > 0) && (
        <p className="mt-2 text-xs text-slate-400">
          {items.filter((i) => i.points > 0).map((i) => `${i.label} (${i.points})`).join(' · ')}
        </p>
      )}
    </section>
  );
}

function CheckboxGrid({
  options,
  flags,
  onToggle,
}: {
  options: [string, string][];
  flags: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(([key, label]) => (
        <label key={key} className={checkboxRow}>
          <input type="checkbox" checked={flags[key]} onChange={() => onToggle(key)} className={checkboxCls} />
          <span>{label}</span>
        </label>
      ))}
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
  onChange: (v: string) => void;
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
