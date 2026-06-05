import { Link } from 'react-router-dom';
import { tools } from '../tools/registry';

export default function Home() {
  return (
    <div>
      <section className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Clinical pharmacy tools
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          A small suite of client-side calculators for clinical pharmacy teams. Everything runs in
          your browser — no patient data is stored or sent anywhere.
        </p>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => {
          const isAvailable = tool.status === 'available';
          const card = (
            <div
              className={[
                'h-full rounded-lg border p-4 transition',
                isAvailable
                  ? 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm'
                  : 'border-dashed border-slate-200 bg-slate-50',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{tool.name}</h2>
                {!isAvailable && (
                  <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                    Planned
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600">{tool.summary}</p>
            </div>
          );

          return (
            <li key={tool.slug}>
              {isAvailable ? (
                <Link to={`/tools/${tool.slug}`} className="block rounded-lg">
                  {card}
                </Link>
              ) : (
                <div aria-disabled="true">{card}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
