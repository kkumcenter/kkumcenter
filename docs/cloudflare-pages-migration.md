# Cloudflare Pages 배포 전환 메모

꿈키움센터 홈페이지는 정적 HTML/CSS/JS 사이트이므로 Cloudflare Pages에서 빌드 없이 배포할 수 있습니다.

## 최종 운영 구조

- Cloudflare Pages: 홈페이지 배포
- Cloudflare DNS: 도메인과 `www`, `media` 주소 연결
- Cloudflare R2: 공개 사진과 첨부파일 저장
- Supabase: 로그인, DB, 신청/예약/문의/게시글 데이터, Edge Function
- YouTube: 공개 영상
- Google Drive 또는 외장 저장장치: 원본 사진/영상 보관
- GitHub: 코드 보관

## Pages 연결 순서

1. Cloudflare Dashboard에 꿈키움센터 운영 계정으로 로그인합니다.
2. `Workers & Pages` 또는 `Pages` 메뉴로 이동합니다.
3. `Create application` 또는 `Create a project`를 선택합니다.
4. GitHub 저장소 `kkumcenter/kkumcenter`를 연결합니다.
   - GitHub 권한은 `Only select repositories`로 두고 `kkumcenter/kkumcenter`만 선택합니다.
5. 배포 설정은 아래처럼 둡니다.
   - Framework preset: `None`
   - Build command: 비워둠
   - Build output directory: `/` 또는 비워둠
   - Root directory: `/`
6. 첫 배포가 끝나면 Cloudflare Pages 임시 주소로 주요 페이지를 확인합니다.

## 도메인 연결

최종 도메인이 `kkumcenter.com`이라고 가정하면 아래 주소를 연결합니다.

- `kkumcenter.com` -> Cloudflare Pages
- `www.kkumcenter.com` -> Cloudflare Pages
- `media.kkumcenter.com` -> Cloudflare R2 공개 파일 주소

## Supabase에서 같이 바꿔야 할 값

Cloudflare Pages 도메인 연결 후 Supabase에서 아래 값을 확인합니다.

1. Supabase Dashboard -> Authentication -> URL Configuration
   - Site URL: `https://kkumcenter.com`
   - Redirect URLs:
     - `https://kkumcenter.com/login.html`
     - `https://www.kkumcenter.com/login.html`
     - Cloudflare Pages 임시 주소의 `/login.html`은 테스트 중에만 추가합니다.
2. Edge Function Secret
   - `ADMIN_LOGIN_REDIRECT=https://kkumcenter.com/login.html`
   - R2 관련 Secret은 `docs/r2-gallery-setup.md`를 따릅니다.

## 전환 후 점검

1. 메인, 센터소개, 교육신청, 공간예약, 소식마당 페이지가 열리는지 확인합니다.
2. 관리자 로그인 후 `/admin.html` 접근을 확인합니다.
3. 공지사항/마을이야기 본문 이미지 업로드가 R2로 저장되는지 확인합니다.
4. 꿈센터 갤러리 사진 업로드가 R2로 저장되는지 확인합니다.
5. 영상자료에서 유튜브 링크 등록과 재생을 확인합니다.
6. 숨김 처리 후 최고관리자 완전삭제 시 Supabase DB 기록과 R2 파일이 함께 삭제되는지 확인합니다.

## Vercel 정리

Cloudflare Pages 운영이 안정화되면 Vercel 프로젝트는 즉시 삭제하지 말고 며칠 보관합니다.
문제가 없다고 확인된 뒤 Vercel 배포와 도메인 연결을 정리합니다.
