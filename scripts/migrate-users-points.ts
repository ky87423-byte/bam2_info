/**
 * JSON → Prisma 이관 스크립트
 *
 * 대상: data/users.json, data/point_logs.json
 * 실행: npm run db:migrate-json  (= tsx scripts/migrate-users-points.ts)
 *
 * ⚠ 사전 조건 (승인 후 적용 예정)
 *   1. prisma/schema.prisma 에 User / PointLog 모델 + 관련 enum 추가
 *   2. npx prisma migrate dev --name add_user_pointlog_comment
 *      → src/generated/prisma 재생성 후 이 스크립트가 컴파일됨
 *
 * 원칙
 *   - 원본 id 보존 (PointLog.userId 참조 무결성)
 *   - upsert 로 idempotent (재실행 안전)
 *   - 단일 트랜잭션 (부분 실패 시 전체 롤백)
 *   - 완료 후 Postgres 시퀀스를 max(id)+1 로 리셋 → 이후 auto-id 충돌 방지
 *   - 고아 PointLog(userId 없음)는 경고 후 skip (드롭 아님, 복구 용이)
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole, UserStatus, PointAction } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

// ── 경로 ─────────────────────────────────────────────────────────────────────
const USERS_PATH = path.join(process.cwd(), "data", "users.json");
const LOGS_PATH  = path.join(process.cwd(), "data", "point_logs.json");

// ── JSON 원본 구조 (기존 data.ts UserData / PointLog) ───────────────────────
interface JsonUser {
  id: number;
  username: string;
  nickname: string;
  passwordHash: string;
  role?: "admin" | "shop" | "user";
  shopPostLimit?: number;
  level: number;
  points: number;
  status: "active" | "blocked";
  joinedAt: string;       // YYYY-MM-DD
  approvedAt?: string;    // YYYY-MM-DD
  blockedAt?: string;     // YYYY-MM-DD
  memo: string;
  lastLoginDate?: string;
  lastAttendDate?: string;
  attendStreak?: number;
  totalAttend?: number;
}

interface JsonPointLog {
  id: number;
  userId: number;
  username: string;
  action: string;
  amount: number;
  balance: number;
  memo: string;
  createdAt: string;      // ISO
}

// ── 변환 맵 ──────────────────────────────────────────────────────────────────
const ROLE_MAP: Record<string, UserRole> = {
  admin: UserRole.ADMIN,
  shop:  UserRole.SHOP,
  user:  UserRole.USER,
};
const STATUS_MAP: Record<string, UserStatus> = {
  active:  UserStatus.ACTIVE,
  blocked: UserStatus.BLOCKED,
};
const ACTION_MAP: Record<string, PointAction> = {
  signup:  PointAction.SIGNUP,
  login:   PointAction.LOGIN,
  attend:  PointAction.ATTEND,
  post:    PointAction.POST,
  comment: PointAction.COMMENT,
  lucky:   PointAction.LUCKY,
  admin:   PointAction.ADMIN,
  etc:     PointAction.ETC,
};

function toDateOrNull(s?: string): Date | null {
  if (!s) return null;
  // YYYY-MM-DD → UTC 자정, 아니면 그대로 파싱
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00.000Z` : s;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("━".repeat(64));
  console.log("📦  JSON → Prisma 이관");
  console.log("━".repeat(64));

  // 1) 파일 존재 확인
  if (!fs.existsSync(USERS_PATH)) throw new Error(`users.json 없음: ${USERS_PATH}`);
  const users: JsonUser[] = JSON.parse(fs.readFileSync(USERS_PATH, "utf-8"));
  const logs:  JsonPointLog[] = fs.existsSync(LOGS_PATH)
    ? JSON.parse(fs.readFileSync(LOGS_PATH, "utf-8"))
    : [];

  console.log(`  users.json      : ${users.length}건`);
  console.log(`  point_logs.json : ${logs.length}건`);

  // 2) 중복·정합성 사전 검증
  const userIds = new Set<number>();
  const dupUsernames = new Map<string, number>();
  for (const u of users) {
    if (userIds.has(u.id)) throw new Error(`중복 user id: ${u.id}`);
    userIds.add(u.id);
    const prev = dupUsernames.get(u.username);
    if (prev !== undefined) throw new Error(`중복 username: "${u.username}" (id=${prev}, ${u.id})`);
    dupUsernames.set(u.username, u.id);
  }

  const orphans = logs.filter((l) => !userIds.has(l.userId));
  if (orphans.length > 0) {
    console.warn(`  ⚠ 고아 PointLog ${orphans.length}건 (userId 매칭 실패): ` +
      orphans.map((o) => `id=${o.id}(user ${o.userId})`).join(", "));
  }

  // 3) 트랜잭션으로 일괄 이관
  console.log("\n▶ 트랜잭션 시작...");
  const result = await prisma.$transaction(async (tx) => {
    let userOk = 0;
    let logOk = 0, logSkip = 0;

    for (const u of users) {
      const role   = ROLE_MAP[u.role ?? "user"]   ?? UserRole.USER;
      const status = STATUS_MAP[u.status]         ?? UserStatus.ACTIVE;
      const base = {
        username:       u.username,
        nickname:       u.nickname,
        passwordHash:   u.passwordHash ?? "",
        role,
        status,
        level:          u.level,
        points:         u.points,
        memo:           u.memo ?? "",
        shopPostLimit:  u.shopPostLimit ?? null,
        joinedAt:       toDateOrNull(u.joinedAt) ?? new Date(),
        approvedAt:     toDateOrNull(u.approvedAt),
        blockedAt:      toDateOrNull(u.blockedAt),
        lastLoginDate:  u.lastLoginDate  ?? null,
        lastAttendDate: u.lastAttendDate ?? null,
        attendStreak:   u.attendStreak ?? 0,
        totalAttend:    u.totalAttend  ?? 0,
      };
      await tx.user.upsert({
        where:  { id: u.id },
        update: base,
        create: { id: u.id, ...base },
      });
      userOk++;
    }

    for (const l of logs) {
      if (!userIds.has(l.userId)) { logSkip++; continue; }
      const action = ACTION_MAP[l.action] ?? PointAction.ETC;
      const base = {
        userId:    l.userId,
        username:  l.username,
        action,
        amount:    l.amount,
        balance:   l.balance,
        memo:      l.memo ?? "",
        createdAt: toDateOrNull(l.createdAt) ?? new Date(),
      };
      await tx.pointLog.upsert({
        where:  { id: l.id },
        update: base,
        create: { id: l.id, ...base },
      });
      logOk++;
    }

    // 4) 시퀀스 재정렬 — 명시 id 삽입 후 자동 id 충돌 방지
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE((SELECT MAX(id) FROM "User"), 1));`
    );
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"PointLog"', 'id'), COALESCE((SELECT MAX(id) FROM "PointLog"), 1));`
    );

    return { userOk, logOk, logSkip };
  }, { timeout: 60_000 });

  // 5) 사후 검증
  const [userCnt, logCnt] = await Promise.all([
    prisma.user.count(),
    prisma.pointLog.count(),
  ]);

  console.log("\n" + "━".repeat(64));
  console.log("✅  이관 완료");
  console.log(`    User     : upsert ${result.userOk}건 / DB 총 ${userCnt}건`);
  console.log(`    PointLog : upsert ${result.logOk}건 (skip ${result.logSkip}) / DB 총 ${logCnt}건`);
  console.log("━".repeat(64));

  if (userCnt !== users.length) {
    console.warn(`⚠ User 수 불일치: JSON ${users.length} ≠ DB ${userCnt}`);
  }
  const expectedLogs = logs.length - result.logSkip;
  if (logCnt < expectedLogs) {
    console.warn(`⚠ PointLog 수 부족: 기대 ${expectedLogs} ≠ DB ${logCnt}`);
  }
}

main()
  .catch((e) => {
    console.error("\n❌ 이관 실패 — 전체 롤백됨");
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
