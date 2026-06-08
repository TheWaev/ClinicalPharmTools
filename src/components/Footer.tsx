import Disclaimer from './Disclaimer';
import { ShieldIcon } from './icons';
import { APP_VERSION, LAST_UPDATED } from '../version';

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <Disclaimer />
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
            <ShieldIcon className="h-3.5 w-3.5 text-teal-600" weight="fill" />
            Runs in your browser — no information you enter is recorded
          </span>
          <span>
            ClinicalPharmTools v{APP_VERSION} &middot; last updated {LAST_UPDATED}
          </span>
        </div>
      </div>
    </footer>
  );
}
