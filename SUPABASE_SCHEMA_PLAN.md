# 군북면 꿈키움센터 Supabase DB 구조 설계 1차안

## 1. 설계 목적

이 문서는 확정된 `관리자 페이지 기획서 1차안`을 바탕으로 Supabase에 어떤 데이터를 저장할지 정리한 1차 DB 구조 설계안입니다.

이번 단계의 목표는 화면을 바로 만들기 전에 다음 기준을 먼저 고정하는 것입니다.

- 공간예약, 교육신청, 문의/제안, 게시판, 갤러리, 회원 정보를 어떤 표에 저장할지 정한다.
- 회원과 비회원의 이용 흐름을 구분한다.
- 관리자가 매일 확인해야 하는 신규 등록 건을 안정적으로 모아 볼 수 있게 한다.
- 1차 개발에 꼭 필요한 DB와 2차 개발로 미룰 DB를 구분한다.

## 2. 전체 설계 원칙

### 1차 개발 기준

- 실제 운영에 필요한 핵심 기능부터 만든다.
- 관리자 권한은 하나로 통일한다.
- 공간예약은 관리자 승인제로 운영한다.
- 교육신청은 선착순으로 운영한다.
- 비회원도 이름과 연락처를 입력하면 예약, 신청, 문의가 가능하다.
- 비회원은 알림 기능을 제공하지 않는다.
- 회원은 추후 알림, 마이페이지, 작성 이력 확인 기능을 제공할 수 있게 설계한다.
- 문자, 카카오 알림톡, 이메일 자동 발송은 2차 개발로 둔다.

### 상태값은 코드와 화면 문구를 분리한다

DB에는 관리하기 쉬운 영문 코드로 저장하고, 홈페이지 화면에서는 한글로 보여주는 방식을 권장합니다.

예시:

| DB 저장값 | 화면 표시 |
| --- | --- |
| received | 접수 |
| approved | 승인 |
| rejected | 반려 |
| canceled | 취소 |

이렇게 하면 나중에 화면 문구를 바꿔도 DB 구조가 흔들리지 않습니다.

## 3. 주요 테이블 한눈에 보기

| 구분 | 테이블명 | 역할 |
| --- | --- | --- |
| 회원 | profiles | 회원 기본 정보와 관리자 권한 |
| 공간 | spaces | 예약 가능한 공간 정보 |
| 공간예약 | space_reservations | 공간 예약 신청 및 승인 관리 |
| 프로그램 | programs | 교육 프로그램 정보 |
| 교육신청 | program_applications | 교육 신청자 관리 |
| 문의/제안 | inquiries | 비공개 1:1 문의와 답변 |
| 공지/마을 | posts | 공지사항, 마을 이야기 게시글 |
| 갤러리 | galleries | 꿈센터 갤러리 게시글 |
| 갤러리 사진 | gallery_images | 갤러리 추가 사진 |
| 첨부파일 | attachments | 게시판 첨부파일 |
| 관리자 기록 | admin_logs | 관리자 주요 작업 기록 |

## 4. 회원 테이블

Supabase Auth가 로그인 계정을 관리하고, `profiles` 테이블은 홈페이지에서 필요한 회원 정보를 따로 저장합니다.

### profiles

회원 기본 정보와 권한을 저장합니다.

| 항목 | 설명 | 필수 여부 |
| --- | --- | --- |
| id | Supabase Auth 사용자 id | 필수 |
| role | user 또는 admin | 필수 |
| name | 이름 | 필수 |
| phone | 연락처 | 필수 |
| region | 거주 지역. 시, 군, 구까지만 입력 | 필수 |
| email | 이메일 | 선택 |
| birth_date | 생년월일 | 선택 |
| created_at | 가입일 | 자동 |
| updated_at | 수정일 | 자동 |

### 권장 규칙

- 일반 회원은 `role = user`
- 관리자 2명은 `role = admin`
- 1차 개발에서는 관리자 권한을 세부 담당별로 나누지 않는다.

## 5. 공간예약 테이블

### spaces

예약 가능한 공간 6개를 관리합니다.

| 항목 | 설명 |
| --- | --- |
| id | 공간 고유 id |
| slug | 주소용 이름. 예: kitchen, main-hall |
| floor | 층수. 예: 1층, 2층 |
| name | 공간명 |
| summary | 짧은 소개 |
| description | 상세 설명 |
| capacity | 수용 인원 |
| equipment | 구비시설 |
| image_url | 대표 이미지 주소 |
| is_active | 예약 가능 여부 |
| sort_order | 표시 순서 |
| created_at | 등록일 |
| updated_at | 수정일 |

### 기본 공간 데이터

| 층수 | 공간명 |
| --- | --- |
| 1층 | 공유주방 |
| 1층 | 대회의실 |
| 2층 | 강의실 |
| 2층 | 소회의실 |
| 2층 | 청소년활동실 |
| 2층 | 미디어스튜디오 |

### space_reservations

공간 예약 신청 정보를 저장합니다.

| 항목 | 설명 | 필수 여부 |
| --- | --- | --- |
| id | 예약 고유 id | 필수 |
| reservation_no | 예약번호 | 필수 |
| space_id | 예약 공간 | 필수 |
| user_id | 회원 id. 비회원이면 비움 | 선택 |
| applicant_type | member 또는 guest | 필수 |
| applicant_name | 신청자명 | 필수 |
| phone | 연락처 | 필수 |
| lookup_password_hash | 비회원 조회용 비밀번호 암호화값 | 비회원 필수 |
| reservation_date | 예약일 | 필수 |
| start_time | 시작 시간 | 필수 |
| end_time | 종료 시간 | 필수 |
| purpose | 이용 목적 | 필수 |
| headcount | 사용 인원 | 필수 |
| note | 기타 내용 | 선택 |
| status | received, approved, rejected, canceled | 필수 |
| admin_note | 관리자 메모 | 선택 |
| approved_by | 승인 처리 관리자 | 선택 |
| approved_at | 승인 일시 | 선택 |
| canceled_at | 취소 일시 | 선택 |
| created_at | 신청일 | 자동 |
| updated_at | 수정일 | 자동 |

### 공간예약 운영 규칙

- 이용일 기준 7일 전에 신청하는 것을 권장하지만 당일에도 가능하다.
- 같은 시간대에 중복 신청이 들어와도 자동 차단보다 관리자 검토 후 승인하는 방식으로 시작한다.
- 예약 상태값은 `received`, `approved`, `rejected`, `canceled`를 사용한다.
- 반려 사유는 1차 개발에서는 신청자에게 별도 노출하지 않는다.

## 6. 프로그램과 교육신청 테이블

### programs

교육 프로그램 정보를 저장합니다.

| 항목 | 설명 | 필수 여부 |
| --- | --- | --- |
| id | 프로그램 고유 id | 필수 |
| title | 프로그램명 | 필수 |
| summary | 짧은 소개 | 선택 |
| content | 상세 내용 | 필수 |
| image_url | 대표 이미지 | 선택 |
| place | 장소 | 필수 |
| instructor | 강사 | 선택 |
| target | 대상 | 선택 |
| capacity | 정원 | 필수 |
| start_date | 프로그램 시작일 | 필수 |
| end_date | 프로그램 종료일 | 필수 |
| apply_start_date | 신청 시작일 | 필수 |
| apply_end_date | 신청 종료일 | 필수 |
| status | scheduled, open, closed, finished | 필수 |
| created_at | 등록일 | 자동 |
| updated_at | 수정일 | 자동 |

### program_applications

교육 신청자 정보를 저장합니다.

| 항목 | 설명 | 필수 여부 |
| --- | --- | --- |
| id | 신청 고유 id | 필수 |
| application_no | 신청번호 | 필수 |
| program_id | 신청 프로그램 | 필수 |
| user_id | 회원 id. 비회원이면 비움 | 선택 |
| applicant_type | member 또는 guest | 필수 |
| applicant_name | 이름 | 필수 |
| phone | 연락처 | 필수 |
| birth_year | 출생연도 | 필수 |
| region | 지역. 시, 군, 구까지만 입력 | 필수 |
| lookup_password_hash | 비회원 조회용 비밀번호 암호화값 | 비회원 필수 |
| status | completed, waiting, approved, canceled | 필수 |
| waitlist_order | 대기 순번 | 대기자일 때 |
| created_at | 신청일 | 자동 |
| canceled_at | 취소일 | 선택 |
| updated_at | 수정일 | 자동 |

### 교육신청 운영 규칙

- 신청은 선착순으로 받는다.
- 정원이 차면 자동 마감한다.
- 정원 초과 신청자는 대기 상태로 접수한다.
- 한 사람이 같은 프로그램을 중복 신청할 수 있다.
- 신청 취소가 가능하다.
- 1차 개발에서는 출석과 수료 여부를 관리하지 않는다.

## 7. 문의/제안 테이블

### inquiries

비공개 1:1 문의와 답변을 저장합니다.

| 항목 | 설명 | 필수 여부 |
| --- | --- | --- |
| id | 문의 고유 id | 필수 |
| inquiry_no | 문의번호 | 필수 |
| user_id | 회원 id. 비회원이면 비움 | 선택 |
| writer_type | member 또는 guest | 필수 |
| writer_name | 작성자명 | 필수 |
| phone | 연락처 | 필수 |
| lookup_password_hash | 비회원 조회용 비밀번호 암호화값 | 비회원 필수 |
| title | 제목 | 필수 |
| content | 문의 내용 | 필수 |
| status | received, checking, answered | 필수 |
| answer | 관리자 답변 | 선택 |
| answered_by | 답변 관리자 | 선택 |
| answered_at | 답변일 | 선택 |
| created_at | 작성일 | 자동 |
| updated_at | 수정일 | 자동 |

### 문의/제안 운영 규칙

- 회원과 비회원 모두 작성할 수 있다.
- 문의는 공개 게시판이 아니라 비공개 1:1 문의로 운영한다.
- 답변은 관리자만 작성한다.
- 비회원은 작성자명, 연락처, 비밀번호로 답변을 조회한다.
- 회원은 로그인 후 마이페이지에서 내 문의를 확인한다.

## 8. 게시판 테이블

공지사항과 마을 이야기를 하나의 `posts` 테이블로 관리하는 방식을 권장합니다.

### posts

| 항목 | 설명 | 필수 여부 |
| --- | --- | --- |
| id | 게시글 고유 id | 필수 |
| board_type | notice 또는 village | 필수 |
| title | 제목 | 필수 |
| content | 내용 | 필수 |
| author_id | 작성 회원 또는 관리자 id | 선택 |
| author_name | 작성자명 | 필수 |
| status | public, private, draft, hidden | 필수 |
| view_count | 조회수 | 자동 |
| published_at | 공개일 | 선택 |
| created_at | 작성일 | 자동 |
| updated_at | 수정일 | 자동 |

### 게시판 운영 규칙

- 공지사항은 관리자만 작성한다.
- 마을 이야기는 회원가입 후 작성할 수 있다.
- 마을 이야기는 작성 즉시 공개한다.
- 공공 목적에 부합하지 않는 게시글은 관리자가 비공개 또는 숨김 처리할 수 있다.
- 첨부파일 기능이 필요하다.

### attachments

공지사항과 마을 이야기 첨부파일을 저장합니다.

| 항목 | 설명 |
| --- | --- |
| id | 첨부파일 id |
| target_type | post, inquiry, program 등 연결 대상 |
| target_id | 연결 대상 id |
| file_name | 원본 파일명 |
| file_url | Supabase Storage 파일 주소 |
| file_size | 파일 크기 |
| uploaded_by | 업로드한 사용자 |
| created_at | 업로드일 |

## 9. 꿈센터 갤러리 테이블

### galleries

갤러리 게시글의 기본 정보를 저장합니다.

| 항목 | 설명 | 필수 여부 |
| --- | --- | --- |
| id | 갤러리 고유 id | 필수 |
| title | 제목 | 필수 |
| event_date | 날짜 | 선택 |
| place | 장소 | 선택 |
| description | 설명 | 선택 |
| author_id | 작성 회원 또는 관리자 id | 선택 |
| author_name | 작성자명 | 필수 |
| cover_image_url | 대표사진 | 필수 |
| status | public, private, hidden | 필수 |
| created_at | 작성일 | 자동 |
| updated_at | 수정일 | 자동 |

### gallery_images

갤러리 추가 사진을 저장합니다.

| 항목 | 설명 |
| --- | --- |
| id | 이미지 id |
| gallery_id | 연결된 갤러리 id |
| image_url | 이미지 주소 |
| caption | 사진 설명 |
| sort_order | 표시 순서 |
| created_at | 등록일 |

### 갤러리 운영 규칙

- 회원가입 시 작성 가능하다.
- 여러 장의 사진을 묶어서 올릴 수 있어야 한다.
- 행사별 앨범 기능은 1차 개발에서는 만들지 않는다.
- 공개 여부 선택 기능은 1차 개발에서는 제공하지 않는다.

## 10. 관리자 기록 테이블

### admin_logs

관리자가 중요한 정보를 바꿨을 때 최소한의 기록을 남깁니다.

| 항목 | 설명 |
| --- | --- |
| id | 기록 id |
| admin_id | 작업한 관리자 |
| action_type | approve, cancel, answer, hide, update 등 |
| target_type | reservation, application, inquiry, post, gallery |
| target_id | 대상 id |
| summary | 작업 요약 |
| created_at | 작업일 |

### 1차 개발에서 기록할 작업

- 공간예약 승인, 반려, 취소
- 문의 답변 작성
- 게시글 비공개 또는 숨김 처리
- 갤러리 비공개 또는 숨김 처리

## 11. 파일 저장 구조

Supabase Storage에 다음 버킷을 두는 방식을 권장합니다.

| 버킷명 | 용도 |
| --- | --- |
| program-images | 프로그램 대표 이미지 |
| post-attachments | 공지사항, 마을 이야기 첨부파일 |
| gallery-images | 꿈센터 갤러리 사진 |
| space-images | 공간 사진 |

### 권장 규칙

- 이미지와 첨부파일은 DB에 직접 저장하지 않는다.
- DB에는 파일 주소와 기본 정보만 저장한다.
- 파일 삭제는 바로 완전 삭제하지 않고, 관리자 검토 후 처리하는 방식을 권장한다.

## 12. 관리자 대시보드 데이터

관리자 첫 화면은 별도 테이블을 만들기보다 기존 테이블을 모아서 보여주는 방식이 좋습니다.

### 표시 항목

| 항목 | 가져오는 테이블 |
| --- | --- |
| 오늘 예약 | space_reservations |
| 이번 주 예약 | space_reservations |
| 신규 공간예약 | space_reservations |
| 신규 교육신청 | program_applications |
| 미답변 문의 | inquiries |
| 최근 게시글 | posts |
| 최근 갤러리 | galleries |
| 월별 프로그램 신청자 수 | program_applications |

### 방문자 통계

방문자 통계는 1차 개발에서 Supabase DB에 직접 넣기보다 Vercel Analytics, Google Analytics 같은 별도 통계 도구 연결을 먼저 검토하는 것이 좋습니다.

방문자 통계를 DB에 직접 저장하면 개인정보와 불필요한 기록 관리 부담이 생길 수 있으므로, 1차에서는 단순 통계 도구 연결을 권장합니다.

## 13. 권한 규칙

Supabase에서는 데이터별로 누가 읽고 쓸 수 있는지를 정해야 합니다. 어려운 말로는 RLS 정책이라고 부릅니다.

초기 권장 규칙은 다음과 같습니다.

| 대상 | 일반 방문자 | 회원 | 관리자 |
| --- | --- | --- | --- |
| 공지사항 읽기 | 가능 | 가능 | 가능 |
| 공지사항 작성 | 불가 | 불가 | 가능 |
| 마을 이야기 읽기 | 가능 | 가능 | 가능 |
| 마을 이야기 작성 | 불가 | 가능 | 가능 |
| 갤러리 읽기 | 가능 | 가능 | 가능 |
| 갤러리 작성 | 불가 | 가능 | 가능 |
| 공간예약 신청 | 가능 | 가능 | 가능 |
| 공간예약 승인 | 불가 | 불가 | 가능 |
| 교육신청 | 가능 | 가능 | 가능 |
| 문의 작성 | 가능 | 가능 | 가능 |
| 문의 답변 | 불가 | 불가 | 가능 |
| 관리자 화면 | 불가 | 불가 | 가능 |

## 14. 1차 개발 우선순위

### 1순위

1. Supabase 프로젝트 생성
2. Auth 설정
3. `profiles` 테이블 생성
4. 관리자 2명 계정 지정
5. `spaces`, `space_reservations` 생성
6. 공간예약 신청과 관리자 승인 흐름 구현

### 2순위

1. `programs`, `program_applications` 생성
2. 교육신청 선착순 접수 구현
3. 정원 초과 시 대기 상태 처리
4. 신청확인 화면 연결

### 3순위

1. `inquiries` 생성
2. 문의/제안 작성, 조회, 답변 기능 구현
3. 관리자 미답변 문의 목록 구현

### 4순위

1. `posts`, `attachments` 생성
2. 공지사항 관리자 작성 기능 구현
3. 마을 이야기 회원 작성 기능 구현
4. 첨부파일 업로드 연결

### 5순위

1. `galleries`, `gallery_images` 생성
2. 갤러리 회원 작성 기능 구현
3. 여러 장 사진 업로드 연결

## 15. 2차 개발로 미룰 항목

- 문자 알림
- 카카오 알림톡
- 이메일 알림
- 회원 대상 알림함
- 출석 관리
- 수료 관리
- 담당자별 관리자 권한 분리
- 상세 방문자 통계 자체 구축
- 고급 예약 중복 차단 로직

## 16. 다음 작업

이 문서가 확정되면 다음 작업은 `Supabase SQL 설계안` 작성입니다.

다음 산출물에서는 실제로 Supabase에서 실행할 수 있는 형태에 가깝게 다음 내용을 정리합니다.

- 테이블 생성 순서
- 컬럼 타입
- 기본값
- 상태값 제한
- 테이블 간 연결 관계
- 초기 공간 데이터 6개
- 관리자 권한 설정 방식
- 파일 저장 버킷 구성

이후에는 DB를 먼저 만들고, 그 다음 관리자 화면을 연결하는 순서로 진행하는 것이 안전합니다.
