# 군북면 꿈키움센터 홈페이지

군북면 꿈키움센터의 공식 홈페이지 작업본입니다. 센터소개, 공간시설, 교육신청, 소식마당, 문의/제안, 관리자 운영 화면을 포함합니다.

GitHub 저장소: https://github.com/kkumcenter/kkumcenter
배포: Cloudflare Pages 연결 예정

## 현재 구성

- 메인 화면, 센터소개, 비전, 연혁, 시설소개, 오시는길 페이지를 제공합니다.
- 공간예약, 교육신청, 문의/제안은 Supabase Edge Function을 통해 접수·조회합니다.
- 공지사항, 마을 이야기, 갤러리, 영상자료는 관리자 또는 스텝 로그인 후 등록·수정·숨김 처리할 수 있습니다.
- 공개 사진과 첨부파일은 Cloudflare R2에 저장하고, Supabase에는 URL과 파일 경로만 저장합니다.
- 공개 영상은 YouTube에 올리고, 홈페이지에는 유튜브 링크와 임베드만 표시합니다.
- 관리자페이지에서는 공간예약 승인, 교육신청 승인, 교육 현황, 교육 관리, 관리자·스텝 설정을 처리합니다.
- 금산다팜 몰은 `https://dafarm.co.kr/`로 바로 연결합니다.

## 운영 역할

- GitHub: 코드 보관과 변경 이력
- Cloudflare Pages: 홈페이지 배포
- Cloudflare DNS: 도메인 연결
- Cloudflare R2: 공개 사진과 첨부파일 저장
- Supabase: 관리자 로그인, DB, 신청/예약/문의/게시글 데이터, Edge Function
- YouTube: 공개 활동 영상
- Google Drive 또는 외장 저장장치: 원본 사진/영상과 편집 재료 보관

## 사이트맵

- 센터소개: 인사말, 비전, 연혁, 시설소개, 오시는길
- 공간시설: 공간예약, 예약확인
- 프로그램: 교육신청, 신청확인
- 소식마당: 공지사항, 꿈센터 갤러리, 영상자료, 마을 이야기, 문의 / 제안
- 관리자: 관리자 로그인, 관리자페이지
- 금산다팜 몰: 외부 쇼핑몰 바로 연결

## 주요 파일

- `index.html`: 메인 화면
- `admin.html`: 관리자페이지
- `login.html`: 관리자 로그인
- `programs.html`, `program-apply.html`, `program-check.html`: 교육 목록, 신청, 신청확인
- `space-apply.html`, `space-reservations.html`: 공간예약, 예약확인
- `news.html`, `gallery.html`, `videos.html`, `village-story.html`, `contact.html`: 소식마당 하위 페이지
- `board-write.html`: 게시글 작성 화면
- `assets/css/styles.css`: 전체 스타일
- `assets/js/*.js`: 화면 동작과 Supabase 연동
- `supabase/schema.sql`, `supabase/policies.sql`, `supabase/functions/public-submit/index.ts`: DB와 서버 함수

## 로컬 확인

작업 폴더에서 정적 서버를 실행한 뒤 `http://127.0.0.1:8000/index.html`로 확인합니다.

## 개시 전 확인 필요

- 대표 전화번호와 공식 연락처를 확정해 푸터와 오시는길에 반영합니다.
- 개인정보 수집·이용 문구를 센터 운영 방침에 맞게 최종 검토합니다.
- 실제 관리자와 스텝 계정으로 로그인, 승인, 게시글 등록, 문의 답변을 한 번씩 점검합니다.
- 실제 사진과 확정된 교육 정보를 관리자페이지에서 등록합니다.
