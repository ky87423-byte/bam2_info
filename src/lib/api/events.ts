import { prisma } from "@/lib/prisma";
import { EventType } from "@/generated/prisma/enums";

export type { EventType };

export interface RecordEventInput {
  storeId: number;
  eventType: EventType;
  ipAddress: string;
}

export interface RecordedEvent {
  id: number;
  storeId: number;
  eventType: EventType;
  ipAddress: string;
  createdAt: Date;
}

/** X-Forwarded-For, X-Real-IP 순으로 IP 추출 */
export function extractIpFromHeaders(headers: Headers | Record<string, string | null>): string {
  const get = (k: string) =>
    typeof (headers as Headers).get === "function"
      ? (headers as Headers).get(k)
      : (headers as Record<string, string | null>)[k];

  const forwarded = get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

/** 이벤트 타입 유효성 검사 */
export function isValidEventType(value: unknown): value is EventType {
  return Object.values(EventType).includes(value as EventType);
}

/**
 * AnalyticsEvent 레코드를 DB에 저장합니다.
 * storeId·eventType·ipAddress 유효성 검사 후 INSERT.
 */
export async function recordAnalyticsEvent(input: RecordEventInput): Promise<RecordedEvent> {
  const { storeId, eventType, ipAddress } = input;

  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw new Error("Invalid storeId");
  }
  if (!isValidEventType(eventType)) {
    throw new Error(`Invalid eventType: ${eventType}`);
  }
  if (!ipAddress || typeof ipAddress !== "string") {
    throw new Error("Missing ipAddress");
  }

  return prisma.analyticsEvent.create({
    data: { storeId, eventType, ipAddress },
    select: { id: true, storeId: true, eventType: true, ipAddress: true, createdAt: true },
  }) as Promise<RecordedEvent>;
}
