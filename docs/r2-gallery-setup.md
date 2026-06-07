# 꿈키움센터 공개 파일 Cloudflare R2 설정 메모

꿈키움센터 홈페이지의 공개 사진과 게시글 첨부파일은 Supabase Storage가 아니라 Cloudflare R2에 저장합니다.
Supabase에는 파일 자체가 아니라 공개 URL, R2 파일 경로, 제목, 설명 같은 데이터만 저장합니다.

## 운영 구조

- Supabase: DB, 로그인, 관리자 권한, 신청/예약/게시글 데이터
- Cloudflare R2: 갤러리 사진, 공지사항/마을이야기 본문 이미지, 게시글 첨부파일 저장
- YouTube: 공개 활동 영상 게시 및 재생
- Google Drive 또는 외장 저장장치: 편집 재료와 원본 사진/영상 보관

## Cloudflare R2 준비

1. 꿈키움센터 운영 Gmail로 Cloudflare 계정에 로그인합니다.
2. R2 버킷을 만듭니다.
   - 권장 버킷명: `kkumcenter-gallery`
3. 공개 이미지 주소를 설정합니다.
   - 예: `https://media.kkumcenter.kr`
   - 임시 공개 URL을 쓰는 경우에도 최종 공개 주소를 `R2_PUBLIC_BASE_URL`로 사용합니다.
4. R2 API Token 또는 Access Key를 만듭니다.
   - 권한: 해당 버킷 Object Read/Write
   - 비밀키는 홈페이지 HTML/JS 코드에 절대 넣지 않습니다.
5. R2 버킷 CORS를 설정합니다.
   - 허용 Origin: 최종 홈페이지 도메인, 로컬 테스트용 `http://127.0.0.1:8765`
   - 허용 Method: `PUT`, `GET`, `HEAD`
   - 허용 Header: `Content-Type`
   - 운영 도메인이 확정되면 로컬 테스트 주소는 제거해도 됩니다.

## Supabase Edge Function 비밀값

Supabase 프로젝트에서 아래 값을 Secret으로 등록합니다.

```bash
supabase secrets set R2_ACCOUNT_ID="Cloudflare Account ID"
supabase secrets set R2_ACCESS_KEY_ID="R2 Access Key ID"
supabase secrets set R2_SECRET_ACCESS_KEY="R2 Secret Access Key"
supabase secrets set R2_BUCKET="kkumcenter-gallery"
supabase secrets set R2_PUBLIC_BASE_URL="https://공개이미지주소"
```

비밀값 등록 후 Edge Function을 다시 배포합니다.

```bash
supabase functions deploy public-submit --no-verify-jwt
```

## DB 반영

`supabase/schema.sql`, `supabase/policies.sql` 변경분을 운영 Supabase DB에 반영해야 합니다.
이번 변경에는 갤러리 이미지와 게시글 첨부파일의 R2 경로 컬럼, `videos` 테이블이 포함되어 있습니다.

## 업로드 정책

- 원본 사진은 Google Drive에 보관합니다.
- 홈페이지에는 압축본만 올립니다.
- 브라우저에서 업로드 전 자동 변환합니다.
  - 긴 변 최대 2000px
  - JPEG 품질 0.86
  - 목표 용량: 장당 약 300KB~1.5MB
- 행사 1건당 공개 사진은 10~30장 정도를 권장합니다.

## 점검 순서

1. 관리자 로그인
2. 꿈센터 갤러리 글 작성 후 사진 5장 업로드
3. 공지사항 또는 마을이야기 글 작성 후 본문 이미지와 첨부파일 업로드
4. R2 버킷에 파일 생성 확인
5. Supabase `gallery_images`, `attachments`에 URL과 `storage_path`, `storage_bucket` 저장 확인
6. 갤러리/게시글 목록과 상세에서 파일 표시 확인
7. 글을 숨김 처리한 뒤 최고 관리자 계정으로 완전삭제
8. DB 기록과 R2 파일이 함께 삭제되는지 확인
