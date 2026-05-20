# 군북면 꿈키움센터 홈페이지 목업

군북면 꿈키움센터의 공공/로컬 감성 홈페이지 목업입니다. 주민 프로그램, 공간 활용, 군북면 이야기, 로컬장터를 중심으로 구성한 정적 HTML 시안입니다.

GitHub 저장소: https://github.com/kkumcenter/kkumcenter

## 현재 상태

- 실제 게시판, 신청, 쇼핑몰 결제 기능은 연결하지 않은 디자인 목업 단계입니다.
- 금산다팜 외부 쇼핑몰 연결을 포함합니다: https://dafarm.co.kr/
- 데스크탑 중심으로 설계했으며, 모바일에서도 가로 넘침이 없도록 반응형 스타일을 적용했습니다.
- CSS, JavaScript, 이미지, 로고는 `assets` 폴더에 포함되어 있으므로 HTML 파일과 함께 유지해야 합니다.

## 페이지 구성

- `index.html`: 메인
- `about.html`: 센터소개, 연혁, 이용안내, 오시는길
- `spaces.html`: 공간소개
- `news.html`: 공지사항, 센터소식, 마을이야기
- `programs.html`: 진행중 프로그램, 프로그램 신청 안내
- `local-food.html`: 지역 농산물, 계절 농산물, 외부 쇼핑몰 연결
- `sitemap.html`: 사이트맵
- `sitemap-preview.png`: 사이트맵 미리보기 이미지

## 폴더 구조

```text
.
├── index.html
├── about.html
├── programs.html
├── spaces.html
├── news.html
├── local-food.html
├── sitemap.html
├── sitemap-preview.png
└── assets
    ├── css
    │   └── styles.css
    ├── js
    │   └── main.js
    └── images
        ├── hero-center.png
        ├── program-workshop.png
        ├── community-news.png
        ├── local-produce.png
        ├── kkoom-logo-symbol.png
        └── kkoom-logo-full.png
```

## 로컬 확인

정적 HTML 목업이므로 `index.html`을 브라우저에서 직접 열어 확인할 수 있습니다. 이미지와 스타일이 정상 표시되려면 `assets` 폴더가 같은 위치에 있어야 합니다.

## GitHub Pages 배포 메모

1. 이 폴더를 Git 저장소로 초기화합니다.
2. 전체 파일을 커밋한 뒤 GitHub 원격 저장소로 푸시합니다.
3. GitHub 저장소의 `Settings > Pages`에서 배포 브랜치와 루트 폴더를 선택합니다.
4. 배포 후 생성된 Pages 주소에서 `index.html`이 첫 화면으로 표시되는지 확인합니다.

## 다음 논의 항목

- 공지사항, 센터소식, 마을이야기를 정적 페이지로 운영할지 CMS로 연결할지 결정
- 프로그램 신청을 단순 안내, 폼 제출, 관리자 화면 중 어떤 방식으로 확장할지 결정
- 로컬장터를 외부 쇼핑몰 연결 중심으로 둘지, 자체 상품 소개 페이지를 강화할지 결정
- 실제 운영 전 접근성 문구, 기관 연락처, 주소, 프로그램 일정 등 운영 정보 보강
