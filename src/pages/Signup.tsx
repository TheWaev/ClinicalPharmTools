import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AuthLayout, { authInputCls } from '../auth/AuthLayout';
import { authDevBypass } from '../lib/supabase';
import { isAllowedEmailDomain, ALLOWED_DOMAINS_LABEL } from '../auth/allowedDomains';
import { pcns, OTHER_PRACTICE } from '../auth/practices';
import {
  EmailIcon,
  LockIcon,
  SignUpIcon,
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
  PracticeIcon,
} from '../components/icons';

const MIN_PASSWORD = 8;
const SEP = '|||'; // encodes "<pcn>|||<practice>" in one option value

export default function Signup() {
  const { session, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selected, setSelected] = useState(''); // chosen option value
  const [otherPractice, setOtherPractice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (authDevBypass || session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isAllowedEmailDomain(email)) {
      setError(`Sign-up is restricted to ${ALLOWED_DOMAINS_LABEL} email addresses.`);
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (!selected) {
      setError('Select your GP practice.');
      return;
    }

    let pcn = '';
    let practice = '';
    if (selected === OTHER_PRACTICE) {
      practice = otherPractice.trim();
      if (practice === '') {
        setError('Enter your practice name.');
        return;
      }
    } else {
      [pcn, practice] = selected.split(SEP);
    }

    setBusy(true);
    const { error, needsEmailConfirmation } = await signUp(email, password, pcn, practice);
    setBusy(false);
    if (error) setError(error);
    else if (needsEmailConfirmation) setDone(true);
  }

  if (done) {
    return (
      <AuthLayout title="Check your email" subtitle="One more step to activate your account.">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <CheckIcon className="h-7 w-7" weight="fill" />
          </span>
          <p className="text-sm text-slate-600">
            We’ve sent a confirmation link to <span className="font-medium">{email}</span>. Click it
            to verify your address, then sign in. New accounts also need an administrator to approve
            access before you can use the tools.
          </p>
          <Link
            to="/login"
            className="mt-1 inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create account" subtitle="For clinical pharmacy staff.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
            {error}
          </p>
        )}

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Work email</span>
          <div className="relative mt-1">
            <EmailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@nhs.net"
              className={authInputCls}
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <div className="relative mt-1">
            <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD} characters`}
              className={authInputCls}
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">GP practice</span>
          <div className="relative mt-1">
            <PracticeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              required
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className={authInputCls}
            >
              <option value="" disabled>
                Select your practice…
              </option>
              {pcns.map((p) => (
                <optgroup key={p.code} label={p.name}>
                  {p.practices.map((practice) => (
                    <option key={`${p.code}-${practice}`} value={`${p.name}${SEP}${practice}`}>
                      {practice}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={OTHER_PRACTICE}>Other / not listed</option>
            </select>
          </div>
        </label>

        {selected === OTHER_PRACTICE && (
          <input
            type="text"
            value={otherPractice}
            onChange={(e) => setOtherPractice(e.target.value)}
            placeholder="Type your practice name"
            className={authInputCls.replace('pl-9', 'pl-3')}
          />
        )}

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Only {ALLOWED_DOMAINS_LABEL} email addresses can register. New accounts are reviewed
          before access is granted.
        </p>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <SpinnerIcon className="h-4 w-4 animate-spin" weight="bold" />
          ) : (
            <SignUpIcon className="h-4 w-4" weight="bold" />
          )}
          Create account
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-teal-700 hover:text-teal-900">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
