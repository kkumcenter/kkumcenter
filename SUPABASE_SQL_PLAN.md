# 군북면 꿈키움센터 Supabase SQL 설계안 1차안

## 1. 현재 진행 단계

Supabase DB 구조 설계 작업은 다음 순서로 진행합니다.

| 순서 | 작업 | 현재 상태 |
| --- | --- | --- |
| 1 | 운영 기준 정리 | 완료 |
| 2 | 관리자 페이지 기획서 1차안 작성 | 완료 |
| 3 | Supabase DB 구조 설계 | 완료 |
| 4 | Supabase SQL 설계안 작성 | 현재 단계 |
| 5 | 실제 Supabase 프로젝트 생성 | 다음 단계 |
| 6 | SQL 실행 및 테이블 생성 | 다음 단계 |
| 7 | 관리자 화면과 DB 연결 | 이후 단계 |
| 8 | 공간예약, 교육신청, 문의 기능 연결 | 이후 단계 |
| 9 | 관리자 테스트 및 운영 기준 보완 | 이후 단계 |

현재는 4단계인 `Supabase SQL 설계안 작성` 단계입니다.

이 문서는 바로 실행할 수 있는 SQL에 가깝게 정리하되, 실제 Supabase에 적용하기 전 최종 확인을 거치는 설계안입니다.

## 2. SQL 설계 원칙

- 회원 계정 로그인은 Supabase Auth를 사용한다.
- 홈페이지에서 필요한 회원 정보는 `profiles` 테이블에 따로 저장한다.
- 회원과 비회원 모두 공간예약, 교육신청, 문의/제안을 사용할 수 있게 한다.
- 비회원은 이름, 연락처, 비밀번호 확인 방식으로 본인 신청과 문의를 조회한다.
- 비밀번호는 원문 그대로 저장하지 않고 암호화된 값만 저장한다.
- 관리자 권한은 1차 개발에서 하나로 통일한다.
- 삭제는 우선 완전 삭제보다 `hidden`, `canceled` 같은 상태 변경 방식으로 처리한다.
- 대시보드는 별도 테이블보다 기존 데이터를 모아 보여주는 방식으로 시작한다.

## 3. 테이블 생성 순서

Supabase SQL Editor에서 만들 때는 아래 순서를 권장합니다.

1. 확장 기능과 공통 함수
2. 상태값 타입
3. 회원 정보 테이블
4. 관리자 확인 함수
5. 공간, 프로그램 기본 테이블
6. 공간예약, 교육신청, 문의 테이블
7. 게시판, 갤러리, 첨부파일 테이블
8. 관리자 작업 기록 테이블
9. 초기 데이터 입력
10. RLS 권한 정책
11. Storage 버킷 설계

## 4. 확장 기능

UUID 생성과 비밀번호 해시 처리를 위해 `pgcrypto` 확장을 사용합니다.

```sql
create extension if not exists "pgcrypto";
```

## 5. 상태값 타입

상태값을 텍스트로 아무 값이나 넣지 않도록, 미리 사용할 값을 정해둡니다.

```sql
create type public.user_role as enum ('user', 'admin');
create type public.applicant_type as enum ('member', 'guest');

create type public.reservation_status as enum (
  'received',
  'approved',
  'rejected',
  'canceled'
);

create type public.program_status as enum (
  'scheduled',
  'open',
  'closed',
  'finished'
);

create type public.program_application_status as enum (
  'completed',
  'waiting',
  'approved',
  'canceled'
);

create type public.inquiry_status as enum (
  'received',
  'checking',
  'answered'
);

create type public.post_board_type as enum (
  'notice',
  'village'
);

create type public.content_status as enum (
  'public',
  'private',
  'draft',
  'hidden'
);

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
```

## 6. 회원 정보

### profiles

Supabase Auth의 사용자 id와 연결되는 회원 정보 테이블입니다.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  name text not null,
  phone text not null,
  region text not null,
  email text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 관리자 확인 함수

RLS 정책에서 관리자 여부를 확인하기 위한 함수입니다.

```sql
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
```

## 7. 공간예약

### spaces

예약 가능한 공간 6개를 저장합니다.

```sql
create table public.spaces (
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
```

### 초기 공간 데이터

```sql
insert into public.spaces (slug, floor, name, summary, capacity, equipment, sort_order)
values
  ('kitchen', '1층', '공유주방', '베이킹 교육, 반찬 나눔, 로컬푸드 연계 프로그램', null, '조리대, 세척 공간, 테이블, 의자, 조리 보조 집기', 1),
  ('main-hall', '1층', '대회의실', '주민위원회, 운영회의', null, '회의 테이블, 의자, 발표 장비', 2),
  ('classroom', '2층', '강의실', '주민교육, 워크숍, 역량강화 프로그램', null, '강의 테이블, 의자, 모니터, 발표 장비', 3),
  ('small-meeting', '2층', '소회의실', '소규모 상담과 협의', null, '회의 테이블, 의자', 4),
  ('youth-room', '2층', '청소년활동실', '청소년·가족 활동, 돌봄과 놀이 프로그램', null, '좌식 공간, 테이블, 의자', 5),
  ('media-studio', '2층', '미디어스튜디오', '마을소식, 프로그램 기록', null, '촬영 공간, 컴퓨터, 책상, 의자', 6);
```

### space_reservations

공간예약 신청 정보를 저장합니다.

```sql
create table public.space_reservations (
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
```

### 예약번호 생성 방식

예약번호는 화면에서 보여주기 쉬운 형태를 권장합니다.

예시:

```text
SR-20260527-0001
```

1차 개발에서는 서버 코드에서 번호를 만들어 넣는 방식을 권장합니다.

## 8. 프로그램과 교육신청

### programs

교육 프로그램 정보를 저장합니다.

```sql
create table public.programs (
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
```

### program_applications

교육 신청자 정보를 저장합니다.

```sql
create table public.program_applications (
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
```

### 선착순과 대기 처리 기준

정원 계산은 다음 기준을 권장합니다.

- `completed`, `approved` 상태를 신청 인원으로 본다.
- 정원 초과 후 들어온 신청은 `waiting` 상태로 둔다.
- 대기자는 `waitlist_order`로 순서를 관리한다.

정원 초과 판단은 SQL만으로 처리하기보다 서버 코드 또는 Supabase Edge Function에서 처리하는 것이 안전합니다.

## 9. 문의 / 제안

### inquiries

비공개 1:1 문의와 답변을 저장합니다.

```sql
create table public.inquiries (
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
```

## 10. 게시판

### posts

공지사항과 마을 이야기를 함께 관리합니다.

```sql
create table public.posts (
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
```

### attachments

게시판 첨부파일을 저장합니다.

```sql
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  file_name text not null,
  file_url text not null,
  file_size integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
```

## 11. 꿈센터 갤러리

### galleries

갤러리 게시글의 기본 정보를 저장합니다.

```sql
create table public.galleries (
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
```

### gallery_images

갤러리 추가 사진을 저장합니다.

```sql
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
```

## 12. 관리자 작업 기록

### admin_logs

관리자가 중요한 데이터를 바꿨을 때 최소한의 기록을 남깁니다.

```sql
create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action_type public.admin_action_type not null,
  target_type text not null,
  target_id uuid not null,
  summary text,
  created_at timestamptz not null default now()
);
```

## 13. updated_at 자동 갱신

수정일을 자동으로 갱신하기 위한 공통 함수입니다.

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

각 테이블에 트리거를 연결합니다.

```sql
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_spaces_updated_at
before update on public.spaces
for each row execute function public.set_updated_at();

create trigger set_space_reservations_updated_at
before update on public.space_reservations
for each row execute function public.set_updated_at();

create trigger set_programs_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

create trigger set_program_applications_updated_at
before update on public.program_applications
for each row execute function public.set_updated_at();

create trigger set_inquiries_updated_at
before update on public.inquiries
for each row execute function public.set_updated_at();

create trigger set_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create trigger set_galleries_updated_at
before update on public.galleries
for each row execute function public.set_updated_at();
```

## 14. RLS 권한 정책 1차안

RLS는 Supabase에서 테이블별 접근 권한을 정하는 규칙입니다.

아래 정책은 1차 설계안이며, 실제 적용 전 기능 구현 방식에 맞춰 보완해야 합니다.

### RLS 활성화

```sql
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_reservations enable row level security;
alter table public.programs enable row level security;
alter table public.program_applications enable row level security;
alter table public.inquiries enable row level security;
alter table public.posts enable row level security;
alter table public.attachments enable row level security;
alter table public.galleries enable row level security;
alter table public.gallery_images enable row level security;
alter table public.admin_logs enable row level security;
```

### 관리자 전체 접근

관리자는 주요 테이블을 관리할 수 있습니다.

```sql
create policy "Admins can manage profiles"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage spaces"
on public.spaces for all
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage reservations"
on public.space_reservations for all
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage programs"
on public.programs for all
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage program applications"
on public.program_applications for all
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage inquiries"
on public.inquiries for all
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage posts"
on public.posts for all
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage galleries"
on public.galleries for all
using (public.is_admin())
with check (public.is_admin());
```

### 공개 읽기

방문자가 볼 수 있는 공개 데이터입니다.

```sql
create policy "Anyone can read active spaces"
on public.spaces for select
using (is_active = true);

create policy "Anyone can read open programs"
on public.programs for select
using (true);

create policy "Anyone can read public posts"
on public.posts for select
using (status = 'public');

create policy "Anyone can read public galleries"
on public.galleries for select
using (status = 'public');

create policy "Anyone can read public gallery images"
on public.gallery_images for select
using (
  exists (
    select 1
    from public.galleries
    where galleries.id = gallery_images.gallery_id
      and galleries.status = 'public'
  )
);
```

### 회원 본인 정보

```sql
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);
```

### 회원 작성 권한

회원은 마을 이야기와 갤러리를 작성할 수 있습니다.

```sql
create policy "Members can create village posts"
on public.posts for insert
with check (
  auth.uid() is not null
  and board_type = 'village'
  and author_id = auth.uid()
);

create policy "Members can create galleries"
on public.galleries for insert
with check (
  auth.uid() is not null
  and author_id = auth.uid()
);
```

### 신청과 문의 접수

비회원도 신청할 수 있으므로 insert는 열어두되, 실제 운영에서는 서버 검증을 함께 두는 것이 안전합니다.

```sql
create policy "Anyone can create space reservations"
on public.space_reservations for insert
with check (true);

create policy "Anyone can create program applications"
on public.program_applications for insert
with check (true);

create policy "Anyone can create inquiries"
on public.inquiries for insert
with check (true);
```

### 본인 신청 조회

회원은 자신의 예약, 신청, 문의를 확인할 수 있습니다.

```sql
create policy "Members can read own reservations"
on public.space_reservations for select
using (user_id = auth.uid());

create policy "Members can read own program applications"
on public.program_applications for select
using (user_id = auth.uid());

create policy "Members can read own inquiries"
on public.inquiries for select
using (user_id = auth.uid());
```

비회원 조회는 이름, 연락처, 비밀번호 확인이 필요하므로 프론트에서 직접 select를 열기보다 서버 API 또는 Supabase Edge Function을 통해 처리하는 것을 권장합니다.

## 15. Storage 버킷 설계

```sql
insert into storage.buckets (id, name, public)
values
  ('space-images', 'space-images', true),
  ('program-images', 'program-images', true),
  ('post-attachments', 'post-attachments', true),
  ('gallery-images', 'gallery-images', true)
on conflict (id) do nothing;
```

### 버킷별 권장 기준

| 버킷 | 공개 여부 | 설명 |
| --- | --- | --- |
| space-images | 공개 | 공간 사진 |
| program-images | 공개 | 프로그램 대표 이미지 |
| gallery-images | 공개 | 갤러리 사진 |
| post-attachments | 공개 | 공지사항, 마을 이야기 첨부파일 |

## 16. 실제 적용 전 확인할 점

SQL을 Supabase에 실행하기 전에 확인해야 했던 항목은 아래 기준으로 정리합니다.

| 확인 항목 | 결정 내용 |
| --- | --- |
| 관리자 계정 | `ddbbkk@gmail.com`, `kkumcenter@gmail.com` |
| 연락처 중복 | 허용. 아동의 부모 연락처로 여러 계정이 가입할 수 있음 |
| 비회원 조회 비밀번호 | 프론트 화면에서 원문 그대로 저장하지 않고 Supabase 함수 또는 Edge Function에서 암호화하여 저장 |
| 공간예약 중복 시간 | 중복 시간대도 일단 모두 접수. 관리자가 같은 공간, 같은 날짜, 겹치는 시간대를 확인하고 승인 여부를 결정 |
| 프로그램 정원 초과와 대기자 처리 | Supabase 함수 또는 Edge Function에서 정원 계산과 대기 순번 부여를 한 번에 처리 |
| 첨부파일 다운로드 | 공개 다운로드 |

### 비회원 조회 비밀번호 처리 기준

비회원이 공간예약, 교육신청, 문의/제안을 조회할 때 사용하는 비밀번호는 DB에 원문으로 저장하지 않습니다.

권장 방식은 다음과 같습니다.

1. 이용자가 화면에서 비밀번호를 입력한다.
2. Supabase 함수 또는 Edge Function이 비밀번호를 암호화한다.
3. DB에는 암호화된 값만 저장한다.
4. 나중에 조회할 때도 입력한 비밀번호를 같은 방식으로 확인한다.

즉, 운영자와 개발자도 비회원 비밀번호 원문을 볼 수 없도록 설계하는 것이 안전합니다.

### 공간예약 중복 시간 처리 기준

공간예약은 관리자 승인제이므로 DB에서 중복 예약을 바로 차단하지 않습니다.

권장 흐름은 다음과 같습니다.

1. 같은 공간, 같은 날짜, 겹치는 시간대 신청도 모두 `received` 상태로 접수한다.
2. 관리자 화면에서 중복 가능성이 있는 예약을 표시한다.
3. 관리자가 신청 내용을 보고 하나를 승인하거나, 필요한 경우 여러 건을 조정한다.
4. 승인된 예약은 `approved`, 승인하지 않는 예약은 `rejected` 또는 `canceled`로 처리한다.

따라서 1차 SQL에서는 같은 공간과 시간대에 대한 unique 제약을 만들지 않습니다.

### 프로그램 정원과 대기자 처리 기준

교육신청은 선착순이므로 단순히 화면에서 인원 수를 세는 방식만으로는 위험할 수 있습니다.

권장 방식은 다음과 같습니다.

1. 이용자가 신청하기를 누른다.
2. Supabase 함수 또는 Edge Function이 현재 신청 인원을 확인한다.
3. 정원 이내이면 `completed` 상태로 저장한다.
4. 정원을 초과하면 `waiting` 상태로 저장하고 `waitlist_order`를 부여한다.
5. 정원이 찬 프로그램은 화면에서 자동 마감 상태로 보여준다.

이 방식은 여러 사람이 거의 동시에 신청해도 정원과 대기 순번이 흔들리지 않게 하기 위한 기준입니다.

## 17. 다음 작업

이 SQL 설계안을 확정하면 다음 작업은 `실행용 SQL 파일` 작성입니다.

다음 산출물은 다음 중 하나로 만들 수 있습니다.

1. `supabase/schema.sql`  
   실제 Supabase SQL Editor에 순서대로 실행할 수 있는 파일

2. `supabase/seed.sql`  
   공간 6개와 예시 프로그램 같은 초기 데이터를 넣는 파일

3. `supabase/policies.sql`  
   RLS 권한 정책만 따로 모은 파일

추천 순서는 다음과 같습니다.

1. `supabase/schema.sql` 작성
2. `supabase/seed.sql` 작성
3. `supabase/policies.sql` 작성
4. Supabase 프로젝트 생성
5. SQL Editor에서 개발용 DB에 적용
6. 화면과 관리자 페이지 연결
