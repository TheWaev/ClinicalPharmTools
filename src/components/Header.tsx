import { Link, useNavigate } from 'react-router-dom';
import { SignOutIcon, UsersIcon } from './icons';
import Logo from './Logo';
import { useAuth } from '../auth/AuthContext';

export default function Header() {
  const { email, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="no-print sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-3 rounded-lg">
          <Logo className="h-9 w-auto text-brand-600 transition group-hover:scale-105" />
          <span className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight text-slate-900">
              ClinicalPharmTools
            </span>
            <span className="hidden text-xs text-slate-500 sm:block">
              clinical pharmacy calculators
            </span>
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-3">
          <Link
            to="/"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            All tools
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <UsersIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          {email && (
            <>
              <span className="hidden max-w-[14rem] truncate text-xs text-slate-500 md:inline">
                {email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <SignOutIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
