import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import PendingApproval from './PendingApproval';
import { authDevBypass } from '../lib/supabase';
import { SpinnerIcon, LockIcon } from '../components/icons';

/**
 * Gates the app behind authentication AND admin approval. Fails closed: if
 * Supabase env vars are missing in a production build, access is blocked.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { configured, loading, session, approved } = useAuth();

  if (authDevBypass) return <>{children}</>;

  if (!configured) {
    return (
      <CenteredNotice>
        <LockIcon className="h-8 w-8 text-slate-400" />
        <p className="mt-3 font-medium text-slate-700">Authentication is not configured</p>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          Set <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> for this build.
        </p>
      </CenteredNotice>
    );
  }

  if (loading || (session && approved === null)) {
    return (
      <CenteredNotice>
        <SpinnerIcon className="h-7 w-7 animate-spin text-teal-600" weight="bold" />
        <span className="sr-only">Loading…</span>
      </CenteredNotice>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (approved === false) return <PendingApproval />;

  return <>{children}</>;
}

function CenteredNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      {children}
    </div>
  );
}
