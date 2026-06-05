import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-baseline gap-2 rounded">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            ClinicalPharmTools
          </span>
          <span className="text-sm text-slate-500">clinical pharmacy calculators</span>
        </Link>
        <nav aria-label="Primary">
          <Link
            to="/"
            className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
          >
            All tools
          </Link>
        </nav>
      </div>
    </header>
  );
}
