import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsEvent, extractIpFromHeaders, isValidEventType } from "@/lib/api/events";
import { EventType } from "@/generated/prisma/enums";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { storeId, eventType } = body as Record<string, unknown>;

  if (typeof storeId !== "number" || !isValidEventType(eventType)) {
    return NextResponse.json(
      { error: "storeId(number)와 eventType(VIEW|CALL|MAP|RESERVATION)이 필요합니다." },
      { status: 400 }
    );
  }

  const ipAddress = extractIpFromHeaders(req.headers);

  try {
    const event = await recordAnalyticsEvent({
      storeId,
      eventType: eventType as EventType,
      ipAddress,
    });
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.startsWith("Invalid") || message.startsWith("Missing") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
