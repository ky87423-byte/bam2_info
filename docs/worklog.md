# 작업 로그 (worklog)

> 시간순 작업 기록. 현재 상태 요약은 [MEMORY.md](../MEMORY.md), 작업 규칙은 [CLAUDE.md](../CLAUDE.md).

---

## 2026-06-05 — 프로덕션 배포 + 소스 도메인 이전 대응

### 서버 배포 (로컬 → Shinjiru VPS, IP 운영 → 도메인 연결)
1. **서버 환경 세팅** (`deploy/setup-server.sh`): Node 22 / PostgreSQL 18 / PM2 / nginx / UFW / certbot 설치, DB·유저 생성(랜덤PW), opga 차단 테스트
2. **디스크 확장**: vda3 스왑 파티션 삭제 → vda2를 49G→99G로 grow → 2G 스왑파일 대체
3. **SSH 키 전용화**: passphrase 없는 배포키 `bam2_deploy` 생성·등록, 이후 비밀번호 SSH 로그인 차단(`99-keyonly.conf`)
4. **코드/DB 배포**: `git archive` → scp → 압축해제, 새 덤프 `pg_restore` (Shop 3,837 / User 3,862)
5. **빌드 이슈 2건 해결**:
   - puppeteer Chrome 다운로드 실패 → `PUPPETEER_SKIP_DOWNLOAD=1`
   - `scripts/verify-missing.ts`: 미사용 `@ts-expect-error` → `@ts-ignore`
6. **PM2 기동 + nginx + HTTPS**: `pm2 start npm --name bam2`, nginx 리버스프록시(`/images/`는 nginx 직접 서빙), certbot으로 `bt-001.com` 인증서 발급(이메일 없이), HTTP→HTTPS 301
7. **이미지 업로드**: rclone SFTP 병렬(--transfers 8)로 50.85GB / 48,892개 전송, `rclone check --size-only` 0 differences

### 발견: SNI 차단
- 친구 접속 시 warning.or.kr(불법·유해 차단) 표시. 진단 결과 **DNS·IP는 정상, 도메인 이름 SNI 차단**
- opga가 037→039로 도메인 바꾸는 이유 = 동일한 SNI 차단 회피. **도메인 로테이션 운영 필요** (대응 보류)

### 소스 도메인 이전 (opga037 → opga039) 대응
- opga037.com → 301 → opga039.com (opga039는 Cloudflare 뒤, curl 403이나 Puppeteer 통과)
- **`scraper/scraper.js` 도메인 하드코딩 5곳 제거** → `.env`의 `SOURCE_BASE_URL` 환경변수화(기본 opga039), 이미지 필터 정규식 `opga\d*`로 일반화
- 커밋 `a213740`

### MISSING 189건 재검증
- **휴리스틱 버그 발견·수정**: "로그인이 필요" 다이얼로그를 무조건 세션만료→중단으로 처리하던 것. 실제로는 로그인 유지 중에도 뜸(=글 삭제). 페이지의 로그아웃 링크로 실제 세션 판별하도록 수정 → 23건 중단되던 게 189건 전수 처리
- 진단 과정: ACTIVE 글은 정상 로드되는데 일부 글만 다이얼로그 → "우리가 로그인 안 된 게 아니라 글이 삭제됨" 확정
- **dry-run으로 먼저 검토** 후 실제 적용: **DELETED 140 / ACTIVE 복구 49 / 에러 0**
- 서버 DB 동기화: 라이브 데이터 보존 위해 통째 덮지 않고 externalId 기준 `sourceStatus` 타겟 UPDATE 3,835건 (enum 캐스트 `::"SourceStatus"` 필요)
- 최종 분포: ACTIVE 3,581 / DELETED 256 / MISSING 0

### 운영 자동화 구축
- **`deploy/scrape-and-deploy.ps1`**: 스크래핑→이미지 rclone→데이터 scp→서버 내부 sync API 호출(SSH localhost, SNI 무관) 원커맨드
- **`/api/admin/sync/visibility`** 엔드포인트 신설 (기존 `/api/admin/sync`와 동일 인증, 가시성 동기화용)
- 서버 `.env`에 `SYNC_API_KEY` 추가
- `scraper/scraped_data/`, `_quarantine_*/` git 추적 해제 (스크래핑이 git과 분리되도록)
- 커밋 `c7b1c89`, push 완료

### 워크플로 정리 (사용자 질문 답)
- **일상 스크래핑 = `scrape-and-deploy.ps1` 한 방, git push 불필요**
- **git push = 코드(scraper.js 등) 고쳤을 때만**

### sync API 인증 버그 수정 + 파이프라인 실전 검증
- `/api/admin/sync*` 라우트는 X-Sync-Key 통과시키나 액션 내부가 admin 세션만 체크 → cron/스크립트 호출 차단되던 버그. 액션 인가를 "admin 세션 OR X-Sync-Key 헤더"로 수정(`isAuthorizedForSync`). 커밋 `0b477c0`
- `scrape-and-deploy.ps1` UTF-8 BOM 추가(PS5.1 한글 파싱), 실전 검증 완료(scp+sync 양쪽 ok:true). 커밋 `a774e87`

### 목록 정렬: 유료광고 + 무작위 (사용자 요청)
- 문제: `data.ts`가 hit 내림차순 고정 정렬, 유료광고 개념 없음
- 구현: override에 `isAd` 추가, `getShops(seed)` — 광고 상단 고정 + 나머지 seed 무작위, 메인 새로고침마다 새 seed, Pagination이 seed 보존. 어드민 편집에 광고 체크박스. 커밋 `52387c4`
- 서버 배포+검증 완료: 새로고침마다 순서 변경 / 같은 seed=같은 순서 확인

### 관리자 비번 리셋
- admin 계정 비번 분실 → bcrypt 해시라 복원 불가 → `bam2admin!2026`으로 리셋(로컬+서버). dev 퀵로그인은 개발모드 전용이라 프로덕션 불가

---

## 이전 개발 연혁 (git 히스토리 요약, ~2026-05)

| 커밋 | 내용 |
|---|---|
| `0c1f075` | 이미지 일괄 WebP 변환 + 어드민 소스 상태 관리 페이지 |
| `03fd3e8` | 소스 사이트 가시성 추적(`Shop.sourceStatus`) + MISSING 검증 + 마이그레이션 |
| `3af3f9d` | 런치 준비: 커뮤니티 통합 / 라이트 톤 / 핀 공지 + 관리자 권한 가드 |
| `0ab2e52` | 프리미엄 인증 후기 시스템 + 헤더 개편 + 7일 발급 가드 |
| `8d23ea3` | 쿠폰: 풀 게시판 + 직접 수령(3종 타입/예약코드/사용확인/필터/댓글) |
| `8fd7783` | 랭킹 보상(자동 칭호/보너스/DM/경품 발송) |
| `26665c3` | 포인트 랭킹(TOP 100 + 1h 캐시 + 위젯) |
| `28912b7` | 통합 조회수 + 스크래퍼 hit 보존 |
| `0fe5ad3` | 익명 게시판 + 댓글 IP dedup |
| `85c22df` | 모바일 헤더 햄버거 + admin 사이드바 drawer |
| `4658f3a` | P0/P1 성능·보안(shops.json 캐시, count 쿼리, 가드) |
| `2a5dbb6` | shop 라우트그룹 (public)/(private) 분리 |
| `ff94c53` | 라이브 배지(focus refetch + cross-tab BroadcastChannel) |
| `bd32d08` | 지역 계층 필터(광역→세부) + 4 레이아웃 |
| `355b84a` | 스크래퍼 통합(bam_info → bam2_info/scraper/) |
| `e1394fd` | `Shop.bizType` 도입(실제 업종 vs 지역 코드 분리) |
| `3f2fa06` | 메인 필터 4종 스위처 |
| `19a253f` | 메인 레이아웃 스위처(그리드/리스트/게시판) |
| `32ebe59` | 스크래핑 동기화 시스템 + 관리자 수동 동기화 |
| `d5aba23` | 업소 전용 비밀 게시판 + admin 마스터 스위치 |
| `bc4d1d3` | Phase 1+2: 가상 user, 클레임, 인콰이어리, 미들웨어 |
| `0c68275` | 댓글·쪽지 + JSON→Postgres User/PointLog 이관 |
| `e86651d` | 관리자 분석 대시보드 + 업소회원 페이지 + role 네비 |
| `a3e0f0b` | Initial commit (Create Next App) |

### DB 마이그레이션 (14개)
init → message → virtual_user/isScraped → inquiry/claim/owner → shop_community → external_id/lastScraped → main_layout → filter_layout → biztype → message_admin_ack → ranking_excluded → ranking_rewards → ranking_custom_period → **source_status_tracking**(최신)
