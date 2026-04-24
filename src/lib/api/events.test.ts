import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordAnalyticsEvent,
  extractIpFromHeaders,
  isValidEventType,
} from "./events";
import { EventType } from "@/generated/prisma/enums";

// ── Prisma mock ───────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: {
      create: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/prisma");
const mockCreate = vi.mocked(prisma.analyticsEvent.create);

// ── 헬퍼: 성공 응답 고정값 ─────────────────────────────────────────────────

function makeEvent(overrides?: Partial<{
  id: number; storeId: number; eventType: string; ipAddress: string; createdAt: Date;
}>) {
  return {
    id: 1,
    storeId: 42,
    eventType: EventType.VIEW,
    ipAddress: "192.168.1.1",
    createdAt: new Date("2026-04-25T00:00:00.000Z"),
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. extractIpFromHeaders
// ═════════════════════════════════════════════════════════════════════════════

describe("extractIpFromHeaders", () => {
  it("X-Forwarded-For 첫 번째 IP를 반환한다", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
    expect(extractIpFromHeaders(headers)).toBe("203.0.113.5");
  });

  it("X-Forwarded-For가 없으면 X-Real-IP를 반환한다", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.9" });
    expect(extractIpFromHeaders(headers)).toBe("198.51.100.9");
  });

  it("두 헤더 모두 없으면 'unknown'을 반환한다", () => {
    expect(extractIpFromHeaders(new Headers())).toBe("unknown");
  });

  it("일반 객체 형태의 헤더도 처리한다", () => {
    expect(extractIpFromHeaders({ "x-forwarded-for": "1.2.3.4", "x-real-ip": null })).toBe("1.2.3.4");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. isValidEventType
// ═════════════════════════════════════════════════════════════════════════════

describe("isValidEventType", () => {
  it.each(Object.values(EventType))("'%s'는 유효한 이벤트 타입이다", (type) => {
    expect(isValidEventType(type)).toBe(true);
  });

  it("알 수 없는 문자열은 false를 반환한다", () => {
    expect(isValidEventType("CLICK")).toBe(false);
    expect(isValidEventType("view")).toBe(false);   // 소문자
    expect(isValidEventType("")).toBe(false);
    expect(isValidEventType(null)).toBe(false);
    expect(isValidEventType(undefined)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. recordAnalyticsEvent — 정상 케이스
// ═════════════════════════════════════════════════════════════════════════════

describe("recordAnalyticsEvent — 정상 케이스", () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue(makeEvent());
  });

  it("VIEW 이벤트: storeId·eventType·ipAddress가 올바르게 저장된다", async () => {
    const result = await recordAnalyticsEvent({
      storeId: 42,
      eventType: EventType.VIEW,
      ipAddress: "192.168.1.1",
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith({
      data: { storeId: 42, eventType: "VIEW", ipAddress: "192.168.1.1" },
      select: { id: true, storeId: true, eventType: true, ipAddress: true, createdAt: true },
    });
    expect(result.storeId).toBe(42);
    expect(result.eventType).toBe("VIEW");
    expect(result.ipAddress).toBe("192.168.1.1");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("CALL 이벤트가 올바른 eventType으로 저장된다", async () => {
    mockCreate.mockResolvedValue(makeEvent({ eventType: EventType.CALL }));

    await recordAnalyticsEvent({
      storeId: 7,
      eventType: EventType.CALL,
      ipAddress: "10.0.0.1",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: "CALL" }) })
    );
  });

  it("MAP 이벤트가 올바른 eventType으로 저장된다", async () => {
    mockCreate.mockResolvedValue(makeEvent({ eventType: EventType.MAP }));

    await recordAnalyticsEvent({ storeId: 7, eventType: EventType.MAP, ipAddress: "10.0.0.2" });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: "MAP" }) })
    );
  });

  it("RESERVATION 이벤트가 올바른 eventType으로 저장된다", async () => {
    mockCreate.mockResolvedValue(makeEvent({ eventType: EventType.RESERVATION }));

    await recordAnalyticsEvent({ storeId: 3, eventType: EventType.RESERVATION, ipAddress: "172.16.0.5" });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: "RESERVATION" }) })
    );
  });

  it("X-Forwarded-For에서 추출한 IP가 그대로 저장된다", async () => {
    const forwardedIp = "203.0.113.5";
    mockCreate.mockResolvedValue(makeEvent({ ipAddress: forwardedIp }));

    await recordAnalyticsEvent({ storeId: 1, eventType: EventType.VIEW, ipAddress: forwardedIp });

    const call = mockCreate.mock.calls[0][0];
    expect(call.data.ipAddress).toBe(forwardedIp);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. recordAnalyticsEvent — 유효성 검사 실패
// ═════════════════════════════════════════════════════════════════════════════

describe("recordAnalyticsEvent — 유효성 검사", () => {
  it("storeId가 0이면 에러를 던진다", async () => {
    await expect(
      recordAnalyticsEvent({ storeId: 0, eventType: EventType.VIEW, ipAddress: "1.1.1.1" })
    ).rejects.toThrow("Invalid storeId");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("storeId가 음수이면 에러를 던진다", async () => {
    await expect(
      recordAnalyticsEvent({ storeId: -1, eventType: EventType.VIEW, ipAddress: "1.1.1.1" })
    ).rejects.toThrow("Invalid storeId");
  });

  it("storeId가 실수(float)이면 에러를 던진다", async () => {
    await expect(
      recordAnalyticsEvent({ storeId: 1.5, eventType: EventType.VIEW, ipAddress: "1.1.1.1" })
    ).rejects.toThrow("Invalid storeId");
  });

  it("eventType이 잘못된 문자열이면 에러를 던진다", async () => {
    await expect(
      recordAnalyticsEvent({ storeId: 1, eventType: "CLICK" as never, ipAddress: "1.1.1.1" })
    ).rejects.toThrow("Invalid eventType");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("ipAddress가 빈 문자열이면 에러를 던진다", async () => {
    await expect(
      recordAnalyticsEvent({ storeId: 1, eventType: EventType.VIEW, ipAddress: "" })
    ).rejects.toThrow("Missing ipAddress");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. Prisma 오류 전파
// ═════════════════════════════════════════════════════════════════════════════

describe("recordAnalyticsEvent — DB 오류 전파", () => {
  it("DB 연결 실패 시 에러가 그대로 전파된다", async () => {
    mockCreate.mockRejectedValue(new Error("Can't reach database server"));

    await expect(
      recordAnalyticsEvent({ storeId: 1, eventType: EventType.VIEW, ipAddress: "1.1.1.1" })
    ).rejects.toThrow("Can't reach database server");
  });

  it("외래 키 제약 위반 시 에러가 전파된다 (storeId 없는 Shop)", async () => {
    mockCreate.mockRejectedValue(new Error("Foreign key constraint violated"));

    await expect(
      recordAnalyticsEvent({ storeId: 99999, eventType: EventType.VIEW, ipAddress: "1.1.1.1" })
    ).rejects.toThrow("Foreign key constraint violated");
  });
});
