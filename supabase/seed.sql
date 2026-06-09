-- 군북면 꿈키움센터 Supabase seed data
-- 실행 순서: 1) schema.sql -> 2) seed.sql -> 3) policies.sql

-- 임시 관리자 이메일입니다.
-- 실제 운영 전 최종 관리자 이메일이 확정되면 아래 이메일만 교체하면 됩니다.
insert into public.admin_email_allowlist (email, note, is_active)
values
  ('sang4307@naver.com', '임시 관리자 계정. 실제 운영 전 변경 가능', true),
  ('kkumcenter@gmail.com', '임시 관리자 계정. 실제 운영 전 변경 가능', true)
on conflict (email) do update
set
  note = excluded.note,
  is_active = excluded.is_active,
  updated_at = now();

-- 이미 가입된 계정이 있다면 관리자 권한을 반영합니다.
-- 계정이 아직 없다면, 회원가입 후 이 update 문을 다시 실행해도 됩니다.
update public.profiles
set
  role = 'admin',
  updated_at = now()
where lower(email) in ('sang4307@naver.com', 'kkumcenter@gmail.com');

-- 관리자 계정 확정: 기존 두 이메일은 항상 super_admin으로 유지합니다.
insert into public.admin_email_allowlist (email, admin_role, note, is_active)
values
  ('sang4307@naver.com', 'super_admin', '관리자 계정', true),
  ('kkumcenter@gmail.com', 'super_admin', '관리자 계정', true)
on conflict (email) do update
set
  admin_role = excluded.admin_role,
  note = excluded.note,
  is_active = excluded.is_active,
  updated_at = now();

update public.profiles
set
  role = 'admin',
  admin_role = 'super_admin',
  name = '관리자',
  updated_at = now()
where lower(email) in ('sang4307@naver.com', 'kkumcenter@gmail.com');

insert into public.staff_members (
  email,
  full_name,
  display_name,
  birth_date,
  gender,
  admin_role,
  is_active,
  auth_user_id
)
values
  ('sang4307@naver.com', '관리자', '관리자', null, 'undisclosed', 'super_admin', true, null),
  ('kkumcenter@gmail.com', '관리자', '관리자', null, 'undisclosed', 'super_admin', true, null)
on conflict (email) do update
set
  full_name = excluded.full_name,
  display_name = excluded.display_name,
  admin_role = excluded.admin_role,
  is_active = excluded.is_active,
  updated_at = now();

update public.staff_members staff
set
  auth_user_id = profiles.id,
  updated_at = now()
from public.profiles
where lower(staff.email) = lower(profiles.email)
  and lower(staff.email) in ('sang4307@naver.com', 'kkumcenter@gmail.com');

insert into public.spaces (
  slug,
  floor,
  name,
  summary,
  description,
  capacity,
  equipment,
  sort_order
)
values
  (
    'kitchen',
    '1층',
    '공유주방',
    '베이킹 교육, 반찬 나눔, 로컬푸드 연계 프로그램',
    '주민이 함께 요리하고 나누는 공유형 주방 공간입니다.',
    null,
    '조리대, 세척 공간, 테이블, 의자, 조리 보조 집기',
    1
  ),
  (
    'main-hall',
    '1층',
    '대회의실',
    '주민위원회, 운영회의',
    '주민 회의와 운영 논의를 위한 다목적 회의 공간입니다.',
    null,
    '회의 테이블, 의자, 발표 장비',
    2
  ),
  (
    'classroom',
    '2층',
    '강의실',
    '주민교육, 워크숍, 역량강화 프로그램',
    '교육과 워크숍, 주민 역량 강화 프로그램을 운영하는 공간입니다.',
    null,
    '강의 테이블, 의자, 모니터, 발표 장비',
    3
  ),
  (
    'small-meeting',
    '2층',
    '소회의실',
    '소규모 상담과 협의',
    '소규모 상담, 협의, 회의를 위한 조용한 공간입니다.',
    null,
    '회의 테이블, 의자',
    4
  ),
  (
    'youth-room',
    '2층',
    '청소년활동실',
    '청소년·가족 활동, 돌봄과 놀이 프로그램',
    '청소년과 가족 활동, 돌봄과 놀이 프로그램을 위한 열린 공간입니다.',
    null,
    '좌식 공간, 테이블, 의자',
    5
  ),
  (
    'media-studio',
    '2층',
    '미디어스튜디오',
    '마을소식, 프로그램 기록',
    '마을소식과 프로그램 기록을 제작하는 작은 미디어 공간입니다.',
    null,
    '촬영 공간, 컴퓨터, 책상, 의자',
    6
  )
on conflict (slug) do update
set
  floor = excluded.floor,
  name = excluded.name,
  summary = excluded.summary,
  description = excluded.description,
  capacity = excluded.capacity,
  equipment = excluded.equipment,
  sort_order = excluded.sort_order,
  updated_at = now();
