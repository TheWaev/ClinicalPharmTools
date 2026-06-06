import type { ReactNode } from 'react';
import { BookIcon } from './icons';

export interface Reference {
  label: string;
  /** Optional external link. Opens in a new tab. */
  href?: string;
}

/**
 * A "Sources & references" / method block for a tool. Shows an optional method
 * note and an optional numbered list of citations. Links are plain anchors
 * (the app makes no request — the user chooses to navigate out).
 */
export default function References({
  title = 'Sources & references',
  note,
  items = [],
}: {
  title?: string;
  note?: ReactNode;
  items?: Reference[];
}) {
  return (
    <section
      aria-labelledby="sources-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2
        id="sources-heading"
        className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        <BookIcon className="h-4 w-4 text-teal-600" weight="fill" />
        {title}
      </h2>

      {note && <p className="mt-3 text-sm leading-relaxed text-slate-600">{note}</p>}

      {items.length > 0 && (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600 marker:text-slate-400">
          {items.map((r) => (
            <li key={r.label}>
              {r.href ? (
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 hover:text-teal-900 hover:underline"
                >
                  {r.label}
                </a>
              ) : (
                r.label
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
