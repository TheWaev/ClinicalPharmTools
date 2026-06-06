import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import AuthLayout from './AuthLayout';
import { PendingIcon, SpinnerIcon, SignOutIcon } from '../components/icons';

/** Shown to a signed-in but not-yet-approved user. */
export default function PendingApproval() {
  const { email, refreshApproval, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  async function recheck() {
    setChecking(true);
    await refreshApproval();
    setChecking(false);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <AuthLayout title="Awaiting approval" subtitle="Your account needs to be approved.">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <PendingIcon className="h-7 w-7" weight="fill" />
        </span>
        <p className="text-sm text-slate-600">
          Your email <span className="font-medium">{email}</span> is verified, but an administrator
          still needs to approve access. You’ll be able to use the tools once approved.
        </p>
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={recheck}
            disabled={checking}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
          >
            {checking && <SpinnerIcon className="h-4 w-4 animate-spin" weight="bold" />}
            Check again
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <SignOutIcon className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
