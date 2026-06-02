-- 강사 정보는 관리자 내부관리용으로만 보관합니다.
-- Supabase SQL Editor 또는 `supabase db query --linked --file supabase/programs-instructor-private-migration.sql`로 1회 실행하세요.

alter table public.programs
  add column if not exists instructor_phone text;

drop policy if exists "Anyone can read programs" on public.programs;
