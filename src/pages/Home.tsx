import { Link } from 'react-router-dom';
import { tools } from '../tools/registry';
import { ArrowRightIcon, ShieldIcon, SparklesIcon } from '../components/icons';
import { BetaBadge } from '../components/BetaBadge';

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-600 via-teal-600 to-cyan-700 px-6 py-10 text-white shadow-sm sm:px-10 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/20">
            <ShieldIcon className="h-3.5 w-3.5" weight="fill" />
            Runs in your browser — no information you enter is recorded
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Clinical pharmacy tools
          </h1>
          <p className="mt-3 text-base leading-relaxed text-teal-50/90">
            A focused suite of calculators for clinical pharmacy teams. Fast, accurate, and built to
            be safe — every calculation runs locally and nothing is stored or transmitted.
          </p>
        </div>
      </section>

      <div className="mb-4 flex items-center gap-2">
        <SparklesIcon className="h-5 w-5 text-teal-600" weight="fill" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tools</h2>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => {
          const isAvailable = tool.status === 'available';
          const Icon = tool.icon;

          const inner = (
            <div
              className={[
                'group relative flex h-full flex-col rounded-2xl border p-5 transition',
                isAvailable
                  ? 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-card'
                  : 'border-dashed border-slate-200 bg-slate-50/60',
              ].join(' ')}
            >
              <div className="mb-3 flex items-start justify-between">
                <span
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-xl',
                    isAvailable
                      ? 'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100'
                      : 'bg-slate-100 text-slate-400',
                  ].join(' ')}
                >
                  <Icon className="h-6 w-6" weight="duotone" />
                </span>
                {!isAvailable ? (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Planned
                  </span>
                ) : (
                  tool.beta && <BetaBadge />
                )}
              </div>
              <h3 className="font-semibold text-slate-900">{tool.name}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">{tool.summary}</p>
              {isAvailable && (
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700">
                  Open tool
                  <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              )}
            </div>
          );

          return (
            <li key={tool.slug}>
              {isAvailable ? (
                <Link to={`/tools/${tool.slug}`} className="block rounded-2xl focus-visible:outline-none">
                  {inner}
                </Link>
              ) : (
                <div aria-disabled="true">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
