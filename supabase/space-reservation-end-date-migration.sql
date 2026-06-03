-- 공간예약 종료일 컬럼을 추가하고 기존 예약은 시작일과 같은 날짜로 채웁니다.
-- Supabase SQL Editor 또는 `supabase db query --linked --file supabase/space-reservation-end-date-migration.sql`로 1회 실행하세요.

alter table public.space_reservations
  add column if not exists reservation_end_date date;

update public.space_reservations
set reservation_end_date = reservation_date
where reservation_end_date is null;
