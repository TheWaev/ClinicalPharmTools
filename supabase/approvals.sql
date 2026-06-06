-- Admin-approval gate.
--
-- New users can sign in (after email confirmation) but cannot ACCESS the app
-- until an admin sets profiles.approved = true. Run once in the Supabase SQL
-- editor, after allowed-domains.sql.
--
-- Bootstrapping the first admin: sign up yourself, confirm your email, then in
-- the Supabase dashboard → Table editor → profiles, set your row's `approved`
-- to true. After that you can approve everyone else the same way.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A signed-in user may read only their own profile (to learn their status).
-- There is deliberately no user insert/update policy: rows are created by the
-- trigger below, and an admin approves via the dashboard/service role (which
-- bypasses RLS), so users can never self-approve.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Auto-create a pending profile row when a user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
