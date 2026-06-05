import Disclaimer from './Disclaimer';
import { APP_VERSION, LAST_UPDATED } from '../version';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <Disclaimer />
        <p className="mt-4 text-xs text-slate-500">
          ClinicalPharmTools v{APP_VERSION} &middot; last updated {LAST_UPDATED} &middot; runs
          entirely in your browser &mdash; no data is stored or transmitted.
        </p>
      </div>
    </footer>
  );
}
