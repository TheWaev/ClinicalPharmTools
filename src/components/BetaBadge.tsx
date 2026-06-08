import { AlertIcon } from './icons';

/** Small "Beta" chip for tool cards / headers. */
export function BetaBadge({ className }: { className?: string }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      Beta
    </span>
  );
}

/** Full-width notice shown at the top of a beta tool's page. */
export function BetaBanner() {
  return (
    <div
      role="note"
      className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
    >
      <AlertIcon className="h-4 w-4 shrink-0 text-amber-500" weight="fill" />
      <span>
        <strong>Beta</strong> — this tool is undergoing clinical validation. Check all results
        before relying on them.
      </span>
    </div>
  );
}
