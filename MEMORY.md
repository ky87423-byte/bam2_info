# MEMORY — bam2_info 프로젝트 상태 메모리

> 최종 갱신: **2026-06-05**. 코드/git에서 안 드러나는 **현재 상태·결정·함정**을 기록.
> 작업 규칙 → [CLAUDE.md](CLAUDE.md) · 작업 연혁 → [docs/worklog.md](docs/worklog.md)

---

## 1. 프로젝트 목적

opga(오피가이드 계열) 소스 사이트를 스크랩해 만든 **한국어 업소 정보 + 커뮤니티 사이트**.

- **핵심 가치**: 익명성 최우선 (운영자·이용자·인프라 모두)
- **타깃**: 한국 사용자
- **수익/운영 모델**: 스크랩한 업소 정보를 디렉터리로 제공 + 업주가 자기 업소를 "클레임"해 직접 운영(쿠폰/후기/게시판) + 포인트·랭킹으로 커뮤니티 활성화
- **데이터 출처**: opga 소스 사이트를 스크랩 → 가상 업주 계정 자동 생성 → 실제 업주가 클레임하면 소유권 이전
- **라이브**: https://bt-001.com (Njalla 익명 도메인) → Shinjiru VPS 111.90.150.89

---

## 2. 현재 완료된 기능

### 공개 사이트
- **메인/디렉터리**: 레이아웃 3종 스위처(그리드/리스트카드/게시판) + 필터 4종(2단탭/드롭다운/사이드바/탭스위치), 지역 계층(광역→세부) + 업종(bizType) 필터
- **업소 상세** (`/shop/[id]`): 사진·연락처·영업정보, 조회수 추적, 가상업주에게 문의(인콰이어리)
- **커뮤니티 게시판**: 자유게시판(`/free`), 익명게시판(`/anonymous`, 댓글 IP dedup), 구인(`/jobs`), 일반글(`/posts`), 후기(`/reviews`, 프리미엄 인증 후기), 쿠폰(`/coupons`)
- **이벤트/출석**: 출석체크(`/attend`, 연속출석 스트릭), 이벤트(`/events`)
- **댓글 시스템**: polymorphic(targetType+targetId), 대댓글, soft delete, 럭키 당첨
- **쪽지**: 1:1 메시지, 안 읽음 배지(라이브, cross-tab BroadcastChannel)
- **포인트·랭킹**: 포인트 적립(가입/로그인/출석/글/댓글/럭키), TOP 100 랭킹(1h 캐시) + 위젯

### 업주 전용 (`/shop/(private)`)
- 대시보드, 쿠폰 발행/관리(3종 타입·예약코드·사용확인), 업소 게시글 작성
- 소유권: 클레임 신청 → admin 승인 → `Shop.ownerId` 설정

### 관리자 (`/admin`)
- **분석 대시보드**(`/analytics`): 이벤트/통계(recharts)
- **업소 관리**(`/shops`, `/shops/source-status`): 소스 가시성 상태 관리
- **동기화**(`/sync`): shops.json upsert + 가시성 동기화 버튼
- 회원/포인트/랭킹·보상/쿠폰/클레임/인콰이어리/쪽지/게시판/카테고리/설정 관리
- 배지: 미확인 쪽지·신규 인콰이어리·대기 클레임·승인대기 게시글 카운트

### 데이터 인프라
- **스크래퍼**(`scraper/scraper.js`): Puppeteer 기반, 로그인→목록→상세 스크랩, 이미지 다운로드 직후 WebP 변환
- **가상 유저 시스템**: 스크랩 업소마다 lazy 1:1 가상계정(로그인 불가)
- **소스 가시성 추적**: ACTIVE/MISSING/DELETED_CONFIRMED/ARCHIVED 상태머신 + 자동 숨김
- **MISSING 검증**(`scripts/verify-missing.ts`): 소스에서 실제 삭제됐는지 Puppeteer로 확인
- **WebP 일괄 변환** + 경로 치환 완료(48,892개)

---

## 3. 사용중인 API

### REST 엔드포인트 (`src/app/api`)
| 엔드포인트 | 메서드 | 용도 |
|---|---|---|
| `/api/auth/[...nextauth]` | — | NextAuth 5 (Credentials provider) |
| `/api/events` | POST | 조회수/이벤트 기록 (VIEW/CALL/MAP/RESERVATION) |
| `/api/upload` | POST | 이미지 업로드 |
| `/api/me/points` | GET | 본인 포인트 조회 |
| `/api/messages/unread-count` | GET | 안 읽은 쪽지 카운트 (헤더 배지) |
| `/api/rankings/top` | GET | 랭킹 TOP 조회 |
| `/api/users/[id]/profile` | GET | 유저 프로필 |
| `/api/shops/[id]/virtual-user` | POST | 가상 유저 lazy 생성/조회 |
| `/api/admin/sync` | POST | **shops.json → DB upsert** (X-Sync-Key 또는 admin 세션) |
| `/api/admin/sync/visibility` | POST | **urls.json ↔ DB 가시성 동기화** (신규, 2026-06-05) |
| `/api/admin/analytics` | GET | 분석 데이터 |
| `/api/admin/rankings` | GET | 랭킹 정산 데이터 |
| `/api/admin/*-count`, `*-pending` | GET | 배지 카운트(claims/inquiries/messages/pending/shop-posts) |

### 서버 액션 (`src/lib/actions/`, 도메인별)
auth(6) · coupon(11) · message(7) · review(6) · boardPost(5) · shop-post(5) · notice(4) · claim(3) · comment(3) · ranking·rankingReward · sync(3) · source-status(3) · siteConfig(3) · shop·user·inquiry·settings 등 — 총 ~20개 파일

### 외부 의존
- **소스 사이트**: `SOURCE_BASE_URL`(opga039.com) — Puppeteer로 스크랩, Cloudflare 뒤
- **인증**: NextAuth Credentials (자체 DB, 외부 OAuth 없음 — 익명성)
- **스토리지**: 로컬/서버 파일시스템 직접 (R2 코드는 있으나 미사용 — 익명성 위해 외부 CDN 거부)

---

## 4. DB 상태

**PostgreSQL 18** · Prisma 7.8 (`@prisma/adapter-pg`, 클라이언트 → `src/generated/prisma`)

### 모델 (14개)
`Shop` · `User` · `PointLog` · `AnalyticsEvent` · `SearchLog` · `Comment` · `Message` · `AdminInquiry` · `ClaimRequest` · `SiteConfig`(singleton id=1) · `BoardPost` · `RankingReward`

### 주요 enum
- `SourceStatus`: ACTIVE / MISSING / DELETED_CONFIRMED / ARCHIVED
- `UserRole`: USER / SHOP / ADMIN · `ClaimStatus` · `InquiryStatus` · `MainLayout` · `FilterLayout` · `RankingPeriodType` · `RankingMode` · `PointAction` · `EventType`

### 데이터 현황 (2026-06-05 MISSING 재검증 적용 후, 로컬=서버 동기화됨)
| 항목 | 값 |
|---|---|
| Shop sourceStatus | **ACTIVE 3,581 / DELETED_CONFIRMED 256 / MISSING 0** |
| Shop 총계(스크랩) | 3,835 (externalId 보유) |
| User | 약 3,862 (가상 유저 포함, 스크랩 업소당 1:1) |
| 직전 재검증 | MISSING 189 → DELETED 140 / ACTIVE 복구 49 / 에러 0 |

### 마이그레이션 (14개, 최신 = `20260515123217_add_source_status_tracking`)
init → message → virtual_user/isScraped → inquiry/claim/owner → shop_community → external_id → main_layout → filter_layout → biztype → message_admin_ack → ranking_excluded → ranking_rewards → ranking_custom_period → source_status_tracking

### 접속 정보
- 로컬: `postgres/1234 @ localhost:5432/bam2_info`
- 서버: `bam2` 유저 + 랜덤PW(`/root/.bam2_db_password`), 백업 덤프 `backups/bam2_info_20260605_083425.dump`(WebP 경로 반영본 — 5/15 구덤프는 사용 금지)

---

## 5. 배포 상태

**✅ 프로덕션 라이브** — https://bt-001.com

| 항목 | 상태 |
|---|---|
| 서버 | Shinjiru KVM Malaysia VPS / Ubuntu 24.04 / RAM 8GB / 디스크 99GB(59G 사용) |
| 런타임 | Node 22.22 · PostgreSQL 18.4 · PM2(`bam2`, 부팅 자동시작) · nginx |
| HTTPS | Let's Encrypt 발급 완료(이메일 없이), HTTP→HTTPS 301, 자동갱신 |
| SSH | 키 전용(`~/.ssh/bam2_deploy`, passphrase 없음), 비밀번호 로그인 차단 |
| 이미지 | 48,892개 WebP / 50.85GB, 로컬=서버 일치(rclone check 0 diff), nginx 직접 서빙 |
| 코드 동기화 | git `c7b1c89`까지 push 완료. 서버는 git archive로 배포 |
| 🟡 가시성 엔드포인트 | `/api/admin/sync/visibility` 서버 재빌드 중(2026-06-05) — **배포 검증 미완** |

### 배포 도구 (`deploy/`)
- `setup-server.sh` — 서버 초기 세팅(멱등)
- `nginx-bam2.conf` — nginx 설정(`/images/` 직접 서빙)
- `DEPLOY.md` — 단계별 배포 가이드
- `scrape-and-deploy.ps1` — **일상 운영 원커맨드**(스크랩→이미지→데이터→서버sync)

---

## 6. 해결 안된 문제

1. **🔴 SNI 차단 (가장 중요)**: `bt-001.com`이 한국 통신사 SNI 검사로 차단됨(warning.or.kr "불법·유해"). DNS·IP는 깨끗. 보안DNS(DoH)/VPN 사용자만 접속 가능. 일반 통신사 사용자는 차단됨.
   - 원인: 도메인 이름 기반 차단. opga가 037→039로 도메인 바꾸는 것과 동일 이유.
   - **대응 방향(보류)**: 도메인 로테이션 운영 체계 + 보안DNS 설정 안내 페이지
2. **🟡 가시성 sync 엔드포인트 배포 미검증**: `/api/admin/sync/visibility` 서버 재빌드 후 실제 호출 테스트 필요
3. **🟡 scrape-and-deploy.ps1 실전 미검증**: 엔드투엔드 1회 실행 확인 필요
4. **opga039 Cloudflare**: 일반 curl은 403. Puppeteer는 통과하므로 스크래퍼는 OK지만 curl 기반 진단/모니터링 불가
5. **R2/외부 스토리지 미사용**: 코드는 있으나 익명성 위해 비활성 (현재 파일시스템 직접 서빙)

---

## 7. 다음 작업 순서

1. **[즉시] 서버 빌드 완료 확인** → `/api/admin/sync/visibility` 호출 테스트(SSH localhost + X-Sync-Key)
2. **[즉시] `scrape-and-deploy.ps1` 실전 1회 검증** (가급 `-SkipScrape -SkipImages`로 sync만 먼저)
3. **[단기] 문서 3종 커밋** (CLAUDE.md / MEMORY.md / docs/worklog.md)
4. **[중기] SNI 차단 대응 결정**:
   - 보안DNS 안내 페이지 제작
   - 도메인 로테이션 운영 체계(차단 감지 → 새 도메인 발급 → DNS 전환 → 안내)
5. **[중기] 일일 자동 스크래핑**: Windows 작업 스케줄러에 `scrape-and-deploy.ps1` 등록(PC 상시 가동 전제)
6. **[운영] 정기 점검**: 소스 도메인 변경 모니터링(opga039→다음), DB 백업 주기화, certbot 갱신 확인

---

## 부록: 빠른 참조 파일
- 공개 숨김 로직 → `src/lib/data.ts` (`HIDDEN_STATUSES = {DELETED_CONFIRMED, ARCHIVED}`)
- 스크래퍼 → `scraper/scraper.js` (도메인 = `SOURCE_BASE_URL`)
- MISSING 검증 → `scripts/verify-missing.ts`
- 서버 반영 → `deploy/scrape-and-deploy.ps1`
- 스키마 → `prisma/schema.prisma`
- 인증 → `src/auth.ts` (NextAuth Credentials)
