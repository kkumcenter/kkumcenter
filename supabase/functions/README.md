# Supabase Edge Functions

비회원 공간예약, 교육신청, 문의/제안처럼 비밀번호 확인이 필요한 요청은 브라우저에서 DB에 바로 저장하지 않고 서버 함수에서 처리합니다.

## 포함된 함수

- `public-submit`

처리하는 요청은 아래와 같습니다.

- `space-reservation`: 비회원 공간예약 접수
- `program-application`: 비회원 교육신청 접수, 정원 초과 시 대기 처리
- `inquiry`: 비회원 문의/제안 접수
- `inquiry-lookup`: 작성자명, 연락처, 비밀번호로 문의 답변 조회

## 필요한 환경변수

Supabase 프로젝트에서 아래 값을 설정합니다.

```text
SUPABASE_URL=Supabase 프로젝트 URL
SUPABASE_SERVICE_ROLE_KEY=service_role key
LOOKUP_HASH_SECRET=비회원 조회 비밀번호 암호화용 임의 문자열
```

`SUPABASE_SERVICE_ROLE_KEY`는 절대 홈페이지 코드에 넣지 않습니다. Edge Function 환경변수로만 보관합니다.

## 배포 순서

Supabase CLI를 사용하는 경우 아래 순서로 진행합니다.

```powershell
supabase login
supabase link --project-ref 프로젝트아이디
supabase secrets set LOOKUP_HASH_SECRET="충분히 긴 임의 문자열"
supabase functions deploy public-submit
```

배포 후 홈페이지는 아래 주소로 비회원 신청을 보냅니다.

```text
https://프로젝트아이디.supabase.co/functions/v1/public-submit
```

이 주소는 `assets/js/supabase-config.js`에 입력한 Supabase URL을 기준으로 자동 구성됩니다.
