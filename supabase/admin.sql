-- Admin role + practice/PCN, enabling the in-app Admin → Users page.
-- Run once in the Supabase SQL editor, AFTER allowed-domains.sql and approvals.sql.

-- 1. New columns: which practice/PCN the user belongs to, and an admin flag.
alter table public.profiles add column if not exists practice text;
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- 2. Capture the practice (from sign-up metadata) when the profile is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, practice)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'practice', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. Helper: is the CURRENT user an admin? SECURITY DEFINER reads profiles
--    bypassing RLS, so it can be used inside profiles policies without recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- 4. Policies: a user reads their own row; admins read + update every row.
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "read own or admin reads all" on public.profiles;
create policy "read own or admin reads all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- 5. Bootstrap your admin account (adjust the email). This also approves you.
--    insert backfills a row if you signed up before the trigger existed.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

update public.profiles
set is_admin = true, approved = true
where lower(email) = 'b.patel20@nhs.net';
