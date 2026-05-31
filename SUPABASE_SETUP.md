# Supabase 운영 연결 안내

이 문서는 군북면 꿈키움센터 홈페이지와 Supabase 연결 상태를 정리한 운영 안내서입니다.

## 현재 상태

- Supabase 프로젝트가 연결되어 있습니다.
- `schema.sql`과 `policies.sql`은 원격 DB에 적용되었습니다.
- `public-submit` Edge Function이 배포되어 공간예약, 교육신청, 문의/제안 접수와 조회를 처리합니다.
- 공개 방문자용 함수이므로 `public-submit`은 JWT 검증 없이 배포합니다.
- `assets/js/supabase-config.js`에는 현재 프로젝트 URL과 공개 키가 입력되어 있습니다.

## 적용 순서

운영 DB를 새로 구성해야 할 때는 아래 순서로 적용합니다.

```powershell
supabase db query --linked --file supabase/schema.sql
supabase db query --linked --file supabase/seed.sql
supabase db query --linked --file supabase/policies.sql
supabase functions deploy public-submit --project-ref 프로젝트아이디 --no-verify-jwt
```

## Edge Function 환경변수

Supabase 프로젝트의 Edge Function Secrets에는 아래 값이 필요합니다.

```text
SUPABASE_URL=Supabase 프로젝트 URL
SUPABASE_SERVICE_ROLE_KEY=service_role key
LOOKUP_HASH_SECRET=비회원 조회 비밀번호 해시용 임의 문자열
ADMIN_LOGIN_REDIRECT=https://도메인/login.html
```

`SUPABASE_SERVICE_ROLE_KEY`는 홈페이지 코드에 넣지 않고 Edge Function 환경변수로만 보관합니다.
`LOOKUP_HASH_SECRET`은 조회용 비밀번호를 해시 처리할 때 쓰는 비밀값입니다. 운영 환경에서 이 값이 없으면 `public-submit` 함수가 조회용 비밀번호를 처리하지 않습니다.

`public-submit` 함수는 `service_role` 권한으로 DB를 처리하므로 RLS보다 강한 권한을 가집니다. 방문자에게 돌려주는 응답은 본인 확인에 필요한 최소 정보만 포함해야 합니다.

## 권한 구조

- `관리자`: 관리자페이지 접근, 공간예약 승인, 교육신청 승인, 교육 관리, 문의 답변, 관리자·스텝 설정 가능
- `스텝`: 소식마당 게시판 작성·수정·숨김 가능
- 방문자: 공개 페이지 열람, 공간예약, 교육신청, 문의/제안 작성 가능

## 비회원 조회

공간예약, 교육신청, 문의/제안은 비회원도 사용할 수 있습니다. 조회 비밀번호는 원문으로 저장하지 않고 Edge Function에서 해시 처리합니다.

조회용 비밀번호는 숫자 4자리도 사용할 수 있습니다. 사용자 편의를 위해 더 복잡한 비밀번호를 강제하지 않습니다.

주소는 시·군·구 단위만 수집합니다. 현재 운영 판단상 연령대, 프로그램, 기간, 지역을 조합해도 특정 개인으로 좁혀지는 경우가 없으므로 5명 미만 통계 묶기 기준은 적용하지 않습니다.

- 공간예약 확인: 예약번호, 이름, 연락처, 비밀번호
- 교육신청 확인: 신청번호, 이름, 연락처, 비밀번호
- 문의 상세 확인: 문의번호와 비밀번호

## 오픈 전 점검

- 실제 관리자·스텝 계정을 등록하고 로그인 확인
- 공간예약 접수 후 관리자 승인 확인
- 교육 등록, 교육신청, 승인, 현황 집계 확인
- 문의 작성, 비밀번호 조회, 관리자 답변 확인
- RLS 정책상 방문자가 개인정보 목록을 읽을 수 없는지 확인
