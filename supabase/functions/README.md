# Supabase Edge Functions

비회원 공간예약, 교육신청, 문의/제안처럼 비밀번호 확인이 필요한 요청은 브라우저에서 DB에 직접 쓰지 않고 Edge Function에서 처리합니다.

## 포함 함수

- `public-submit`

처리하는 요청은 아래와 같습니다.

- `space-reservation`: 공간예약 접수. 이름, 연락처, 출생연도, 주소, 조회 비밀번호를 함께 저장합니다.
- `space-lookup`: 예약번호, 이름, 연락처, 비밀번호가 일치할 때 본인 예약 내역을 반환합니다.
- `program-application`: 교육신청 접수. 정원 초과 시 대기 상태로 저장합니다.
- `program-list`: 공개 교육 목록을 반환합니다.
- `program-lookup`: 신청번호, 이름, 연락처, 비밀번호가 일치할 때 본인 신청 내역을 반환합니다.
- `program-save`: 관리자 전용 교육 등록·수정 요청입니다. 모집상태, 노출상태, 운영상태, 취소사유를 함께 저장합니다.
- `program-hide`: 이전 숨김 호출과의 호환용입니다. 교육을 `비공개` 노출상태로 전환합니다.
- `program-restore`: 이전 복구 호출과의 호환용입니다. 교육을 `공개 + 정상` 상태로 전환합니다.
- `program-applicants`: 관리자 전용 프로그램별 신청자 목록 조회입니다.
- `inquiry`: 문의/제안 접수. 이름, 연락처, 출생연도, 주소, 조회 비밀번호를 함께 저장합니다.
- `inquiry-list`: 공개 문의 목록을 문의번호, 마스킹된 제목, 마스킹된 작성자, 작성일, 처리상태로 반환합니다.
- `inquiry-open`: 문의번호와 비밀번호가 일치할 때 문의 상세와 답변을 반환합니다.
- `inquiry-lookup`: 이전 조회 방식과의 호환용입니다.
- `staff-list`: 관리자·스텝 DB 목록을 반환합니다.
- `staff-save`: 이름, 표시명, 생년월일, 성별, 이메일, 권한을 저장하고 로그인 권한을 동기화합니다.
- `staff-role-update`: 관리자·스텝 권한을 변경합니다.
- `staff-deactivate`: 관리자·스텝을 제외하고 로그인을 차단합니다.
- `staff-reactivate`: 제외된 관리자·스텝을 복구합니다.
- `admin-register`: 이전 등록 방식과의 호환용입니다.

## 필요한 환경변수

Supabase 프로젝트에서 아래 값을 설정합니다.

```text
SUPABASE_URL=Supabase 프로젝트 URL
SUPABASE_SERVICE_ROLE_KEY=service_role key
LOOKUP_HASH_SECRET=비회원 조회 비밀번호 해시용 임의 문자열
ADMIN_LOGIN_REDIRECT=https://도메인/login.html
```

`SUPABASE_SERVICE_ROLE_KEY`는 홈페이지 코드에 넣지 않습니다. Edge Function 환경변수로만 보관합니다.

## 운영 보안 기준

- 조회용 비밀번호는 숫자 4자리도 사용할 수 있습니다. 다만 원문 비밀번호는 DB에 저장하지 않고 `LOOKUP_HASH_SECRET`과 함께 해시 처리한 값만 저장합니다.
- `LOOKUP_HASH_SECRET`은 운영 환경에 반드시 설정해야 합니다. 설정하지 않으면 `public-submit` 함수가 조회용 비밀번호를 처리하지 않도록 되어 있습니다.
- `public-submit`은 `service_role` 권한으로 DB를 처리하므로 RLS보다 강한 권한을 가집니다. 그래서 방문자에게 돌려주는 응답은 본인 확인에 필요한 최소 정보만 포함해야 합니다.
- 주소는 시·군·구 단위만 수집합니다. 현재 운영 판단상 연령대, 프로그램, 기간, 지역을 조합해도 특정 개인으로 좁혀지는 경우가 없으므로 5명 미만 통계 묶기 기준은 적용하지 않습니다.

## 배포 순서

```powershell
supabase login
supabase link --project-ref 프로젝트아이디
supabase secrets set LOOKUP_HASH_SECRET="충분히 긴 임의 문자열"
supabase secrets set ADMIN_LOGIN_REDIRECT="https://도메인/login.html"
supabase functions deploy public-submit --no-verify-jwt
```
