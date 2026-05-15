import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { getViewCounts } from "./viewTracker";
import { UserRole, UserStatus, PointAction as DbPointAction } from "@/generated/prisma/enums";

const SHOPS_PATH       = path.join(process.cwd(), "scraper", "scraped_data", "shops.json");
const OVERRIDE_PATH    = path.join(process.cwd(), "data", "shop_overrides.json");
const SHOP_STATUS_PATH = path.join(process.cwd(), "data", "shop_status.json");
// 공개 페이지에서 숨길 sourceStatus 값
const HIDDEN_STATUSES = new Set(["DELETED_CONFIRMED", "ARCHIVED"]);
// USERS_PATH, POINT_LOGS_PATH 제거 — User/PointLog는 Prisma DB로 이관됨
const SETTINGS_PATH    = path.join(process.cwd(), "data", "settings.json");
const COUPONS_PATH     = path.join(process.cwd(), "data", "coupons.json");
const NOTICES_PATH     = path.join(process.cwd(), "data", "notices.json");
const ATTENDANCE_PATH  = path.join(process.cwd(), "data", "attendance.json");
const SHOP_POSTS_PATH  = path.join(process.cwd(), "data", "shop_posts.json");
const USER_COUPONS_PATH = path.join(process.cwd(), "data", "user_coupons.json");
const REVIEWS_PATH      = path.join(process.cwd(), "data", "reviews.json");

function ensureDir() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── 타입 ────────────────────────────────────────────────────────────────────

export interface ShopData {
  id: number;
  company: string;
  subject: string;
  content: string;
  area: string;
  bizType: string;       // 실제 업종 (건마/오피/술집/...)
  category: string;      // [legacy] 광역 지역 코드
  category2: string;     // [legacy] 세부 지역 코드
  phone: string;
  hphone: string;
  telegram: string;
  hit: number;
  price: number;
  mainPhoto: string;
  photos: string[];
  time1: string;
  time2: string;
  timeFull: boolean;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserData {
  id: number;
  username: string;
  nickname: string;
  passwordHash: string;
  role?: "admin" | "shop" | "user";
  shopPostLimit?: number;
  level: number;
  points: number;
  status: "active" | "blocked";
  joinedAt: string;
  approvedAt?: string;
  blockedAt?: string;
  memo: string;
  lastLoginDate?: string;
  lastAttendDate?: string;
  attendStreak?: number;
  totalAttend?: number;
  isVirtual?: boolean;          // true = 스크랩 업소를 위한 자동 생성 가상 계정 (로그인 불가)
}

export type PointAction = "signup" | "login" | "attend" | "post" | "comment" | "admin" | "etc";

export interface PointLog {
  id: number;
  userId: number;
  username: string;
  action: PointAction;
  amount: number;
  balance: number;
  memo: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: number;
  userId: number;
  username: string;
  date: string;         // YYYY-MM-DD
  streak: number;
  pointAwarded: number;
  createdAt: string;
}

export type CouponType = "ORIGINAL_PRICE" | "FREE" | "DISCOUNT";

export interface CouponData {
  id: number;
  type: "coupon" | "event";
  title: string;
  description: string;       // 게시판 본문 — whitespace-pre-wrap 으로 표시
  discount: string;          // 표시용 라벨 (couponType + discountAmount 로부터 파생, 레거시 free-form 도 그대로 보존)
  couponType?: CouponType;   // 신규: 3종 타입
  discountAmount?: number;   // DISCOUNT 일 때 할인액(원). 1,000 ~ 1,000,000
  shopId: number | null;
  shopName: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  maxIssue?: number;
  ownerUserId?: number | null;
  // ── 게시판 필드 ──
  area?: string;             // 지역 (예: "서울", "강남")
  bizType?: string;          // 업종 (예: "건마", "오피")
  photos?: string[];          // 본문 사진 URL 배열
  mainPhoto?: string;        // 대표 사진
}

export interface UserCoupon {
  id: number;
  userId: number;
  username: string;
  couponId: number;
  claimedAt: string;
  usedAt?: string;
  reservationCode?: string;  // 8자 영숫자, 업소 측 [사용 확인] 시 본인 식별용
}

export const COUPON_AMOUNT_MIN = 1_000;
export const COUPON_AMOUNT_MAX = 1_000_000;

// ── Review (후기) ──────────────────────────────────────────────────────────
export const REVIEW_BIZ_TYPES = [
  "건마", "오피", "술집", "휴게텔", "안마", "노래방", "룸살롱", "기타",
] as const;
export type ReviewBizType = (typeof REVIEW_BIZ_TYPES)[number] | string;

export const REVIEW_TAG_PRESET = [
  "친절함", "청결함", "가성비", "분위기", "재방문 의사", "위생", "프라이버시", "위치",
] as const;

export const REVIEW_DEADLINE_DAYS = 7;   // 사용 확인 후 N 일 경과 후 미작성 → 신규 쿠폰 발급 차단

export interface ReviewData {
  id:              number;
  authorId:        number;
  authorUsername:  string;     // 시점 보존
  authorNickname:  string;
  // 인증 정보 (인증 후기는 출처 user_coupon, 일반 후기는 null)
  userCouponId?:   number | null;
  couponId?:       number | null;
  isCertified:     boolean;
  // 말머리/메타
  shopName:        string;     // 인증 후기는 쿠폰의 shopName 자동, 일반은 직접 입력
  bizType:         string;     // 말머리 (건마/오피/술집 ...)
  // 본문
  title:           string;
  content:         string;
  photos:          string[];
  mainPhoto:       string;
  // 평가 (1~5 별점)
  ratingFacility:  number;
  ratingService:   number;
  ratingPrice:     number;
  tags:            string[];   // ["친절함", "청결함", ...]
  // 메타
  createdAt:       string;
  updatedAt:       string;
  deletedAt?:      string;
}

export function couponLabel(c: Pick<CouponData, "couponType" | "discountAmount" | "discount">): string {
  if (c.couponType === "ORIGINAL_PRICE") return "원가권";
  if (c.couponType === "FREE")           return "무료권";
  if (c.couponType === "DISCOUNT") {
    const amt = c.discountAmount ?? 0;
    return amt > 0 ? `할인권 ${amt.toLocaleString()}원` : "할인권";
  }
  return c.discount || "";  // 레거시 free-form
}

// 8자 영숫자 (대문자 + 숫자, 시각적 혼동 문자 제외)
function generateReservationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export interface ShopPost {
  id: number;
  authorId: number;
  authorUsername: string;
  status: "pending" | "approved" | "rejected";
  rejectedReason?: string;
  company: string;
  subject?: string;
  content?: string;
  area?: string;
  category?: string;
  category2?: string;
  phone?: string;
  hphone?: string;
  telegram?: string;
  price?: number;
  mainPhoto?: string;
  photos?: string[];
  time1?: string;
  time2?: string;
  timeFull?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeData {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  isVisible: boolean;
  createdAt: string;
  // 어느 게시판에 고정할지 — "" 또는 미지정 시 전역(현재는 표시 안 함), "free" / "jobs" 만 지원
  boardCategory?: "" | "free" | "jobs";
}

// 특정 게시판에서 노출할 핀 공지 — isPinned + isVisible + 카테고리 일치
export function getPinnedNoticesForBoard(category: "free" | "jobs"): NoticeData[] {
  return loadNotices()
    .filter((n) => n.isPinned && n.isVisible && n.boardCategory === category)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface BoardPermissionSet {
  guest: boolean;
  user:  boolean;
  shop:  boolean;
}

export interface BoardPermissions {
  read:  BoardPermissionSet;
  write: BoardPermissionSet;
  edit:  BoardPermissionSet;
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  popupEnabled: boolean;
  popupContent: string;
  blockedIps: string[];
  maintenanceMode: boolean;
  // 포인트 설정
  pointSignup: number;
  pointLogin: number;
  pointAttend: number;
  pointAttendStreakBonus: number;
  pointPost: number;
  pointComment: number;
  pointReview: number;            // 일반 후기 작성 보상
  pointCertifiedReview: number;   // 인증 후기 (쿠폰 사용 후) 보상 — 일반보다 많게
  // 게시판 권한
  boardPermissions: BoardPermissions;
  // 메뉴 노출
  menuCouponVisible: boolean;
  menuEventVisible: boolean;
}

// ── Override (shop 편집) ─────────────────────────────────────────────────────
type ShopOverride = Partial<Omit<ShopData, "id" | "createdAt" | "updatedAt" | "photos">> & {
  photos?: string[];
  deleted?: boolean;
};

// ── mtime 기반 in-process 캐시 ────────────────────────────────────────────
// shops.json (5MB) / shop_overrides.json 를 매 요청마다 fs.readFileSync + JSON.parse
// 하지 않도록 mtime 비교로 invalidate. 스크래퍼 sync/admin override 로 파일이 바뀌면
// mtime 변경 → 다음 호출에서 자동 재로드.
type RawShop = {
  company: string; subject: string; content: string; area: string;
  bizType?: string; category?: string; category2?: string;
  phone: string; hphone: string;
  telegram: string; hit: number; price: number; mainPhoto: string;
  photos: string; time1: string; time2: string; timeFull: number; scrapedAt: string;
  externalId?: number;   // wr_id, shop_status.json 매칭 키 (옛 데이터엔 없을 수 있음)
};

let _rawCache:        { mtime: number; data: RawShop[] } | null = null;
let _overrideCache:   { mtime: number; data: Record<string, ShopOverride> } | null = null;
let _shopStatusCache: { mtime: number; data: Record<string, string> }      | null = null;
let _shopsCache:      { rawMtime: number; ovMtime: number; statusMtime: number; data: ShopData[] } | null = null;

function fileMtime(p: string): number {
  try { return fs.statSync(p).mtimeMs; } catch { return 0; }
}

function loadOverrides(): Record<string, ShopOverride> {
  const m = fileMtime(OVERRIDE_PATH);
  if (m === 0) { _overrideCache = null; return {}; }
  if (_overrideCache && _overrideCache.mtime === m) return _overrideCache.data;
  try {
    const data = JSON.parse(fs.readFileSync(OVERRIDE_PATH, "utf-8"));
    _overrideCache = { mtime: m, data };
    return data;
  } catch { return {}; }
}

// data/shop_status.json — DB Shop.externalId → sourceStatus 매핑.
// sync 액션 / verify-missing 스크립트가 매번 갱신. 공개 페이지 숨김에 사용.
function loadShopStatusMap(): Record<string, string> {
  const m = fileMtime(SHOP_STATUS_PATH);
  if (m === 0) { _shopStatusCache = null; return {}; }
  if (_shopStatusCache && _shopStatusCache.mtime === m) return _shopStatusCache.data;
  try {
    const data = JSON.parse(fs.readFileSync(SHOP_STATUS_PATH, "utf-8")) as Record<string, string>;
    _shopStatusCache = { mtime: m, data };
    return data;
  } catch { return {}; }
}

function saveOverrides(overrides: Record<string, ShopOverride>) {
  ensureDir();
  fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(overrides, null, 2));
  _overrideCache = null;        // 즉시 invalidate (다음 read 에서 mtime 새로 읽음)
  _shopsCache    = null;
}

// ── 업소 CRUD ────────────────────────────────────────────────────────────────
function loadRaw(): RawShop[] {
  const m = fileMtime(SHOPS_PATH);
  if (m === 0) return [];
  if (_rawCache && _rawCache.mtime === m) return _rawCache.data;
  try {
    const data = JSON.parse(fs.readFileSync(SHOPS_PATH, "utf-8")) as RawShop[];
    _rawCache = { mtime: m, data };
    return data;
  } catch { return []; }
}

function loadShops(): ShopData[] {
  const rawMtime    = fileMtime(SHOPS_PATH);
  const ovMtime     = fileMtime(OVERRIDE_PATH);
  const statusMtime = fileMtime(SHOP_STATUS_PATH);
  // 우리 사이트에서 누적된 조회수 (file 원본 hit 와 합산해 표시)
  const persistedViews = getViewCounts("shop");
  if (
    _shopsCache &&
    _shopsCache.rawMtime === rawMtime &&
    _shopsCache.ovMtime === ovMtime &&
    _shopsCache.statusMtime === statusMtime
  ) {
    // 캐시 hit — viewCounts 만 즉시 합산해서 반환 (캐시 데이터의 hit 는 file base 값)
    return _shopsCache.data.map((s) => ({ ...s, hit: s.hit + (persistedViews[String(s.id)] ?? 0) }));
  }
  const raw       = loadRaw();
  const overrides = loadOverrides();
  const statusMap = loadShopStatusMap();

  const result = raw
    .filter((s) => s.company)
    .map((s, i) => {
      const id = i + 1;
      const ov = overrides[String(id)] ?? {};
      if (ov.deleted) return null;
      // 소스 사이트에서 삭제 확정 / ARCHIVED → 공개 페이지 숨김
      if (s.externalId != null && HIDDEN_STATUSES.has(statusMap[String(s.externalId)] ?? "")) return null;
      return {
        id,
        company:   ov.company   ?? s.company,
        subject:   ov.subject   ?? s.subject ?? "",
        content:   ov.content   ?? s.content ?? "",
        area:      ov.area      ?? s.area ?? "",
        bizType:   ov.bizType   ?? s.bizType   ?? "",
        category:  ov.category  ?? s.category  ?? "",
        category2: ov.category2 ?? s.category2 ?? "",
        phone:     ov.phone     ?? s.phone ?? "",
        hphone:    ov.hphone    ?? s.hphone ?? "",
        telegram:  ov.telegram  ?? s.telegram ?? "",
        hit:       s.hit ?? 0,        // file 원본만 캐시 — viewCounts 는 return 시 합산
        price:     ov.price     ?? s.price ?? 0,
        mainPhoto: ov.mainPhoto ?? s.mainPhoto ?? "",
        photos:    ov.photos    ?? (s.photos ? s.photos.split(",").filter(Boolean) : []),
        time1:     ov.time1     ?? s.time1 ?? "",
        time2:     ov.time2     ?? s.time2 ?? "",
        timeFull:  ov.timeFull  ?? s.timeFull === 1,
        isVisible: ov.isVisible ?? true,
        createdAt: new Date(s.scrapedAt),
        updatedAt: new Date(),
      } as ShopData;
    })
    .filter(Boolean) as ShopData[];

  _shopsCache = { rawMtime, ovMtime, statusMtime, data: result };
  // 첫 로드도 viewCounts 합산해서 반환
  return result.map((s) => ({ ...s, hit: s.hit + (persistedViews[String(s.id)] ?? 0) }));
}

const PAGE_SIZE = 20;

export function getAreas(): string[] {
  const shops = loadShops();
  const counts: Record<string, number> = {};
  for (const s of shops) {
    const area = s.area.replace(/,+$/, "").trim();
    if (area) counts[area] = (counts[area] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([a]) => a);
}

// 필터 UI 용 — 카운트 포함 (정렬·뱃지 표시)
export function getAreasWithCounts(): { name: string; count: number }[] {
  const shops = loadShops();
  const counts: Record<string, number> = {};
  for (const s of shops) {
    const area = s.area.replace(/,+$/, "").trim();
    if (area) counts[area] = (counts[area] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

// 실제 업종 (건마/오피/술집...) 목록 — bizType 기준
export function getBizTypes(): { name: string; count: number }[] {
  const shops = loadShops();
  const counts: Record<string, number> = {};
  for (const s of shops) {
    const b = (s.bizType ?? "").trim();
    if (b) counts[b] = (counts[b] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

// ── 지역 계층화 (광역 → 세부) ────────────────────────────────────────────────
// shops.json 의 category(광역 cat 코드)에 한글 라벨 매핑.
// 소스 사이트 분류를 그대로 따르되 사용자 친화 라벨로 표시.
const REGION_GROUP_LABELS: Record<string, string> = {
  "1":   "강남권",
  "10":  "서울",
  "58":  "경기 남부",
  "85":  "경기 북부",
  "93":  "인천",
  "110": "충청·강원",
  "129": "대구",
  "131": "구미",
  "133": "전라·경상",
  "155": "전국",
  "218": "부산",
};

export interface RegionGroup {
  code:  string;                                  // 광역 cat 코드
  name:  string;                                  // 한글 라벨
  count: number;                                  // 그룹 전체 업소 수
  areas: { name: string; count: number }[];       // 세부 지역 (count desc)
}

export function getRegionGroups(): RegionGroup[] {
  const shops = loadShops();
  const map: Record<string, Record<string, number>> = {};
  for (const s of shops) {
    const cat = (s.category ?? "").trim();
    if (!cat || !REGION_GROUP_LABELS[cat]) continue;
    const area = (s.area ?? "").replace(/,+$/, "").trim();
    if (!area) continue;
    if (!map[cat]) map[cat] = {};
    map[cat][area] = (map[cat][area] ?? 0) + 1;
  }
  return Object.keys(REGION_GROUP_LABELS)
    .filter((code) => map[code])
    .map((code) => {
      const areas = Object.entries(map[code])
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
      const total = areas.reduce((s, a) => s + a.count, 0);
      return { code, name: REGION_GROUP_LABELS[code], count: total, areas };
    })
    .sort((a, b) => b.count - a.count);
}

export function getShops(
  area: string,
  q: string,
  page: number,
  pageSize = PAGE_SIZE,
  bizType = "",
  region = ""           // 광역 cat 코드 (그룹 필터, area 미선택 시에만 의미)
) {
  let shops = loadShops();
  if (area)    shops = shops.filter((s) => s.area.includes(area));
  else if (region) shops = shops.filter((s) => s.category === region);
  if (bizType) shops = shops.filter((s) => s.bizType === bizType);
  if (q) {
    const lq = q.toLowerCase();
    shops = shops.filter((s) =>
      s.company.toLowerCase().includes(lq) ||
      s.subject.toLowerCase().includes(lq) ||
      s.area.toLowerCase().includes(lq)
    );
  }
  shops = shops.sort((a, b) => b.hit - a.hit);
  const total = shops.length;
  return { shops: shops.slice((page - 1) * pageSize, page * pageSize), total };
}

export function getShopById(id: number): ShopData | null {
  return loadShops().find((s) => s.id === id) ?? null;
}

export function updateShop(id: number, data: Partial<ShopData>) {
  const overrides = loadOverrides();
  overrides[String(id)] = { ...(overrides[String(id)] ?? {}), ...data };
  saveOverrides(overrides);
}

export function deleteShop(id: number) {
  const overrides = loadOverrides();
  overrides[String(id)] = { ...(overrides[String(id)] ?? {}), deleted: true };
  saveOverrides(overrides);
}

export function toggleShopVisibility(id: number) {
  const shop = getShopById(id);
  if (!shop) return;
  updateShop(id, { isVisible: !shop.isVisible });
}

// ── 회원 CRUD (Prisma) ───────────────────────────────────────────────────────
// JSON → Postgres 이관 완료. 모든 함수는 async.

const ROLE_TO_DB: Record<NonNullable<UserData["role"]>, UserRole> = {
  user:  UserRole.USER,
  shop:  UserRole.SHOP,
  admin: UserRole.ADMIN,
};
const STATUS_TO_DB: Record<UserData["status"], UserStatus> = {
  active:  UserStatus.ACTIVE,
  blocked: UserStatus.BLOCKED,
};
const ROLE_FROM_DB: Record<UserRole, "user" | "shop" | "admin"> = {
  USER: "user", SHOP: "shop", ADMIN: "admin",
};
const STATUS_FROM_DB: Record<UserStatus, "active" | "blocked"> = {
  ACTIVE: "active", BLOCKED: "blocked",
};
const ACTION_TO_DB: Record<PointAction, DbPointAction> = {
  signup:  DbPointAction.SIGNUP,
  login:   DbPointAction.LOGIN,
  attend:  DbPointAction.ATTEND,
  post:    DbPointAction.POST,
  comment: DbPointAction.COMMENT,
  admin:   DbPointAction.ADMIN,
  etc:     DbPointAction.ETC,
};
const ACTION_FROM_DB: Record<DbPointAction, PointAction> = {
  SIGNUP: "signup", LOGIN: "login", ATTEND: "attend", POST: "post",
  COMMENT: "comment", LUCKY: "etc",  // LUCKY는 UI상 etc로 매핑 (PointAction 타입 호환)
  ADMIN:  "admin",  ETC:   "etc",
};

type DbUser = Awaited<ReturnType<typeof prisma.user.findUnique>>;
type DbPointLog = Awaited<ReturnType<typeof prisma.pointLog.findUnique>>;

function dbToUser(u: NonNullable<DbUser>): UserData {
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    passwordHash: u.passwordHash,
    role: ROLE_FROM_DB[u.role as UserRole],
    status: STATUS_FROM_DB[u.status as UserStatus],
    level: u.level,
    points: u.points,
    memo: u.memo,
    shopPostLimit: u.shopPostLimit ?? undefined,
    joinedAt: u.joinedAt.toISOString().slice(0, 10),
    approvedAt: u.approvedAt ? u.approvedAt.toISOString().slice(0, 10) : undefined,
    blockedAt:  u.blockedAt  ? u.blockedAt.toISOString().slice(0, 10)  : undefined,
    lastLoginDate:  u.lastLoginDate  ?? undefined,
    lastAttendDate: u.lastAttendDate ?? undefined,
    attendStreak: u.attendStreak,
    totalAttend:  u.totalAttend,
    isVirtual:    u.isVirtual,
  };
}

function dbToPointLog(l: NonNullable<DbPointLog>): PointLog {
  return {
    id: l.id,
    userId: l.userId,
    username: l.username,
    action: ACTION_FROM_DB[l.action as DbPointAction],
    amount: l.amount,
    balance: l.balance,
    memo: l.memo,
    createdAt: l.createdAt.toISOString(),
  };
}

export async function getUsers(q = "", page = 1, pageSize = 20, opts: { includeVirtual?: boolean } = {}) {
  // 가상 계정(스크랩 업소용)은 기본 제외 — admin/users 페이지·통계 오염 방지
  const baseWhere = opts.includeVirtual ? {} : { isVirtual: false };
  const where = q
    ? { ...baseWhere, OR: [
        { username: { contains: q, mode: "insensitive" as const } },
        { nickname: { contains: q, mode: "insensitive" as const } },
      ]}
    : baseWhere;
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { id: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { users: rows.map(dbToUser), total };
}

export async function getUserById(id: number): Promise<UserData | null> {
  const u = await prisma.user.findUnique({ where: { id } });
  return u ? dbToUser(u) : null;
}

export async function getUserByUsername(username: string): Promise<UserData | null> {
  const u = await prisma.user.findUnique({ where: { username } });
  return u ? dbToUser(u) : null;
}

export async function createUser(data: {
  username: string;
  nickname?: string;
  passwordHash: string;
  role?: "admin" | "shop" | "user";
  status?: "active" | "blocked";
  memo?: string;
}): Promise<{ ok: true; user: UserData } | { ok: false; error: string }> {
  const exists = await prisma.user.findUnique({ where: { username: data.username }, select: { id: true } });
  if (exists) return { ok: false, error: "이미 사용 중인 아이디입니다." };

  const role = ROLE_TO_DB[data.role ?? "user"];
  const status = STATUS_TO_DB[data.status ?? "active"];
  const created = await prisma.user.create({
    data: {
      username: data.username,
      nickname: data.nickname || data.username,
      passwordHash: data.passwordHash,
      role,
      status,
      level: 1,
      points: 0,
      memo: data.memo ?? "",
      shopPostLimit: data.role === "shop" ? 3 : null,
      joinedAt: new Date(),
      attendStreak: 0,
      totalAttend: 0,
    },
  });
  return { ok: true, user: dbToUser(created) };
}

export async function updateUser(id: number, data: Partial<UserData>) {
  // UserData 의 string enum 들을 DB enum 으로 변환
  const upd: Record<string, unknown> = {};
  if (data.username      !== undefined) upd.username      = data.username;
  if (data.nickname      !== undefined) upd.nickname      = data.nickname;
  if (data.passwordHash  !== undefined) upd.passwordHash  = data.passwordHash;
  if (data.role          !== undefined) upd.role          = ROLE_TO_DB[data.role];
  if (data.status        !== undefined) upd.status        = STATUS_TO_DB[data.status];
  if (data.level         !== undefined) upd.level         = data.level;
  if (data.points        !== undefined) upd.points        = data.points;
  if (data.memo          !== undefined) upd.memo          = data.memo;
  if (data.shopPostLimit !== undefined) upd.shopPostLimit = data.shopPostLimit ?? null;
  if (data.lastLoginDate !== undefined) upd.lastLoginDate = data.lastLoginDate ?? null;
  if (data.lastAttendDate!== undefined) upd.lastAttendDate= data.lastAttendDate ?? null;
  if (data.attendStreak  !== undefined) upd.attendStreak  = data.attendStreak;
  if (data.totalAttend   !== undefined) upd.totalAttend   = data.totalAttend;
  if (data.approvedAt    !== undefined) upd.approvedAt    = data.approvedAt ? new Date(data.approvedAt) : null;
  if (data.blockedAt     !== undefined) upd.blockedAt     = data.blockedAt  ? new Date(data.blockedAt)  : null;

  await prisma.user.update({ where: { id }, data: upd }).catch(() => {/* 존재 안 함 무시 */});
}

export async function deleteUser(id: number) {
  await prisma.user.delete({ where: { id } }).catch(() => {/* idempotent */});
}

// ── 포인트 (Prisma + 트랜잭션) ────────────────────────────────────────────────

export async function awardPoints(
  userId: number,
  action: PointAction,
  amount: number,
  memo: string
): Promise<number> {
  const dbAction = ACTION_TO_DB[action] ?? DbPointAction.ETC;
  // 트랜잭션: User.points 증감 + PointLog 생성을 원자적으로
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return 0;
    const newBalance = Math.max(0, user.points + amount);
    await tx.user.update({ where: { id: userId }, data: { points: newBalance } });
    await tx.pointLog.create({
      data: {
        userId,
        username: user.username,
        action: dbAction,
        amount,
        balance: newBalance,
        memo,
      },
    });
    return newBalance;
  });

  // 랭킹 캐시 즉시 무효화 — 출석/게시글/댓글/admin 지급 등 모든 포인트 이벤트에서 호출됨
  // (dynamic import — circular dep 회피)
  try {
    const { clearRankingCache } = await import("./actions/ranking");
    await clearRankingCache();
  } catch { /* 캐시 모듈 로드 실패는 무시 */ }

  return result;
}

export async function getPointLogs(opts: { userId?: number; page?: number; pageSize?: number } = {}) {
  const { userId, page = 1, pageSize = 20 } = opts;
  const where = userId ? { userId } : {};
  const [rows, total] = await Promise.all([
    prisma.pointLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pointLog.count({ where }),
  ]);
  return { logs: rows.map(dbToPointLog), total };
}

// ── 출석체크 ──────────────────────────────────────────────────────────────────
function loadAttendance(): AttendanceRecord[] {
  ensureDir();
  try {
    if (!fs.existsSync(ATTENDANCE_PATH)) { fs.writeFileSync(ATTENDANCE_PATH, "[]"); return []; }
    return JSON.parse(fs.readFileSync(ATTENDANCE_PATH, "utf-8"));
  } catch { return []; }
}

function saveAttendance(records: AttendanceRecord[]) {
  ensureDir();
  fs.writeFileSync(ATTENDANCE_PATH, JSON.stringify(records, null, 2));
}

export function getTodayAttendance(userId: number): AttendanceRecord | null {
  const today = new Date().toISOString().slice(0, 10);
  return loadAttendance().find((r) => r.userId === userId && r.date === today) ?? null;
}

export function getAttendanceByDate(date: string): AttendanceRecord[] {
  return loadAttendance()
    .filter((r) => r.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function checkAttendance(userId: number): Promise<{
  ok: boolean;
  alreadyChecked: boolean;
  pointAwarded: number;
  streak: number;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const user = await getUserById(userId);
  if (!user) return { ok: false, alreadyChecked: false, pointAwarded: 0, streak: 0 };

  if (getTodayAttendance(userId)) {
    return { ok: false, alreadyChecked: true, pointAwarded: 0, streak: user.attendStreak ?? 0 };
  }

  // 연속 출석 계산
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const wasYesterday = user.lastAttendDate === yesterdayStr;
  const streak = wasYesterday ? (user.attendStreak ?? 0) + 1 : 1;

  // 포인트 계산
  const settings = getSettings();
  const base = settings.pointAttend;
  const bonus = Math.min(streak - 1, 30) * settings.pointAttendStreakBonus;
  const pointAwarded = base + bonus;

  // 출석 기록 저장
  const records = loadAttendance();
  const id = records.length ? Math.max(...records.map((r) => r.id)) + 1 : 1;
  records.unshift({
    id,
    userId,
    username: user.username,
    date: today,
    streak,
    pointAwarded,
    createdAt: new Date().toISOString(),
  });
  saveAttendance(records);

  // 유저 정보 업데이트
  await updateUser(userId, {
    lastAttendDate: today,
    attendStreak: streak,
    totalAttend: (user.totalAttend ?? 0) + 1,
  });

  // 포인트 지급
  const memo = streak > 1 ? `출석체크 (${streak}일 연속 +${bonus}p 보너스)` : "출석체크";
  await awardPoints(userId, "attend", pointAwarded, memo);

  return { ok: true, alreadyChecked: false, pointAwarded, streak };
}

export async function getAttendanceStats(): Promise<{ userId: number; username: string; totalAttend: number; streak: number }[]> {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, totalAttend: true, attendStreak: true },
    orderBy: { totalAttend: "desc" },
  });
  return users.map((u) => ({
    userId: u.id,
    username: u.username,
    totalAttend: u.totalAttend,
    streak: u.attendStreak,
  }));
}

// ── 쿠폰 CRUD ────────────────────────────────────────────────────────────────
function loadCoupons(): CouponData[] {
  ensureDir();
  try {
    if (!fs.existsSync(COUPONS_PATH)) { fs.writeFileSync(COUPONS_PATH, "[]"); return []; }
    const raw = JSON.parse(fs.readFileSync(COUPONS_PATH, "utf-8")) as CouponData[];
    return raw.map((c) => {
      const next: CouponData = { ...c, type: c.type ?? "coupon" };
      // couponType 가 채워져 있으면 표시용 라벨을 항상 동기화 (레거시 free-form 은 보존)
      if (next.couponType) next.discount = couponLabel(next);
      return next;
    });
  } catch { return []; }
}

function saveCoupons(data: CouponData[]) {
  ensureDir();
  fs.writeFileSync(COUPONS_PATH, JSON.stringify(data, null, 2));
}

export function getCoupons() { return loadCoupons(); }

export function createCoupon(data: Omit<CouponData, "id" | "createdAt">) {
  const coupons = loadCoupons();
  const id = coupons.length ? Math.max(...coupons.map((c) => c.id)) + 1 : 1;
  coupons.unshift({ ...data, id, createdAt: new Date().toISOString() });
  saveCoupons(coupons);
}

export function updateCoupon(id: number, data: Partial<CouponData>) {
  const coupons = loadCoupons();
  const idx = coupons.findIndex((c) => c.id === id);
  if (idx >= 0) { coupons[idx] = { ...coupons[idx], ...data }; saveCoupons(coupons); }
}

export function deleteCoupon(id: number) {
  saveCoupons(loadCoupons().filter((c) => c.id !== id));
}

// ── 유저 쿠폰 (발급 추적) ─────────────────────────────────────────────────────
function loadUserCoupons(): UserCoupon[] {
  ensureDir();
  try {
    if (!fs.existsSync(USER_COUPONS_PATH)) { fs.writeFileSync(USER_COUPONS_PATH, "[]"); return []; }
    return JSON.parse(fs.readFileSync(USER_COUPONS_PATH, "utf-8"));
  } catch { return []; }
}

function saveUserCoupons(data: UserCoupon[]) {
  ensureDir();
  fs.writeFileSync(USER_COUPONS_PATH, JSON.stringify(data, null, 2));
}

export async function claimCoupon(
  userId: number,
  couponId: number,
): Promise<{ ok: boolean; error?: string; reservationCode?: string }> {
  const coupons = loadCoupons();
  const coupon = coupons.find((c) => c.id === couponId);
  if (!coupon) return { ok: false, error: "쿠폰을 찾을 수 없습니다." };
  if (!coupon.isActive) return { ok: false, error: "비활성화된 쿠폰입니다." };
  if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
    return { ok: false, error: "만료된 쿠폰입니다." };
  }

  const ucs = loadUserCoupons();
  if (ucs.some((uc) => uc.userId === userId && uc.couponId === couponId)) {
    return { ok: false, error: "이미 받은 쿠폰입니다." };
  }
  if (coupon.maxIssue && coupon.maxIssue > 0) {
    const count = ucs.filter((uc) => uc.couponId === couponId).length;
    if (count >= coupon.maxIssue) return { ok: false, error: "쿠폰 수량이 소진되었습니다." };
  }

  // 7일 규칙 — 사용 확인 후 N일 경과 + 인증 후기 미작성 user_coupon 이 있으면 신규 발급 차단
  const overdue = getOverdueUserCoupons(userId);
  if (overdue.length > 0) {
    return {
      ok: false,
      error: `이전에 사용 확인된 쿠폰의 후기를 ${REVIEW_DEADLINE_DAYS}일 이내에 작성하지 않아 신규 쿠폰 발급이 제한됩니다. 마이페이지에서 후기를 먼저 작성해주세요.`,
    };
  }

  const user = await getUserById(userId);
  const id = ucs.length ? Math.max(...ucs.map((uc) => uc.id)) + 1 : 1;

  // 예약 코드 — 기존 코드와 충돌 시 재생성 (현실적으로 32^8 → 충돌 확률 무시 가능, 그래도 가드)
  const existing = new Set(ucs.map((uc) => uc.reservationCode).filter(Boolean) as string[]);
  let reservationCode = generateReservationCode();
  while (existing.has(reservationCode)) reservationCode = generateReservationCode();

  ucs.push({
    id,
    userId,
    username: user?.username ?? "",
    couponId,
    claimedAt: new Date().toISOString().slice(0, 10),
    reservationCode,
  });
  saveUserCoupons(ucs);
  return { ok: true, reservationCode };
}

export function markCouponUsed(userCouponId: number) {
  const ucs = loadUserCoupons();
  const idx = ucs.findIndex((uc) => uc.id === userCouponId);
  if (idx >= 0) { ucs[idx].usedAt = new Date().toISOString().slice(0, 10); saveUserCoupons(ucs); }
}

export function getUserCoupons(userId: number): (UserCoupon & { coupon: CouponData })[] {
  const coupons = loadCoupons();
  return loadUserCoupons()
    .filter((uc) => uc.userId === userId)
    .map((uc) => { const c = coupons.find((x) => x.id === uc.couponId); return c ? { ...uc, coupon: c } : null; })
    .filter((x): x is UserCoupon & { coupon: CouponData } => x !== null)
    .sort((a, b) => b.claimedAt.localeCompare(a.claimedAt));
}

export function getCouponClaimCounts(): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const uc of loadUserCoupons()) counts[uc.couponId] = (counts[uc.couponId] ?? 0) + 1;
  return counts;
}

export function getUserCouponById(userCouponId: number): UserCoupon | null {
  return loadUserCoupons().find((uc) => uc.id === userCouponId) ?? null;
}

// 업소 사장 [사용 확인] 화면용 — 본인 owned 쿠폰을 받은 user_coupon 중 q (닉네임/예약코드/username)로 검색
export interface ShopVerifyResult {
  userCoupon: UserCoupon;
  coupon:     CouponData;
  user:       { id: number; username: string; nickname: string };
}

export async function searchShopUserCoupons(opts: {
  ownerUserId: number;
  q: string;
  includeUsed?: boolean;
}): Promise<ShopVerifyResult[]> {
  const q = opts.q.trim();
  if (!q) return [];

  const myCoupons   = loadCoupons().filter((c) => c.ownerUserId === opts.ownerUserId);
  if (myCoupons.length === 0) return [];
  const myCouponIds = new Set(myCoupons.map((c) => c.id));

  const ucs = loadUserCoupons().filter((uc) => myCouponIds.has(uc.couponId));
  if (ucs.length === 0) return [];

  // 후보 user 일괄 조회 (Postgres) — 받은 사람들 중 닉/유저네임/예약코드 매칭
  const userIds = [...new Set(ucs.map((uc) => uc.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, nickname: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const codeMatch     = q.toUpperCase();
  const nicknameMatch = q.toLowerCase();

  const out: ShopVerifyResult[] = [];
  for (const uc of ucs) {
    if (!opts.includeUsed && uc.usedAt) continue;
    const user = byId.get(uc.userId);
    if (!user) continue;
    const matched =
      (uc.reservationCode && uc.reservationCode === codeMatch) ||
      user.nickname.toLowerCase().includes(nicknameMatch) ||
      user.username.toLowerCase().includes(nicknameMatch);
    if (!matched) continue;
    const coupon = myCoupons.find((c) => c.id === uc.couponId);
    if (!coupon) continue;
    out.push({
      userCoupon: uc,
      coupon,
      user: { id: user.id, username: user.username, nickname: user.nickname },
    });
  }
  return out.sort((a, b) => b.userCoupon.claimedAt.localeCompare(a.userCoupon.claimedAt));
}

// ── Review CRUD ──────────────────────────────────────────────────────────
function loadReviews(): ReviewData[] {
  ensureDir();
  try {
    if (!fs.existsSync(REVIEWS_PATH)) { fs.writeFileSync(REVIEWS_PATH, "[]"); return []; }
    return JSON.parse(fs.readFileSync(REVIEWS_PATH, "utf-8"));
  } catch { return []; }
}

function saveReviews(data: ReviewData[]) {
  ensureDir();
  fs.writeFileSync(REVIEWS_PATH, JSON.stringify(data, null, 2));
}

export function getReviews(opts: {
  bizType?: string;
  authorId?: number;
  shopName?: string;
  certifiedOnly?: boolean;
  q?: string;
} = {}): ReviewData[] {
  let rows = loadReviews().filter((r) => !r.deletedAt);
  if (opts.bizType)       rows = rows.filter((r) => r.bizType === opts.bizType);
  if (opts.authorId)      rows = rows.filter((r) => r.authorId === opts.authorId);
  if (opts.shopName)      rows = rows.filter((r) => r.shopName === opts.shopName);
  if (opts.certifiedOnly) rows = rows.filter((r) => r.isCertified);
  if (opts.q) {
    const lq = opts.q.toLowerCase();
    rows = rows.filter((r) =>
      r.title.toLowerCase().includes(lq) ||
      r.content.toLowerCase().includes(lq) ||
      r.shopName.toLowerCase().includes(lq),
    );
  }
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getReviewById(id: number): ReviewData | null {
  return loadReviews().find((r) => r.id === id && !r.deletedAt) ?? null;
}

export function createReview(
  data: Omit<ReviewData, "id" | "createdAt" | "updatedAt">,
): ReviewData {
  const reviews = loadReviews();
  const id = reviews.length ? Math.max(...reviews.map((r) => r.id)) + 1 : 1;
  const now = new Date().toISOString();
  const next: ReviewData = { ...data, id, createdAt: now, updatedAt: now };
  reviews.unshift(next);
  saveReviews(reviews);
  return next;
}

export function updateReview(id: number, patch: Partial<ReviewData>): ReviewData | null {
  const reviews = loadReviews();
  const idx = reviews.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  reviews[idx] = { ...reviews[idx], ...patch, id: reviews[idx].id, updatedAt: new Date().toISOString() };
  saveReviews(reviews);
  return reviews[idx];
}

export function deleteReview(id: number) {
  const reviews = loadReviews();
  const idx = reviews.findIndex((r) => r.id === id);
  if (idx < 0) return;
  reviews[idx] = { ...reviews[idx], deletedAt: new Date().toISOString() };
  saveReviews(reviews);
}

// 인증 후기 유무 — userCouponId 단위 (이 user_coupon 으로 작성된 인증 후기 1건)
export function findReviewByUserCouponId(userCouponId: number): ReviewData | null {
  return loadReviews().find((r) => r.userCouponId === userCouponId && !r.deletedAt) ?? null;
}

// 7일 규칙 — 사용 확인 후 N 일 경과 + 인증 후기 미작성 user_coupon 목록
export function getOverdueUserCoupons(userId: number, days = REVIEW_DEADLINE_DAYS): UserCoupon[] {
  const ucs = loadUserCoupons().filter((uc) => uc.userId === userId && uc.usedAt);
  if (ucs.length === 0) return [];
  const reviews = loadReviews().filter((r) => r.authorId === userId && r.userCouponId && !r.deletedAt);
  const reviewedSet = new Set(reviews.map((r) => r.userCouponId!));
  const cutoff = Date.now() - days * 86400_000;
  return ucs.filter((uc) => {
    if (reviewedSet.has(uc.id)) return false;
    const usedTs = new Date(uc.usedAt!).getTime();
    return usedTs < cutoff;
  });
}

// /shop/[id] 위젯 — 업소명 매칭 인증 후기 (역방향 노출)
export function getCertifiedReviewsForShop(shopName: string, limit = 6): ReviewData[] {
  return loadReviews()
    .filter((r) => r.isCertified && r.shopName === shopName && !r.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getShopCouponStats(ownerUserId: number): Array<CouponData & { claimCount: number; usedCount: number }> {
  const coupons = loadCoupons().filter((c) => c.ownerUserId === ownerUserId);
  const ucs = loadUserCoupons();
  return coupons.map((c) => ({
    ...c,
    claimCount: ucs.filter((uc) => uc.couponId === c.id).length,
    usedCount:  ucs.filter((uc) => uc.couponId === c.id && !!uc.usedAt).length,
  }));
}

// ── 공지사항 CRUD ─────────────────────────────────────────────────────────────
function loadNotices(): NoticeData[] {
  ensureDir();
  try {
    if (!fs.existsSync(NOTICES_PATH)) { fs.writeFileSync(NOTICES_PATH, "[]"); return []; }
    return JSON.parse(fs.readFileSync(NOTICES_PATH, "utf-8"));
  } catch { return []; }
}

function saveNotices(data: NoticeData[]) {
  ensureDir();
  fs.writeFileSync(NOTICES_PATH, JSON.stringify(data, null, 2));
}

export function getNotices() { return loadNotices(); }

export function createNotice(data: Omit<NoticeData, "id" | "createdAt">) {
  const list = loadNotices();
  const id = list.length ? Math.max(...list.map((n) => n.id)) + 1 : 1;
  list.unshift({ ...data, id, createdAt: new Date().toISOString() });
  saveNotices(list);
}

export function updateNotice(id: number, data: Partial<NoticeData>) {
  const list = loadNotices();
  const idx = list.findIndex((n) => n.id === id);
  if (idx >= 0) { list[idx] = { ...list[idx], ...data }; saveNotices(list); }
}

export function deleteNotice(id: number) {
  saveNotices(loadNotices().filter((n) => n.id !== id));
}

// ── 사이트 설정 ───────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "BAM",
  siteDescription: "지역별 업소 정보 검색",
  logoUrl: "",
  popupEnabled: false,
  popupContent: "",
  blockedIps: [],
  maintenanceMode: false,
  pointSignup: 100,
  pointLogin: 10,
  pointAttend: 50,
  pointAttendStreakBonus: 10,
  pointPost: 20,
  pointComment: 5,
  pointReview: 100,
  pointCertifiedReview: 500,
  boardPermissions: {
    read:  { guest: true,  user: true,  shop: true  },
    write: { guest: false, user: true,  shop: true  },
    edit:  { guest: false, user: true,  shop: true  },
  },
  menuCouponVisible: true,
  menuEventVisible: true,
};

export function getSettings(): SiteSettings {
  ensureDir();
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2));
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) };
  } catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(data: Partial<SiteSettings>) {
  ensureDir();
  const current = getSettings();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ ...current, ...data }, null, 2));
}

// ── 업소 게시글 ───────────────────────────────────────────────────────────────
function loadShopPosts(): ShopPost[] {
  ensureDir();
  try {
    if (!fs.existsSync(SHOP_POSTS_PATH)) { fs.writeFileSync(SHOP_POSTS_PATH, "[]"); return []; }
    return JSON.parse(fs.readFileSync(SHOP_POSTS_PATH, "utf-8"));
  } catch { return []; }
}

function saveShopPosts(posts: ShopPost[]) {
  ensureDir();
  fs.writeFileSync(SHOP_POSTS_PATH, JSON.stringify(posts, null, 2));
}

export function getShopPosts(opts: {
  status?: ShopPost["status"] | "all";
  authorId?: number;
  page?: number;
  pageSize?: number;
} = {}) {
  const { status = "all", authorId, page = 1, pageSize = 20 } = opts;
  let posts = loadShopPosts();
  if (status !== "all") posts = posts.filter((p) => p.status === status);
  if (authorId !== undefined) posts = posts.filter((p) => p.authorId === authorId);
  posts = posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { posts: posts.slice((page - 1) * pageSize, page * pageSize), total: posts.length };
}

export function getShopPostById(id: number): ShopPost | null {
  return loadShopPosts().find((p) => p.id === id) ?? null;
}

export function createShopPost(data: Omit<ShopPost, "id" | "status" | "createdAt" | "updatedAt">): ShopPost {
  const posts = loadShopPosts();
  const id = posts.length ? Math.max(...posts.map((p) => p.id)) + 1 : 1;
  const now = new Date().toISOString();
  const post: ShopPost = { ...data, id, status: "pending", createdAt: now, updatedAt: now };
  posts.unshift(post);
  saveShopPosts(posts);
  return post;
}

export function updateShopPost(id: number, data: Partial<ShopPost>) {
  const posts = loadShopPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx >= 0) {
    posts[idx] = { ...posts[idx], ...data, updatedAt: new Date().toISOString() };
    saveShopPosts(posts);
  }
}

export function deleteShopPost(id: number) {
  saveShopPosts(loadShopPosts().filter((p) => p.id !== id));
}

export function approveShopPost(id: number) {
  updateShopPost(id, { status: "approved", rejectedReason: undefined });
}

export function rejectShopPost(id: number, reason: string) {
  updateShopPost(id, { status: "rejected", rejectedReason: reason });
}

export function countShopPostsByAuthor(authorId: number): number {
  return loadShopPosts().filter((p) => p.authorId === authorId).length;
}
