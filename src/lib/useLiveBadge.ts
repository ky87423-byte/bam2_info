"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 모든 "숫자 배지" 공통 라이브 동기화 훅.
 *
 * 갱신 트리거 (서버 부하 거의 0 — 단일 indexed COUNT):
 *   1) 30초 백그라운드 폴링 (안전장치)
 *   2) window focus / visibilitychange (탭 복귀 시 즉시)
 *   3) BroadcastChannel("badge:<channel>")  (다른 탭에서 액션 시 cross-tab)
 *   4) CustomEvent("badge:<channel>")       (같은 탭 액션 즉시 — BroadcastChannel 은 sender 에게 안 옴)
 *
 * 사용:
 *   const { count } = useLiveBadge({ initial, fetchUrl, channel: "unread-msg" });
 *   // 액션 후 어디서든:
 *   notifyBadge("unread-msg");
 */

const POLL_MS = 30_000;

export interface LiveBadgeOpts {
  initial:  number;
  fetchUrl: string;       // GET → { count: number }
  channel:  string;       // 동기화 채널명 (예: "unread-msg", "points", "admin:msg-ack")
}

export function useLiveBadge({ initial, fetchUrl, channel }: LiveBadgeOpts) {
  const [count, setCount] = useState(initial);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(fetchUrl, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const next = typeof json.count === "number" ? json.count : 0;
      setCount(next);
    } catch { /* 네트워크 일시 오류 무시 */ }
  }, [fetchUrl]);

  // 1) 30초 폴링
  useEffect(() => {
    const t = setInterval(refetch, POLL_MS);
    return () => clearInterval(t);
  }, [refetch]);

  // 2) focus / visibilitychange → 즉시 갱신
  useEffect(() => {
    const onFocus = () => refetch();
    const onVis   = () => { if (document.visibilityState === "visible") refetch(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refetch]);

  // 3) BroadcastChannel — 다른 탭에서 notifyBadge() 호출 시 즉시 갱신
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(`badge:${channel}`);
    bc.onmessage = () => refetch();
    return () => bc.close();
  }, [channel, refetch]);

  // 4) 같은 탭 CustomEvent (BroadcastChannel 은 sender 본인에겐 안 와서 보완)
  useEffect(() => {
    const evt = `badge:${channel}`;
    const onCustom = () => refetch();
    window.addEventListener(evt, onCustom);
    return () => window.removeEventListener(evt, onCustom);
  }, [channel, refetch]);

  return { count, refetch };
}

/**
 * 채널 구독자 모두에게 "지금 다시 가져와" 알림.
 * server action 후 client 에서 호출 (예: action 결과 ok 면 호출).
 */
export function notifyBadge(channel: string): void {
  if (typeof window === "undefined") return;
  // cross-tab — BroadcastChannel 은 같은 origin 의 다른 탭에 도달
  if (typeof BroadcastChannel !== "undefined") {
    const bc = new BroadcastChannel(`badge:${channel}`);
    bc.postMessage("refresh");
    bc.close();
  }
  // same-tab — 본인 탭의 다른 컴포넌트 인스턴스에 도달 (BroadcastChannel 자체 폐쇄 정책 보완)
  window.dispatchEvent(new CustomEvent(`badge:${channel}`));
}
