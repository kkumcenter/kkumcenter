# Supabase 연결 안내

이 문서는 군북면 꿈키움센터 홈페이지를 Supabase와 연결할 때 참고하는 간단 안내서입니다.

## 현재 진행 상태

현재까지 완료된 작업은 다음과 같습니다.

1. 관리자 페이지 기획서 작성
2. Supabase DB 구조 설계
3. Supabase SQL 설계안 작성
4. 실행용 SQL 파일 작성

현재 저장소에는 아래 실행용 SQL 파일이 준비되어 있습니다.

- `supabase/schema.sql`
- `supabase/seed.sql`
- `supabase/policies.sql`

## 다음 단계

다음 단계는 Supabase에서 실제 프로젝트를 만들고 SQL을 실행하는 것입니다.

Supabase 계정 로그인과 프로젝트 생성은 사용자 계정 권한이 필요하므로, 아래 작업은 사용자가 직접 진행해야 합니다.

1. Supabase에 로그인
2. 새 프로젝트 생성
3. SQL Editor 열기
4. `supabase/schema.sql` 실행
5. `supabase/seed.sql` 실행
6. `supabase/policies.sql` 실행
7. Project URL과 anon public key 확인
8. `assets/js/supabase-config.js`에 값 입력

## 실행 순서

SQL Editor에서는 반드시 아래 순서대로 실행합니다.

```text
1. supabase/schema.sql
2. supabase/seed.sql
3. supabase/policies.sql
```

## 임시 관리자 이메일

현재 임시 관리자 이메일은 아래 두 개입니다.

- `ddbbkk@gmail.com`
- `tedoorynote@naver.com`

실제 운영 전 최종 관리자 이메일이 확정되면 `supabase/seed.sql`의 이메일만 변경하면 됩니다.

## Supabase 프로젝트 정보 입력

프로젝트를 만든 뒤 Supabase Dashboard에서 다음 값을 확인합니다.

- Project URL
- anon public key

그 다음 `assets/js/supabase-config.js`를 아래처럼 채웁니다.

```js
window.KKOOM_SUPABASE = {
  url: "https://프로젝트아이디.supabase.co",
  anonKey: "supabase anon public key",
  redirectTo: "https://kkumcenter.github.io/kkumcenter/login.html"
};
```

`anonKey`는 브라우저에 공개되는 공개 키입니다.
단, service role key는 절대 홈페이지 코드에 넣으면 안 됩니다.

## 로그인 기능

현재 로그인 화면은 Supabase Auth와 연결할 수 있도록 준비되어 있습니다.

Supabase Dashboard에서 아래 설정이 필요합니다.

1. Authentication 메뉴 열기
2. Email 로그인 활성화
3. 필요한 경우 Google, Kakao OAuth 설정
4. Site URL과 Redirect URL 설정

GitHub Pages 기준 Redirect URL은 다음 주소를 사용합니다.

```text
https://kkumcenter.github.io/kkumcenter/login.html
```

Vercel로 배포할 경우에는 Vercel 주소를 Redirect URL에 추가해야 합니다.

## 비회원 비밀번호 처리

비회원 예약, 교육신청, 문의 조회에 쓰는 비밀번호는 DB에 원문으로 저장하지 않습니다.

1차 개발에서는 Supabase 함수 또는 Edge Function에서 암호화해서 저장하는 방식을 권장합니다.

## 다음 개발 작업

Supabase 프로젝트에 SQL 적용이 끝나면 다음 순서로 개발을 진행합니다.

1. 관리자 로그인 확인
2. 관리자 대시보드 연결
3. 공간예약 신청과 관리자 승인 연결
4. 교육신청 선착순 접수 연결
5. 문의/제안 작성과 답변 연결
6. 공지사항, 마을 이야기, 갤러리 관리 연결
