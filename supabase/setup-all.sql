-- ============================================================
-- ClinicalPharmTools — complete Supabase auth setup.
-- Paste this whole file into the Supabase SQL editor and click Run.
-- It is safe to run more than once. Combines allowed-domains.sql +
-- approvals.sql + admin.sql in the correct order.
-- ============================================================

-- 1. Profile table (one row per user; gates access).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  pcn text,
  practice text,
  approved boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists pcn text;
alter table public.profiles add column if not exists practice text;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles enable row level security;

-- 2. Restrict sign-ups to approved domains (server-side; can't be bypassed).
create or replace function public.enforce_allowed_email_domains()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  allowed text[] := array['nhs.net', 'abtrace.co'];
  domain  text := lower(split_part(new.email, '@', 2));
begin
  if not (domain = any (allowed)) then
    raise exception 'Sign-up is restricted to NHS or abtrace.co email addresses';
  end if;
  return new;
end; $$;
drop trigger if exists enforce_allowed_email_domains on auth.users;
create trigger enforce_allowed_email_domains
  before insert on auth.users
  for each row execute function public.enforce_allowed_email_domains();

-- 3. Auto-create a (pending) profile on sign-up, storing practice / PCN.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, pcn, practice)
  values (
    new.id, new.email,
    nullif(new.raw_user_meta_data ->> 'pcn', ''),
    nullif(new.raw_user_meta_data ->> 'practice', '')
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Admin check (SECURITY DEFINER avoids RLS recursion).
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = '' stable as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- 5. Policies: a user reads their own row (admins read all); admins update any.
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "read own or admin reads all" on public.profiles;
create policy "read own or admin reads all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles"
  on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- 6. Backfill rows for anyone who already signed up.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- 7. Make YOU an approved admin. >>> change the email if needed <<<
update public.profiles
set approved = true, is_admin = true
where lower(email) = 'b.patel20@nhs.net';

-- 8. Check it worked — your row should show approved = true, is_admin = true.
select email, practice, approved, is_admin, created_at
from public.profiles
order by created_at desc;
