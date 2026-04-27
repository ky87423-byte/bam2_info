import fs from "fs";
import path from "path";

/**
 * 통합 view counting — namespace 별로 (shop / anonymous / shop_only / promotion ...)
 *
 *  IP dedup: 같은 (namespace + id + ip) 은 1시간 동안 1회만 카운트
 *  파일 저장: data/view_counts.json — { ns: { id: count } }
 *  Flush 정책: dirty 시 5초 debounce + 페이지 종료 직전 (process.beforeExit)
 *
 *  사용:
 *    incrementView("shop", shopId, ip)         // 페이지 진입 시
 *    getViewCount("shop", shopId)              // 현재 카운트
 *    getViewCounts("shop")                     // namespace 전체 (목록 enrich 용)
 */

const VIEWS_FILE = path.join(process.cwd(), "data", "view_counts.json");
const DEDUP_TTL_MS = 5 * 60 * 1000;         // 5분 — 어뷰징 차단 + 정상 사용자 카운트 갱신 균형
const FLUSH_DEBOUNCE_MS = 5_000;

type Counts = Record<string, Record<string, number>>;

let _store:   Counts | null = null;
let _dirty:   boolean = false;
let _flushTimer: ReturnType<typeof setTimeout> | null = null;

// in-memory IP dedup — Map<key, lastSeenMs>
const _dedup = new Map<string, number>();

function load(): Counts {
  if (_store) return _store;
  try {
    _store = JSON.parse(fs.readFileSync(VIEWS_FILE, "utf-8"));
  } catch {
    _store = {};
  }
  return _store!;
}

function flush() {
  if (!_dirty) return;
  try {
    fs.mkdirSync(path.dirname(VIEWS_FILE), { recursive: true });
    fs.writeFileSync(VIEWS_FILE, JSON.stringify(_store, null, 2));
    _dirty = false;
  } catch { /* best-effort */ }
}

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => { flush(); _flushTimer = null; }, FLUSH_DEBOUNCE_MS);
}

// 종료 직전에도 한 번 더 (개발 서버 재시작 등)
if (typeof process !== "undefined" && !(globalThis as { __viewTrackerHook?: boolean }).__viewTrackerHook) {
  process.on("beforeExit", flush);
  (globalThis as { __viewTrackerHook?: boolean }).__viewTrackerHook = true;
}

/**
 * IP+namespace+id 가 1시간 내 이미 카운트됐는지 검사. 미카운트면 true 반환 + dedup 등록.
 * 외부에서 직접 사용 가능 (DB increment 전 IP dedup 만 활용하고 싶을 때).
 */
export function shouldCount(key: string): boolean {
  const now = Date.now();
  // 가벼운 GC — 1% 확률로 stale 항목 정리
  if (Math.random() < 0.01) {
    for (const [k, t] of _dedup) {
      if (now - t > DEDUP_TTL_MS) _dedup.delete(k);
    }
  }
  const last = _dedup.get(key);
  if (last !== undefined && now - last < DEDUP_TTL_MS) return false;
  _dedup.set(key, now);
  return true;
}

/** 페이지 진입 시 호출 — 1시간 IP dedup 후 +1. 표시용 카운트는 file-based. */
export function incrementView(namespace: string, id: number | string, ip: string): boolean {
  if (!shouldCount(`${namespace}:${id}:${ip}`)) return false;
  const all = load();
  if (!all[namespace]) all[namespace] = {};
  const k = String(id);
  all[namespace][k] = (all[namespace][k] ?? 0) + 1;
  _dirty = true;
  scheduleFlush();
  return true;
}

/** 단건 조회 */
export function getViewCount(namespace: string, id: number | string): number {
  return load()[namespace]?.[String(id)] ?? 0;
}

/** namespace 전체 — 목록 페이지에서 한 번 호출 후 enrich */
export function getViewCounts(namespace: string): Record<string, number> {
  return load()[namespace] ?? {};
}
