@AGENTS.md

# bam2_info — 프로젝트 작업 가이드

> opga(오피가이드) 계열 소스 사이트를 스크랩해 만든 **한국어 업소 정보 + 커뮤니티 사이트**.
> 익명성 최우선. 라이브: `https://bt-001.com` (Shinjiru VPS, IP 111.90.150.89).
> 상세 현황·결정 이력은 [MEMORY.md](MEMORY.md), 작업 연혁은 [docs/worklog.md](docs/worklog.md) 참조.

## 기술 스택
- **Next.js 16.2.4** (App Router, Turbopack) — ⚠️ 학습 데이터와 다름. `node_modules/next/dist/docs/` 먼저 읽을 것 (AGENTS.md)
- **React 19.2.4** / **Prisma 7.8** (`@prisma/adapter-pg`, output → `src/generated/prisma`) / **PostgreSQL 18**
- **NextAuth 5 beta** (Credentials provider, `src/auth.ts`)
- **Tailwind 4** / lucide-react / recharts
- 미들웨어는 `src/middleware.ts` (Next 16에서 "proxy"로 이름 변경 권고 경고 있음 — 아직 middleware 유지)

## 디렉터리 지도
```
src/app/            App Router 페이지 + API
  /(공개)           메인, /shop, /reviews, /coupons, /free, /jobs, /anonymous, /posts, /events 등
  /shop/(private)   업주 전용 (dashboard, coupons, post) — 라우트그룹으로 layout 격리
  /shop/(public)    업소 상세 [id]
  /admin            관리자 (analytics, shops, users, sync, rankings, coupons, claims, inquiries, ...)
  /api              REST 엔드포인트 (sync, events, rankings, upload, auth, 배지 카운트 등)
src/lib/
  actions/          서버 액션 (도메인별: shop, user, coupon, review, ranking, sync, claim, ...)
  data.ts           ★ 공개 페이지 데이터 조회 + sourceStatus 숨김 로직
  api/              events.ts / stats.ts (+ .test.ts — vitest)
  prisma.ts         Prisma 싱글턴   r2.ts  virtualUsers.ts  viewTracker.ts
src/components/      ShopCard, Header, filters/(4종), comments/, messages/, reviews/, shop/ ...
prisma/             schema.prisma + migrations/ (14개)
scraper/            ★ Node 스크래퍼 (별도 package.json) — Puppeteer 기반, 로컬 전용
scripts/            tsx 운영/검증 스크립트 (verify-*, seed-*, sync-shops-cli, ...)
deploy/             배포·운영 자동화 (아래)
```

## 데이터 파이프라인 (중요)
```
[opga039.com]  ──①스크래퍼(로컬,Puppeteer)──>  scraper/scraped_data/{shops.json, urls.json} + public/images/imgs/*.webp
                                                          │
                                                          ②서버 반영
                                                          ▼
                                    [서버 DB + 이미지]  ──>  https://bt-001.com
```
- **① 스크래핑은 로컬 터미널 전용** (Puppeteer 실브라우저 + 이미지가 로컬 디스크에 떨어짐)
- **② 서버 반영 = `deploy/scrape-and-deploy.ps1` 한 방** (이미지 rclone + 데이터 scp + 서버 내부 sync API 호출)
- `shops.json` → `syncShopsFromJsonAction` (externalId 기준 upsert) / `urls.json` → `syncListVisibilityAction` (ACTIVE/MISSING/ARCHIVED)
- 공개 노출 제어: `src/lib/data.ts`의 `HIDDEN_STATUSES = {DELETED_CONFIRMED, ARCHIVED}` → 해당 업소 자동 숨김

## 자주 쓰는 명령
```powershell
# 개발
npm run dev                         # 로컬 개발 서버
npm run build                       # 프로덕션 빌드 (puppeteer Chrome 다운로드 스킵: PUPPETEER_SKIP_DOWNLOAD=1)
npm test                            # vitest (events/stats 테스트 3개)
npx prisma migrate dev              # 마이그레이션   npx prisma generate

# 스크래핑 → 서버 반영 (일상 루틴, git 무관)
powershell -File deploy\scrape-and-deploy.ps1                 # 전체
powershell -File deploy\scrape-and-deploy.ps1 -SkipImages     # 데이터만
powershell -File deploy\scrape-and-deploy.ps1 -SkipScrape     # 이미 받은 것 반영만

# MISSING 검증 (소스에서 삭제됐는지 확인)
npx tsx scripts/verify-missing.ts --dry-run       # 비파괴 미리보기
npx tsx scripts/verify-missing.ts                 # 실제 DB 적용

# 서버 접속 (키 전용, 비밀번호 로그인 차단됨)
ssh -i ~/.ssh/bam2_deploy root@111.90.150.89
```

## 코드 작업 규칙
- 스크래퍼 소스 도메인은 **하드코딩 금지** — `.env`의 `SOURCE_BASE_URL` 사용 (차단 시 한 줄만 교체)
- 서버 DB는 **라이브** — 통째로 덮지 말 것. 변경은 externalId 기준 타겟 UPDATE로 (예: `deploy/` SQL 생성 패턴)
- 빌드 타입체크 엄격: 미사용 `@ts-expect-error`도 에러. JS 모듈 import는 `@ts-ignore` 사용
- **익명성**: 외부 CDN(BunnyCDN/Cloudflare) 거부, Shinjiru 직접 서빙. 도메인 등록은 Njalla(익명 대행)
- 커밋 메시지·코드 주석은 한국어 (기존 컨벤션)

## 환경변수
| 키 | 파일 | 용도 |
|---|---|---|
| `DATABASE_URL` | `.env` | Postgres 접속 (로컬 postgres/1234, 서버는 bam2 유저+랜덤PW) |
| `SOURCE_BASE_URL` | `.env` | 스크래퍼 소스 도메인 (기본 opga039) |
| `AUTH_SECRET` | `.env.local` | NextAuth 세션 서명 |
| `SYNC_API_KEY` | 서버 `.env`만 | sync API 인증 헤더 (`X-Sync-Key`) |
