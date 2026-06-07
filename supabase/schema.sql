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
    where t.typname = 'staff_gender' and n.nspname = 'public'
  ) then
    create type public.staff_gender as enum ('male', 'female', 'other', 'undisclosed');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'admin_role' and n.nspname = 'public'
  ) then
    create type public.admin_role as enum ('super_admin', 'board_admin');
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
    where t.typname = 'program_visibility' and n.nspname = 'public'
  ) then
    create type public.program_visibility as enum ('private', 'public');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'program_operation_status' and n.nspname = 'public'
  ) then
    create type public.program_operation_status as enum ('normal', 'canceled');
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
  admin_role public.admin_role,
  name text not null default '이름 미입력',
  phone text not null default '연락처 미입력',
  region text not null default '지역 미입력',
  email text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists admin_role public.admin_role;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_admin_role_idx on public.profiles (admin_role);
create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_phone_idx on public.profiles (phone);

create table if not exists public.admin_email_allowlist (
  email text primary key,
  admin_role public.admin_role not null default 'board_admin',
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_email_allowlist
  add column if not exists admin_role public.admin_role not null default 'board_admin';

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null unique,
  full_name text not null,
  display_name text,
  birth_date date,
  gender public.staff_gender not null default 'undisclosed',
  admin_role public.admin_role not null default 'board_admin',
  is_active boolean not null default true,
  deactivated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_members
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists full_name text,
  add column if not exists display_name text,
  add column if not exists birth_date date,
  add column if not exists gender public.staff_gender not null default 'undisclosed',
  add column if not exists admin_role public.admin_role not null default 'board_admin',
  add column if not exists is_active boolean not null default true,
  add column if not exists deactivated_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

create index if not exists staff_members_role_active_idx on public.staff_members (admin_role, is_active);
create index if not exists staff_members_email_idx on public.staff_members (lower(email));
create index if not exists staff_members_auth_user_idx on public.staff_members (auth_user_id);

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

create or replace function public.is_super_admin()
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
      and admin_role = 'super_admin'
  );
$$;

create or replace function public.can_manage_board()
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
      and admin_role in ('super_admin', 'board_admin')
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
  resolved_admin_role public.admin_role := null;
begin
  select admin_role
  into resolved_admin_role
  from public.admin_email_allowlist
  where lower(email) = lower(new.email)
    and is_active = true
  limit 1;

  if resolved_admin_role is not null then
    resolved_role := 'admin';
  end if;

  insert into public.profiles (
    id,
    role,
    admin_role,
    name,
    phone,
    region,
    email
  )
  values (
    new.id,
    resolved_role,
    resolved_admin_role,
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
    admin_role = case
      when public.profiles.admin_role = 'super_admin' then public.profiles.admin_role
      else excluded.admin_role
    end,
    updated_at = now();

  update public.staff_members
  set
    auth_user_id = new.id,
    updated_at = now()
  where lower(email) = lower(coalesce(new.email, ''));

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
  birth_year integer,
  region text,
  lookup_password_hash text,
  reservation_date date not null,
  reservation_end_date date,
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
  constraint space_reservation_headcount_check check (headcount > 0),
  constraint space_reservation_birth_year_check check (birth_year is null or birth_year between 1900 and 2100)
);

alter table public.space_reservations
  add column if not exists birth_year integer,
  add column if not exists region text,
  add column if not exists reservation_end_date date;

create index if not exists space_reservations_space_date_idx on public.space_reservations (space_id, reservation_date);
create index if not exists space_reservations_status_idx on public.space_reservations (status);
create index if not exists space_reservations_created_at_idx on public.space_reservations (created_at desc);
create index if not exists space_reservations_user_id_idx on public.space_reservations (user_id);
create index if not exists space_reservations_birth_region_idx on public.space_reservations (birth_year, region);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  content text not null,
  image_url text,
  place text not null,
  instructor text,
  instructor_phone text,
  target text,
  capacity integer not null,
  start_date date not null,
  end_date date not null,
  apply_start_date date not null,
  apply_end_date date not null,
  status public.program_status not null default 'scheduled',
  visibility public.program_visibility not null default 'public',
  operation_status public.program_operation_status not null default 'normal',
  cancel_reason text,
  canceled_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_capacity_check check (capacity > 0),
  constraint program_date_check check (start_date <= end_date),
  constraint program_apply_date_check check (apply_start_date <= apply_end_date)
);

alter table public.programs
  add column if not exists is_active boolean not null default true,
  add column if not exists visibility public.program_visibility not null default 'public',
  add column if not exists operation_status public.program_operation_status not null default 'normal',
  add column if not exists instructor_phone text,
  add column if not exists cancel_reason text,
  add column if not exists canceled_at timestamptz;

create index if not exists programs_status_idx on public.programs (status);
create index if not exists programs_active_status_idx on public.programs (is_active, status);
create index if not exists programs_visibility_idx on public.programs (visibility);
create index if not exists programs_operation_status_idx on public.programs (operation_status);
create index if not exists programs_public_lookup_idx on public.programs (visibility, operation_status, status, start_date, end_date)
where is_active = true;
create index if not exists programs_apply_period_idx on public.programs (apply_start_date, apply_end_date);
create index if not exists programs_created_at_idx on public.programs (created_at desc);
create unique index if not exists programs_active_title_period_uidx
on public.programs (lower(title), start_date, end_date)
where is_active = true;

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

create table if not exists public.program_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  session_no integer not null,
  session_date date not null,
  start_time time,
  end_time time,
  place text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_session_no_check check (session_no > 0),
  constraint program_session_time_check check (start_time is null or end_time is null or start_time < end_time)
);

create index if not exists program_sessions_program_date_idx on public.program_sessions (program_id, session_date);

create table if not exists public.program_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.program_sessions(id) on delete cascade,
  application_id uuid not null references public.program_applications(id) on delete cascade,
  attended boolean not null default false,
  note text,
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, application_id)
);

create index if not exists program_attendance_session_idx on public.program_attendance (session_id);
create index if not exists program_attendance_application_idx on public.program_attendance (application_id);

create table if not exists public.program_feedback (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  application_id uuid references public.program_applications(id) on delete set null,
  rating integer,
  improvement_text text,
  revisit_intent boolean,
  created_at timestamptz not null default now(),
  constraint program_feedback_rating_check check (rating is null or rating between 1 and 5)
);

create index if not exists program_feedback_program_idx on public.program_feedback (program_id);
create index if not exists program_feedback_application_idx on public.program_feedback (application_id);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_no text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  writer_type public.applicant_type not null default 'guest',
  writer_name text not null,
  phone text not null,
  birth_year integer,
  region text,
  lookup_password_hash text,
  title text not null,
  content text not null,
  status public.inquiry_status not null default 'received',
  answer text,
  answered_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiries_birth_year_check check (birth_year is null or birth_year between 1900 and 2100)
);

alter table public.inquiries
  add column if not exists birth_year integer,
  add column if not exists region text;

create index if not exists inquiries_status_idx on public.inquiries (status);
create index if not exists inquiries_user_id_idx on public.inquiries (user_id);
create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);
create index if not exists inquiries_birth_region_idx on public.inquiries (birth_year, region);

create table if not exists public.space_usage_logs (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.space_reservations(id) on delete cascade,
  actual_used boolean not null default true,
  actual_headcount integer,
  admin_note text,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint space_usage_headcount_check check (actual_headcount is null or actual_headcount >= 0)
);

create index if not exists space_usage_logs_reservation_idx on public.space_usage_logs (reservation_id);
create index if not exists space_usage_logs_recorded_at_idx on public.space_usage_logs (recorded_at desc);

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
  storage_path text,
  storage_bucket text,
  mime_type text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.attachments
  add column if not exists storage_path text,
  add column if not exists storage_bucket text,
  add column if not exists mime_type text;

create index if not exists attachments_target_idx on public.attachments (target_type, target_id);
create index if not exists attachments_storage_path_idx on public.attachments (storage_path);

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
  storage_path text,
  storage_bucket text,
  file_size integer,
  mime_type text,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.gallery_images
  add column if not exists storage_path text,
  add column if not exists storage_bucket text,
  add column if not exists file_size integer,
  add column if not exists mime_type text;

create index if not exists gallery_images_gallery_sort_idx on public.gallery_images (gallery_id, sort_order);
create index if not exists gallery_images_storage_path_idx on public.gallery_images (storage_path);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  youtube_id text not null,
  description text,
  event_date date,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  status public.content_status not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists videos_status_created_idx on public.videos (status, created_at desc);
create index if not exists videos_youtube_id_idx on public.videos (youtube_id);
create index if not exists videos_author_id_idx on public.videos (author_id);

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

create or replace view public.usage_age_group_stats
with (security_invoker = true)
as
with usage_rows as (
  select '교육신청'::text as source_type, birth_year, created_at from public.program_applications
  union all
  select '공간예약'::text as source_type, birth_year, created_at from public.space_reservations where birth_year is not null
  union all
  select '문의'::text as source_type, birth_year, created_at from public.inquiries where birth_year is not null
)
select
  source_type,
  case
    when birth_year is null then '미입력'
    when extract(year from current_date)::int - birth_year < 10 then '10세 미만'
    when extract(year from current_date)::int - birth_year >= 80 then '80대 이상'
    else concat(((extract(year from current_date)::int - birth_year) / 10) * 10, '대')
  end as age_group,
  count(*)::integer as usage_count,
  min(created_at) as first_used_at,
  max(created_at) as last_used_at
from usage_rows
group by source_type, age_group;

create or replace view public.usage_region_stats
with (security_invoker = true)
as
with usage_rows as (
  select '교육신청'::text as source_type, region, created_at from public.program_applications
  union all
  select '공간예약'::text as source_type, region, created_at from public.space_reservations where region is not null
  union all
  select '문의'::text as source_type, region, created_at from public.inquiries where region is not null
)
select
  source_type,
  coalesce(nullif(trim(region), ''), '미입력') as region,
  count(*)::integer as usage_count,
  min(created_at) as first_used_at,
  max(created_at) as last_used_at
from usage_rows
group by source_type, coalesce(nullif(trim(region), ''), '미입력');

create or replace view public.program_application_stats
with (security_invoker = true)
as
select
  programs.id as program_id,
  programs.title,
  programs.status,
  programs.capacity,
  programs.apply_start_date,
  programs.apply_end_date,
  programs.start_date,
  programs.end_date,
  count(program_applications.id)::integer as total_count,
  count(program_applications.id) filter (where program_applications.status = 'completed')::integer as completed_count,
  count(program_applications.id) filter (where program_applications.status = 'approved')::integer as approved_count,
  count(program_applications.id) filter (where program_applications.status = 'waiting')::integer as waiting_count,
  count(program_applications.id) filter (where program_applications.status = 'canceled')::integer as canceled_count,
  case
    when count(program_applications.id) = 0 then 0
    else round((count(program_applications.id) filter (where program_applications.status = 'approved')::numeric / count(program_applications.id)::numeric) * 100, 1)
  end as approval_rate
from public.programs
left join public.program_applications on program_applications.program_id = programs.id
where programs.is_active = true
group by programs.id;

create or replace view public.program_attendance_stats
with (security_invoker = true)
as
select
  programs.id as program_id,
  programs.title,
  count(distinct program_sessions.id)::integer as session_count,
  count(program_attendance.id)::integer as attendance_total,
  count(program_attendance.id) filter (where program_attendance.attended = true)::integer as attended_count,
  case
    when count(program_attendance.id) = 0 then 0
    else round((count(program_attendance.id) filter (where program_attendance.attended = true)::numeric / count(program_attendance.id)::numeric) * 100, 1)
  end as attendance_rate
from public.programs
left join public.program_sessions on program_sessions.program_id = programs.id
left join public.program_attendance on program_attendance.session_id = program_sessions.id
where programs.is_active = true
group by programs.id;

create or replace view public.space_usage_stats
with (security_invoker = true)
as
select
  spaces.id as space_id,
  spaces.name,
  count(space_reservations.id)::integer as reservation_count,
  count(space_reservations.id) filter (where space_reservations.status = 'approved')::integer as approved_count,
  count(space_usage_logs.id) filter (where space_usage_logs.actual_used = true)::integer as actual_used_count,
  coalesce(sum(space_usage_logs.actual_headcount), 0)::integer as actual_headcount_total
from public.spaces
left join public.space_reservations on space_reservations.space_id = spaces.id
left join public.space_usage_logs on space_usage_logs.reservation_id = space_reservations.id
where spaces.is_active = true
group by spaces.id;

create or replace view public.monthly_usage_stats
with (security_invoker = true)
as
with usage_rows as (
  select '교육신청'::text as source_type, created_at from public.program_applications
  union all
  select '공간예약'::text as source_type, created_at from public.space_reservations
  union all
  select '문의'::text as source_type, created_at from public.inquiries
)
select
  date_trunc('month', created_at)::date as usage_month,
  source_type,
  count(*)::integer as usage_count
from usage_rows
group by date_trunc('month', created_at)::date, source_type;

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

drop trigger if exists set_staff_members_updated_at on public.staff_members;
create trigger set_staff_members_updated_at
before update on public.staff_members
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

drop trigger if exists set_program_sessions_updated_at on public.program_sessions;
create trigger set_program_sessions_updated_at
before update on public.program_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_program_attendance_updated_at on public.program_attendance;
create trigger set_program_attendance_updated_at
before update on public.program_attendance
for each row execute function public.set_updated_at();

drop trigger if exists set_inquiries_updated_at on public.inquiries;
create trigger set_inquiries_updated_at
before update on public.inquiries
for each row execute function public.set_updated_at();

drop trigger if exists set_space_usage_logs_updated_at on public.space_usage_logs;
create trigger set_space_usage_logs_updated_at
before update on public.space_usage_logs
for each row execute function public.set_updated_at();

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists set_galleries_updated_at on public.galleries;
create trigger set_galleries_updated_at
before update on public.galleries
for each row execute function public.set_updated_at();

drop trigger if exists set_videos_updated_at on public.videos;
create trigger set_videos_updated_at
before update on public.videos
for each row execute function public.set_updated_at();
