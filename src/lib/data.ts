import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { UserRole, UserStatus, PointAction as DbPointAction } from "@/generated/prisma/enums";

const SHOPS_PATH       = path.join(process.cwd(), "..", "bam_info", "scraped_data", "shops.json");
const OVERRIDE_PATH    = path.join(process.cwd(), "data", "shop_overrides.json");
// USERS_PATH, POINT_LOGS_PATH 제거 — User/PointLog는 Prisma DB로 이관됨
const SETTINGS_PATH    = path.join(process.cwd(), "data", "settings.json");
const COUPONS_PATH     = path.join(process.cwd(), "data", "coupons.json");
const NOTICES_PATH     = path.join(process.cwd(), "data", "notices.json");
const ATTENDANCE_PATH  = path.join(process.cwd(), "data", "attendance.json");
const SHOP_POSTS_PATH  = path.join(process.cwd(), "data", "shop_posts.json");
const USER_COUPONS_PATH = path.join(process.cwd(), "data", "user_coupons.json");

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

export interface CouponData {
  id: number;
  type: "coupon" | "event";
  title: string;
  description: string;
  discount: string;
  shopId: number | null;
  shopName: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  maxIssue?: number;
  ownerUserId?: number | null;
}

export interface UserCoupon {
  id: number;
  userId: number;
  username: string;
  couponId: number;
  claimedAt: string;
  usedAt?: string;
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

function loadOverrides(): Record<string, ShopOverride> {
  try {
    if (!fs.existsSync(OVERRIDE_PATH)) return {};
    return JSON.parse(fs.readFileSync(OVERRIDE_PATH, "utf-8"));
  } catch { return {}; }
}

function saveOverrides(overrides: Record<string, ShopOverride>) {
  ensureDir();
  fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(overrides, null, 2));
}

// ── 업소 CRUD ────────────────────────────────────────────────────────────────
function loadRaw() {
  try {
    return JSON.parse(fs.readFileSync(SHOPS_PATH, "utf-8")) as Array<{
      company: string; subject: string; content: string; area: string;
      bizType?: string; category?: string; category2?: string;
      phone: string; hphone: string;
      telegram: string; hit: number; price: number; mainPhoto: string;
      photos: string; time1: string; time2: string; timeFull: number; scrapedAt: string;
    }>;
  } catch { return []; }
}

function loadShops(): ShopData[] {
  const raw = loadRaw();
  const overrides = loadOverrides();

  return raw
    .filter((s) => s.company)
    .map((s, i) => {
      const id = i + 1;
      const ov = overrides[String(id)] ?? {};
      if (ov.deleted) return null;
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
        hit:       s.hit ?? 0,
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

export function getShops(area: string, q: string, page: number, pageSize = PAGE_SIZE, bizType = "") {
  let shops = loadShops();
  if (area)    shops = shops.filter((s) => s.area.includes(area));
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
    return raw.map((c) => ({ ...c, type: c.type ?? "coupon" }));
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

export async function claimCoupon(userId: number, couponId: number): Promise<{ ok: boolean; error?: string }> {
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

  const user = await getUserById(userId);
  const id = ucs.length ? Math.max(...ucs.map((uc) => uc.id)) + 1 : 1;
  ucs.push({ id, userId, username: user?.username ?? "", couponId, claimedAt: new Date().toISOString().slice(0, 10) });
  saveUserCoupons(ucs);
  return { ok: true };
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
