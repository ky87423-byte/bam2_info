/**
 * stats.ts 검증 테스트
 *
 * 확정된 mock 데이터를 주입한 뒤
 * getSalesFunnel의 전환율 계산과
 * getZeroResultKeywords의 정렬이 정확한지 검증합니다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSalesFunnel, getZeroResultKeywords, getSuspiciousIps, getPeriodStats } from "./stats";
import { EventType } from "@/generated/prisma/enums";

// ── Prisma mock ───────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: { groupBy: vi.fn() },
    searchLog:      { groupBy: vi.fn() },
    shop:           { findMany: vi.fn() },
  },
}));

const { prisma } = await import("@/lib/prisma");
const mockEventGroupBy  = vi.mocked(prisma.analyticsEvent.groupBy);
const mockSearchGroupBy = vi.mocked(prisma.searchLog.groupBy);

// ═════════════════════════════════════════════════════════════════════════════
// 헬퍼: groupBy 반환값 타입 맞추기
// ═════════════════════════════════════════════════════════════════════════════

function eventRows(
  rows: { storeId: number; eventType: string; count: number }[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r) => ({ storeId: r.storeId, eventType: r.eventType as any, _count: { _all: r.count } }));
}

function searchRows(rows: { keyword: string; count: number }[]) {
  return rows.map((r) => ({ keyword: r.keyword, _count: { id: r.count } }));
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. 전환율 계산 정확성 — 특정 업소 지정 검증
// ═════════════════════════════════════════════════════════════════════════════

describe("getSalesFunnel — 전환율 계산 정확성", () => {
  /**
   * 업소 #42 시나리오
   *   VIEW        : 100건
   *   CALL        :  15건
   *   MAP         :   8건
   *   RESERVATION :   2건
   *   ─────────────────────
   *   actions     :  25건  (CALL + MAP + RESERVATION)
   *   전환율      :  25.0% (25 / 100 × 100)
   */
  const SHOP_42_ROWS = eventRows([
    { storeId: 42, eventType: "VIEW",        count: 100 },
    { storeId: 42, eventType: "CALL",        count: 15  },
    { storeId: 42, eventType: "MAP",         count: 8   },
    { storeId: 42, eventType: "RESERVATION", count: 2   },
  ]);

  beforeEach(() => {
    mockEventGroupBy.mockResolvedValue(SHOP_42_ROWS as never);
  });

  it("VIEW 100건 + 행동 25건 → 전환율 25.0%", async () => {
    const result = await getSalesFunnel();
    const shop = result.find((r) => r.storeId === 42);

    expect(shop).toBeDefined();
    expect(shop!.views).toBe(100);
    expect(shop!.actions).toBe(25); // 15 + 8 + 2
    expect(shop!.conversionRate).toBe(25.0);
  });

  it("actions = CALL + MAP + RESERVATION 합산이 맞는지 확인", async () => {
    const result = await getSalesFunnel();
    const shop = result.find((r) => r.storeId === 42)!;
    // 개별 합산 검증
    expect(shop.actions).toBe(15 + 8 + 2);
  });

  it("전환율 소수점은 반올림 1자리 (25.3% 케이스)", async () => {
    mockEventGroupBy.mockResolvedValue(eventRows([
      { storeId: 7, eventType: "VIEW", count: 300 },
      { storeId: 7, eventType: "CALL", count: 76  }, // 76/300 = 25.333...%
    ]) as never);

    const result = await getSalesFunnel();
    const shop = result.find((r) => r.storeId === 7)!;
    expect(shop.conversionRate).toBe(25.3); // Math.round(25.333 * 10) / 10
  });

  it("VIEW만 있고 행동이 0건이면 전환율 0.0%", async () => {
    mockEventGroupBy.mockResolvedValue(eventRows([
      { storeId: 5, eventType: "VIEW", count: 50 },
    ]) as never);

    const [shop] = await getSalesFunnel();
    expect(shop.conversionRate).toBe(0);
    expect(shop.actions).toBe(0);
  });

  it("minViews 미만 업소는 결과에서 제외된다", async () => {
    mockEventGroupBy.mockResolvedValue(eventRows([
      { storeId: 1, eventType: "VIEW", count: 3 },  // minViews=5 미만 → 제외
      { storeId: 2, eventType: "VIEW", count: 10 },
    ]) as never);

    const result = await getSalesFunnel(undefined, 5);
    expect(result.find((r) => r.storeId === 1)).toBeUndefined();
    expect(result.find((r) => r.storeId === 2)).toBeDefined();
  });

  it("결과는 전환율 내림차순으로 정렬된다", async () => {
    mockEventGroupBy.mockResolvedValue(eventRows([
      { storeId: 10, eventType: "VIEW", count: 100 },
      { storeId: 10, eventType: "CALL", count: 10  }, // 10%
      { storeId: 20, eventType: "VIEW", count: 100 },
      { storeId: 20, eventType: "CALL", count: 50  }, // 50%
      { storeId: 30, eventType: "VIEW", count: 100 },
      { storeId: 30, eventType: "CALL", count: 30  }, // 30%
    ]) as never);

    const result = await getSalesFunnel();
    expect(result.map((r) => r.storeId)).toEqual([20, 30, 10]);
    expect(result.map((r) => r.conversionRate)).toEqual([50, 30, 10]);
  });

  it("topN=2 이면 상위 2개만 반환된다", async () => {
    mockEventGroupBy.mockResolvedValue(eventRows([
      { storeId: 1, eventType: "VIEW", count: 100 }, { storeId: 1, eventType: "CALL", count: 80 },
      { storeId: 2, eventType: "VIEW", count: 100 }, { storeId: 2, eventType: "CALL", count: 60 },
      { storeId: 3, eventType: "VIEW", count: 100 }, { storeId: 3, eventType: "CALL", count: 40 },
    ]) as never);

    const result = await getSalesFunnel(undefined, 1, 2);
    expect(result).toHaveLength(2);
    expect(result[0].storeId).toBe(1); // 80%
    expect(result[1].storeId).toBe(2); // 60%
  });

  it("여러 업소가 섞인 groupBy 결과를 업소별로 올바르게 분리한다", async () => {
    mockEventGroupBy.mockResolvedValue(eventRows([
      { storeId: 42, eventType: "VIEW", count: 100 },
      { storeId: 99, eventType: "VIEW", count: 200 },
      { storeId: 42, eventType: "CALL", count: 15  },
      { storeId: 99, eventType: "MAP",  count: 40  },
    ]) as never);

    const result = await getSalesFunnel();
    const s42 = result.find((r) => r.storeId === 42)!;
    const s99 = result.find((r) => r.storeId === 99)!;

    // 업소 교차 오염 없음
    expect(s42.views).toBe(100);
    expect(s42.actions).toBe(15);
    expect(s99.views).toBe(200);
    expect(s99.actions).toBe(40);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. 수요-공급 불균형 — 결과 0건 키워드 정렬 검증
// ═════════════════════════════════════════════════════════════════════════════

describe("getZeroResultKeywords — 수요-공급 정렬 검증", () => {
  /**
   * 시나리오: 결과 0건 키워드 빈도
   *   강남  : 8회
   *   스파  : 5회
   *   마사지: 3회
   *   → 빈도 내림차순: [강남, 스파, 마사지]
   */
  it("빈도 내림차순으로 정렬되어 반환된다", async () => {
    mockSearchGroupBy.mockResolvedValue(searchRows([
      { keyword: "강남",   count: 8 },  // Prisma가 이미 정렬해 반환
      { keyword: "스파",   count: 5 },
      { keyword: "마사지", count: 3 },
    ]) as never);

    const result = await getZeroResultKeywords();
    expect(result.map((r) => r.keyword)).toEqual(["강남", "스파", "마사지"]);
    expect(result.map((r) => r.count)).toEqual([8, 5, 3]);
  });

  it("count 값이 실제 숫자와 일치한다", async () => {
    mockSearchGroupBy.mockResolvedValue(searchRows([
      { keyword: "노래방마사지", count: 47 },
      { keyword: "로미로미",    count: 12 },
    ]) as never);

    const result = await getZeroResultKeywords();
    expect(result[0]).toEqual({ keyword: "노래방마사지", count: 47 });
    expect(result[1]).toEqual({ keyword: "로미로미",    count: 12 });
  });

  it("take=3 이면 상위 3개만 반환된다 (Prisma가 LIMIT 적용)", async () => {
    // Prisma가 take를 DB에 넘기므로, mock도 3개만 반환한다고 가정
    mockSearchGroupBy.mockResolvedValue(searchRows([
      { keyword: "A", count: 10 },
      { keyword: "B", count: 7  },
      { keyword: "C", count: 5  },
    ]) as never);

    const result = await getZeroResultKeywords(3);
    expect(result).toHaveLength(3);
    // Prisma 호출 시 take=3이 넘어갔는지 확인
    expect(mockSearchGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
  });

  it("groupBy 쿼리에 resultCount:0 필터가 포함된다", async () => {
    mockSearchGroupBy.mockResolvedValue([]);

    await getZeroResultKeywords();

    expect(mockSearchGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resultCount: 0 },
      })
    );
  });

  it("결과가 없으면 빈 배열을 반환한다", async () => {
    mockSearchGroupBy.mockResolvedValue([]);
    expect(await getZeroResultKeywords()).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. 의심 IP — having 절 & 정렬 검증
// ═════════════════════════════════════════════════════════════════════════════

describe("getSuspiciousIps — having 절 적용 검증", () => {
  it("having 절에 threshold가 올바르게 전달된다", async () => {
    mockEventGroupBy.mockResolvedValue([]);

    await getSuspiciousIps(10, 30);

    expect(mockEventGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        having: { ipAddress: { _count: { gt: 30 } } },
      })
    );
  });

  it("이벤트 수 내림차순으로 정렬된다", async () => {
    mockEventGroupBy.mockResolvedValue([
      { ipAddress: "1.1.1.1", _count: { id: 200 } },
      { ipAddress: "2.2.2.2", _count: { id: 85  } },
    ] as never);

    const result = await getSuspiciousIps();
    expect(result[0].ipAddress).toBe("1.1.1.1");
    expect(result[0].eventCount).toBe(200);
    expect(result[1].eventCount).toBe(85);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. 기간 대비 증감률 — getPeriodStats
// ═════════════════════════════════════════════════════════════════════════════

describe("getPeriodStats — 기간 대비 증감률 계산", () => {
  // 테스트 헬퍼: [30일 전, 오늘) 범위의 from/to
  const makeRange = (days = 30): [Date, Date] => {
    const to   = new Date();
    const from = new Date(to.getTime() - days * 86_400_000);
    return [from, to];
  };

  /**
   * 시나리오
   *   현재 30일: VIEW=100, CALL=20          → views=100, actions=20, conv=20.0%
   *   이전 30일: VIEW=80,  CALL=24          → views=80,  actions=24, conv=30.0%
   *
   *   views 변화율   = (100-80)/80 × 100  = +25.0%
   *   actions 변화율 = (20-24)/24  × 100  = -16.7%
   *   conv 변화율    = (20-30)/30  × 100  = -33.3%
   *   total 변화율   = (120-104)/104 × 100 = +15.4%
   */
  it("현재·이전 스냅샷 및 변화율이 올바르게 계산된다", async () => {
    mockEventGroupBy
      .mockResolvedValueOnce(eventRows([     // current
        { storeId: 1, eventType: "VIEW", count: 100 },
        { storeId: 1, eventType: "CALL", count: 20  },
      ]) as never)
      .mockResolvedValueOnce(eventRows([     // previous
        { storeId: 1, eventType: "VIEW", count: 80  },
        { storeId: 1, eventType: "CALL", count: 24  },
      ]) as never);

    const result = await getPeriodStats(...makeRange(30));

    // 현재 스냅샷
    expect(result.current.views).toBe(100);
    expect(result.current.actions).toBe(20);
    expect(result.current.conversionRate).toBe(20.0);
    expect(result.current.total).toBe(120);

    // 이전 스냅샷
    expect(result.previous.views).toBe(80);
    expect(result.previous.actions).toBe(24);
    expect(result.previous.conversionRate).toBe(30.0);

    // 변화율 (소수점 1자리)
    expect(result.changes.views).toBe(25.0);
    expect(result.changes.actions).toBe(-16.7);
    expect(result.changes.conversionRate).toBe(-33.3);
    expect(result.changes.total).toBe(15.4);
  });

  it("변화율은 소수점 1자리로 반올림된다", async () => {
    mockEventGroupBy
      .mockResolvedValueOnce(eventRows([
        { storeId: 1, eventType: "VIEW", count: 301 }, // 301/300 = 0.333...% → 0.3%
      ]) as never)
      .mockResolvedValueOnce(eventRows([
        { storeId: 1, eventType: "VIEW", count: 300 },
      ]) as never);

    const { changes } = await getPeriodStats(...makeRange());
    expect(changes.views).toBe(0.3); // Math.round(0.333 * 10) / 10
  });

  it("이전 기간이 0건이고 현재 > 0이면 +100% 반환", async () => {
    mockEventGroupBy
      .mockResolvedValueOnce(eventRows([{ storeId: 1, eventType: "VIEW", count: 50 }]) as never)
      .mockResolvedValueOnce([] as never);  // prev = empty

    const { changes } = await getPeriodStats(...makeRange());
    expect(changes.views).toBe(100);
  });

  it("이전·현재 모두 0건이면 변화율 0 반환", async () => {
    mockEventGroupBy
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    const { changes } = await getPeriodStats(...makeRange());
    expect(changes.views).toBe(0);
    expect(changes.conversionRate).toBe(0);
  });

  it("현재가 이전보다 적으면 음수 변화율 반환", async () => {
    mockEventGroupBy
      .mockResolvedValueOnce(eventRows([{ storeId: 1, eventType: "VIEW", count: 50 }]) as never)
      .mockResolvedValueOnce(eventRows([{ storeId: 1, eventType: "VIEW", count: 100 }]) as never);

    const { changes } = await getPeriodStats(...makeRange());
    expect(changes.views).toBe(-50.0);
  });

  it("CALL + MAP + RESERVATION이 모두 actions에 합산된다", async () => {
    mockEventGroupBy
      .mockResolvedValueOnce(eventRows([
        { storeId: 1, eventType: "VIEW",        count: 100 },
        { storeId: 1, eventType: "CALL",        count: 10  },
        { storeId: 1, eventType: "MAP",         count: 5   },
        { storeId: 1, eventType: "RESERVATION", count: 3   },
      ]) as never)
      .mockResolvedValueOnce([] as never);

    const { current } = await getPeriodStats(...makeRange());
    expect(current.actions).toBe(18);           // 10 + 5 + 3
    expect(current.conversionRate).toBe(18.0);  // 18/100
  });

  it("두 쿼리가 병렬로 호출된다 (각각 독립적인 createdAt 범위)", async () => {
    mockEventGroupBy.mockResolvedValue([] as never);

    await getPeriodStats(...makeRange(30));

    expect(mockEventGroupBy).toHaveBeenCalledTimes(2);
    const [call1, call2] = mockEventGroupBy.mock.calls;

    // 현재·이전 모두 gte + lt (명시적 구간)
    expect(call1[0].where).toMatchObject({
      createdAt: { gte: expect.any(Date), lt: expect.any(Date) },
    });
    expect(call2[0].where).toMatchObject({
      createdAt: { gte: expect.any(Date), lt: expect.any(Date) },
    });
  });
});
