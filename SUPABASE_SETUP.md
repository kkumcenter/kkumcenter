# Supabase Auth 연결 안내

이 홈페이지의 로그인 화면은 Supabase Auth와 연결할 수 있도록 준비되어 있습니다.

## 1. Supabase 프로젝트 정보 입력

`assets/js/supabase-config.js` 파일의 빈 값을 Supabase 프로젝트 값으로 채워주세요.

```js
window.KKOOM_SUPABASE = {
  url: "https://프로젝트아이디.supabase.co",
  anonKey: "supabase anon public key",
  redirectTo: "https://kkumcenter.github.io/kkumcenter/login.html"
};
```

`anonKey`는 공개용 키입니다. 서비스 역할 키나 비밀키는 절대 넣지 마세요.

## 2. 이메일 로그인

Supabase Dashboard에서 `Authentication > Providers > Email`을 켜면 이메일과 비밀번호로 회원가입과 로그인이 가능합니다.

## 3. 구글 / 카카오 로그인

Supabase Dashboard에서 `Authentication > Providers`로 이동해 Google과 Kakao Provider를 설정해야 합니다.

각 Provider 설정 화면의 Redirect URL 또는 Callback URL에는 Supabase가 안내하는 주소를 각 개발자 콘솔에 등록해야 합니다.

## 4. 네이버 로그인

현재 Supabase 기본 소셜 로그인 Provider에는 네이버가 포함되어 있지 않아 별도 OAuth 구성이 필요합니다. 우선 이메일, 구글, 카카오 로그인부터 연결한 뒤 추가 검토하는 것을 권장합니다.

## 5. 배포 후 확인

GitHub Pages 주소:

`https://kkumcenter.github.io/kkumcenter/login.html`

Vercel로 옮길 경우 `redirectTo` 값을 Vercel 주소로 바꿔야 합니다.
