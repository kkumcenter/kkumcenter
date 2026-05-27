-- 군북면 꿈키움센터 Supabase schema
-- 실행 순서: 1) schema.sql -> 2) seed.sql -> 3) policies.sql

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_role' and n.nspname = 'public'
  ) then
    create type public.user_role as enum ('user', 'admin');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'applicant_type' and n.nspname = 'public'
  ) then
    create type public.applicant_type as enum ('member', 'guest');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'reservation_status' and n.nspname = 'public'
  ) then
    create type public.reservation_status as enum ('received', 'approved', 'rejected', 'canceled');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'program_status' and n.nspname = 'public'
  ) then
    create type public.program_status as enum ('scheduled', 'open', 'closed', 'finished');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'program_application_status' and n.nspname = 'public'
  ) then
    create type public.program_application_status as enum ('completed', 'waiting', 'approved', 'canceled');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'inquiry_status' and n.nspname = 'public'
  ) then
    create type public.inquiry_status as enum ('received', 'checking', 'answered');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'post_board_type' and n.nspname = 'public'
  ) then
    create type public.post_board_type as enum ('notice', 'village');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'content_status' and n.nspname = 'public'
  ) then
    create type public.content_status as enum ('public', 'private', 'draft', 'hidden');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'admin_action_type' and n.nspname = 'public'
  ) then
    create type public.admin_action_type as enum (
      'create',
      'update',
      'approve',
      'reject',
      'cancel',
      'answer',
      'hide',
      'delete'
    );
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  name text not null default '이름 미입력',
  phone text not null default '연락처 미입력',
  region text not null default '지역 미입력',
  email text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_phone_idx on public.profiles (phone);

create table if not exists public.admin_email_allowlist (
  email text primary key,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role public.user_role := 'user';
begin
  if exists (
    select 1
    from public.admin_email_allowlist
    where lower(email) = lower(new.email)
      and is_active = true
  ) then
    resolved_role := 'admin';
  end if;

  insert into public.profiles (
    id,
    role,
    name,
    phone,
    region,
    email
  )
  values (
    new.id,
    resolved_role,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, ''), '@', 1), '이름 미입력'),
    coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), '연락처 미입력'),
    coalesce(nullif(new.raw_user_meta_data ->> 'region', ''), '지역 미입력'),
    new.email
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = case
      when public.profiles.role = 'admin' then public.profiles.role
      else excluded.role
    end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  floor text not null,
  name text not null,
  summary text,
  description text,
  capacity integer,
  equipment text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spaces_is_active_idx on public.spaces (is_active);
create index if not exists spaces_sort_order_idx on public.spaces (sort_order);

create table if not exists public.space_reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_no text not null unique,
  space_id uuid not null references public.spaces(id),
  user_id uuid references auth.users(id) on delete set null,
  applicant_type public.applicant_type not null default 'guest',
  applicant_name text not null,
  phone text not null,
  lookup_password_hash text,
  reservation_date date not null,
  start_time time not null,
  end_time time not null,
  purpose text not null,
  headcount integer not null,
  note text,
  status public.reservation_status not null default 'received',
  admin_note text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint space_reservation_time_check check (start_time < end_time),
  constraint space_reservation_headcount_check check (headcount > 0)
);

create index if not exists space_reservations_space_date_idx on public.space_reservations (space_id, reservation_date);
create index if not exists space_reservations_status_idx on public.space_reservations (status);
create index if not exists space_reservations_created_at_idx on public.space_reservations (created_at desc);
create index if not exists space_reservations_user_id_idx on public.space_reservations (user_id);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  content text not null,
  image_url text,
  place text not null,
  instructor text,
  target text,
  capacity integer not null,
  start_date date not null,
  end_date date not null,
  apply_start_date date not null,
  apply_end_date date not null,
  status public.program_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_capacity_check check (capacity > 0),
  constraint program_date_check check (start_date <= end_date),
  constraint program_apply_date_check check (apply_start_date <= apply_end_date)
);

create index if not exists programs_status_idx on public.programs (status);
create index if not exists programs_apply_period_idx on public.programs (apply_start_date, apply_end_date);
create index if not exists programs_created_at_idx on public.programs (created_at desc);

create table if not exists public.program_applications (
  id uuid primary key default gen_random_uuid(),
  application_no text not null unique,
  program_id uuid not null references public.programs(id),
  user_id uuid references auth.users(id) on delete set null,
  applicant_type public.applicant_type not null default 'guest',
  applicant_name text not null,
  phone text not null,
  birth_year integer not null,
  region text not null,
  lookup_password_hash text,
  status public.program_application_status not null default 'completed',
  waitlist_order integer,
  created_at timestamptz not null default now(),
  canceled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint program_application_birth_year_check check (birth_year between 1900 and 2100)
);

create index if not exists program_applications_program_status_idx on public.program_applications (program_id, status);
create index if not exists program_applications_user_id_idx on public.program_applications (user_id);
create index if not exists program_applications_created_at_idx on public.program_applications (created_at desc);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_no text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  writer_type public.applicant_type not null default 'guest',
  writer_name text not null,
  phone text not null,
  lookup_password_hash text,
  title text not null,
  content text not null,
  status public.inquiry_status not null default 'received',
  answer text,
  answered_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquiries_status_idx on public.inquiries (status);
create index if not exists inquiries_user_id_idx on public.inquiries (user_id);
create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  board_type public.post_board_type not null,
  title text not null,
  content text not null,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  status public.content_status not null default 'public',
  view_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_board_status_created_idx on public.posts (board_type, status, created_at desc);
create index if not exists posts_author_id_idx on public.posts (author_id);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  file_name text not null,
  file_url text not null,
  file_size integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists attachments_target_idx on public.attachments (target_type, target_id);

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  place text,
  description text,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  cover_image_url text not null,
  status public.content_status not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists galleries_status_created_idx on public.galleries (status, created_at desc);
create index if not exists galleries_author_id_idx on public.galleries (author_id);

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gallery_images_gallery_sort_idx on public.gallery_images (gallery_id, sort_order);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action_type public.admin_action_type not null,
  target_type text not null,
  target_id uuid not null,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists admin_logs_admin_created_idx on public.admin_logs (admin_id, created_at desc);
create index if not exists admin_logs_target_idx on public.admin_logs (target_type, target_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_admin_email_allowlist_updated_at on public.admin_email_allowlist;
create trigger set_admin_email_allowlist_updated_at
before update on public.admin_email_allowlist
for each row execute function public.set_updated_at();

drop trigger if exists set_spaces_updated_at on public.spaces;
create trigger set_spaces_updated_at
before update on public.spaces
for each row execute function public.set_updated_at();

drop trigger if exists set_space_reservations_updated_at on public.space_reservations;
create trigger set_space_reservations_updated_at
before update on public.space_reservations
for each row execute function public.set_updated_at();

drop trigger if exists set_programs_updated_at on public.programs;
create trigger set_programs_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

drop trigger if exists set_program_applications_updated_at on public.program_applications;
create trigger set_program_applications_updated_at
before update on public.program_applications
for each row execute function public.set_updated_at();

drop trigger if exists set_inquiries_updated_at on public.inquiries;
create trigger set_inquiries_updated_at
before update on public.inquiries
for each row execute function public.set_updated_at();

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists set_galleries_updated_at on public.galleries;
create trigger set_galleries_updated_at
before update on public.galleries
for each row execute function public.set_updated_at();
