-- 기존 숨김 교육을 운영 기록으로 보존하면서 접수마감 교육으로 전환합니다.
-- Supabase SQL Editor에서 1회 실행하세요.

update public.programs
set
  status = 'closed',
  is_active = true,
  updated_at = now()
where is_active = false;
