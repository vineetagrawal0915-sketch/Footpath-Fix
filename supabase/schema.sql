-- ============================================================
--  FootpathFix — Supabase Database Schema
--  Run this in Supabase > SQL Editor
-- ============================================================

-- ── Enable UUID extension ──────────────────────────────────────
create extension if not exists "pgcrypto";

-- ============================================================
--  TABLE: reports
-- ============================================================
create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  category         text not null,
  description      text not null,
  location         text not null,
  image_path       text,
  status           text not null default 'Pending'
                     check (status in ('Pending', 'In Progress', 'Resolved')),
  resolution_note  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Index for performance
create index if not exists idx_reports_status     on public.reports (status);
create index if not exists idx_reports_category   on public.reports (category);
create index if not exists idx_reports_created_at on public.reports (created_at desc);

-- ── Auto-update updated_at timestamp ──────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_reports on public.reports;
create trigger set_updated_at_reports
  before update on public.reports
  for each row execute function public.set_updated_at();

-- ============================================================
--  TABLE: admin_users
--  Secure admin role registry — links Supabase Auth UIDs
--  to admin privileges. Never trust user-supplied roles.
-- ============================================================
create table if not exists public.admin_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================
--  ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on both tables
alter table public.reports     enable row level security;
alter table public.admin_users enable row level security;

-- ── Reports policies ──────────────────────────────────────────

-- 1. Anyone (including anonymous visitors) can READ reports
drop policy if exists "Public can read reports" on public.reports;
create policy "Public can read reports"
  on public.reports for select
  using (true);

-- 2. Anonymous visitors can INSERT new reports
--    (anon key is safe here — we do not let them set status or resolution_note)
drop policy if exists "Anyone can insert reports" on public.reports;
create policy "Anyone can insert reports"
  on public.reports for insert
  with check (
    status = 'Pending' and resolution_note is null
  );

-- 3. Only authenticated admins can UPDATE reports
drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
  on public.reports for update
  using (
    exists (
      select 1 from public.admin_users
      where user_id = auth.uid()
    )
  );

-- 4. Only authenticated admins can DELETE reports
drop policy if exists "Admins can delete reports" on public.reports;
create policy "Admins can delete reports"
  on public.reports for delete
  using (
    exists (
      select 1 from public.admin_users
      where user_id = auth.uid()
    )
  );

-- ── Admin Users policies ───────────────────────────────────────

-- 1. Admins can read the admin_users table (to verify their own status)
drop policy if exists "Admins can read admin_users" on public.admin_users;
create policy "Admins can read admin_users"
  on public.admin_users for select
  using (
    auth.uid() = user_id
    or
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

-- 2. No INSERT/UPDATE/DELETE via frontend — only via Supabase service role
--    (admin_users is managed via the Supabase dashboard or a secure backend)

-- ============================================================
--  STORAGE: report-images bucket
-- ============================================================
--  Run these statements AFTER creating the bucket in
--  Supabase > Storage > New Bucket > "report-images" (PUBLIC).
--
--  If you chose PUBLIC bucket, images are readable via public URL.
--  Trade-off: Anyone who guesses a file path can view the image.
--  For a civic tool this is acceptable; for sensitive data use
--  signed URLs instead (set bucket to PRIVATE and call
--  supabase.storage.from('report-images').createSignedUrl(...)).

-- ⚠️  Run these storage policies ONLY AFTER creating the
-- 'report-images' bucket in Supabase > Storage.
-- Drop old policies first to avoid duplicate-name errors.

do $$
begin
  -- Anyone can upload to report-images
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Anyone can upload report images'
  ) then
    execute 'create policy "Anyone can upload report images"
      on storage.objects for insert
      with check ( bucket_id = ''report-images'' )';
  end if;

  -- Public can read images
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Public can read report images'
  ) then
    execute 'create policy "Public can read report images"
      on storage.objects for select
      using ( bucket_id = ''report-images'' )';
  end if;

  -- Only admins can delete images
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Admins can delete report images'
  ) then
    execute 'create policy "Admins can delete report images"
      on storage.objects for delete
      using (
        bucket_id = ''report-images''
        and exists (
          select 1 from public.admin_users
          where user_id = auth.uid()
        )
      )';
  end if;
end;
$$;
