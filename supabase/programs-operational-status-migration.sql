-- 교육 노출상태/운영상태 컬럼을 추가하고 기존 데이터를 새 운영 기준으로 정리합니다.
-- Supabase SQL Editor 또는 `supabase db query --linked --file supabase/programs-operational-status-migration.sql`로 1회 실행하세요.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'program_visibility' and n.nspname = 'public'
  ) then
    create type public.program_visibility as enum ('private', 'public', 'archive');
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

alter table public.programs
  add column if not exists visibility public.program_visibility not null default 'public',
  add column if not exists operation_status public.program_operation_status not null default 'normal',
  add column if not exists cancel_reason text,
  add column if not exists canceled_at timestamptz;

update public.programs
set visibility = 'private'
where is_active = false;

update public.programs
set
  status = 'closed',
  updated_at = now()
where status = 'finished';

create index if not exists programs_visibility_idx on public.programs (visibility);
create index if not exists programs_operation_status_idx on public.programs (operation_status);
create index if not exists programs_public_lookup_idx
on public.programs (visibility, operation_status, status, start_date, end_date)
where is_active = true;

drop policy if exists "Anyone can read programs" on public.programs;
create policy "Anyone can read programs"
on public.programs
for select
using (
  is_active = true
  and operation_status = 'normal'
  and visibility in ('public', 'archive')
);
