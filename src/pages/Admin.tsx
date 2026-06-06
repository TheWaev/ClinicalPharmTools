import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import {
  UsersIcon,
  CheckIcon,
  RevokeIcon,
  SpinnerIcon,
  ChevronLeftIcon,
  AlertIcon,
} from '../components/icons';

interface ProfileRow {
  id: string;
  email: string | null;
  practice: string | null;
  approved: boolean;
  is_admin: boolean;
  created_at: string;
}

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

export default function Admin() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setError('Authentication is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setRows((data ?? []) as ProfileRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function setApproved(id: string, value: boolean) {
    if (!supabase) return;
    setBusyId(id);
    const { error } = await supabase.from('profiles').update({ approved: value }).eq('id', id);
    if (error) setError(error.message);
    await load();
    setBusyId(null);
  }

  if (!isAdmin) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Not authorised</h1>
        <p className="mt-2 text-slate-600">You need an administrator account to view this page.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-teal-700 hover:underline">
          Back to tools
        </Link>
      </div>
    );
  }

  const pending = rows.filter((r) => !r.approved).length;

  return (
    <div>
      <div className="mb-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          All tools
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100">
            <UsersIcon className="h-6 w-6" weight="duotone" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">User administration</h1>
            <p className="mt-1 text-sm text-slate-600">
              Approve who can access the tools.{' '}
              {pending > 0 ? (
                <span className="font-medium text-amber-700">{pending} awaiting approval.</span>
              ) : (
                'No one is waiting.'
              )}
            </p>
          </div>
        </div>
      </div>

      <section className={card} aria-labelledby="users-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="users-heading"
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"
          >
            <UsersIcon className="h-4 w-4 text-teal-600" weight="fill" />
            Users ({rows.length})
          </h2>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" weight="fill" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <SpinnerIcon className="h-7 w-7 animate-spin text-teal-600" weight="bold" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No accounts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="py-2 pr-3 font-medium">Email</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Practice / PCN</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Joined</th>
                  <th scope="col" className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={['border-b border-slate-100', r.approved ? '' : 'bg-amber-50/40'].join(' ')}
                  >
                    <td className="py-3 pr-3 font-medium text-slate-900">
                      {r.email ?? '—'}
                      {r.is_admin && (
                        <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                          admin
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-slate-600">{r.practice || '—'}</td>
                    <td className="py-3 pr-3">
                      {r.approved ? (
                        <span className="inline-flex items-center gap-1 text-teal-700">
                          <CheckIcon className="h-4 w-4" weight="fill" /> Approved
                        </span>
                      ) : (
                        <span className="text-amber-700">Pending</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-slate-500">
                      {new Date(r.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3">
                      {r.approved ? (
                        <button
                          type="button"
                          onClick={() => void setApproved(r.id, false)}
                          disabled={busyId === r.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        >
                          {busyId === r.id ? (
                            <SpinnerIcon className="h-4 w-4 animate-spin" />
                          ) : (
                            <RevokeIcon className="h-4 w-4" />
                          )}
                          Revoke
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void setApproved(r.id, true)}
                          disabled={busyId === r.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
                        >
                          {busyId === r.id ? (
                            <SpinnerIcon className="h-4 w-4 animate-spin" weight="bold" />
                          ) : (
                            <CheckIcon className="h-4 w-4" weight="bold" />
                          )}
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
