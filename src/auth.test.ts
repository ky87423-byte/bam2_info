/**
 * NextAuth authorized 콜백 단위 테스트
 *
 * middleware.ts가 Edge에서 실행되므로 직접 호출 불가 →
 * authConfig.callbacks.authorized 함수를 추출해 순수 함수로 테스트합니다.
 */
import { describe, it, expect } from "vitest";
import { authConfig } from "@/auth.config";

// ── 타입 & 헬퍼 ──────────────────────────────────────────────────────────────

type Authorized = NonNullable<typeof authConfig.callbacks>["authorized"];
type AuthParam   = Parameters<NonNullable<Authorized>>[0];
type AuthResult  = ReturnType<NonNullable<Authorized>>;

const authorized = authConfig.callbacks!.authorized as (p: AuthParam) => AuthResult;

function makeRequest(pathname: string) {
  return { nextUrl: new URL(`http://localhost:3000${pathname}`) };
}

function makeSession(role: string) {
  return { user: { id: "1", name: "tester", role } } as AuthParam["auth"];
}

function expectRedirectTo(result: AuthResult, expectedPath: string) {
  expect(result).toBeInstanceOf(Response);
  const location = (result as Response).headers.get("location");
  expect(location).toBe(`http://localhost:3000${expectedPath}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. 비로그인 유저 — /admin 접근 시도
// ═════════════════════════════════════════════════════════════════════════════

describe("비로그인 유저 → /admin 차단", () => {
  it("/admin → false (NextAuth가 /login으로 리다이렉트)", () => {
    expect(authorized({ auth: null, request: makeRequest("/admin") })).toBe(false);
  });

  it("/admin/analytics → false", () => {
    expect(authorized({ auth: null, request: makeRequest("/admin/analytics") })).toBe(false);
  });

  it("/admin/users/42 → false", () => {
    expect(authorized({ auth: null, request: makeRequest("/admin/users/42") })).toBe(false);
  });

  it("/admin/shops → false", () => {
    expect(authorized({ auth: null, request: makeRequest("/admin/shops") })).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. 일반 유저 (role: user) — /admin 접근 시도 → 홈으로 리다이렉트
// ═════════════════════════════════════════════════════════════════════════════

describe("일반 유저(role: user) → /admin → 홈 리다이렉트", () => {
  const auth = makeSession("user");

  it("/admin → Response.redirect('/')", () => {
    expectRedirectTo(authorized({ auth, request: makeRequest("/admin") }), "/");
  });

  it("/admin/analytics → Response.redirect('/')", () => {
    expectRedirectTo(authorized({ auth, request: makeRequest("/admin/analytics") }), "/");
  });

  it("/admin/users → Response.redirect('/')", () => {
    expectRedirectTo(authorized({ auth, request: makeRequest("/admin/users") }), "/");
  });

  it("/admin/settings → Response.redirect('/')", () => {
    expectRedirectTo(authorized({ auth, request: makeRequest("/admin/settings") }), "/");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. 업소 유저 (role: shop) — /admin 접근 시도 → 홈으로 리다이렉트
// ═════════════════════════════════════════════════════════════════════════════

describe("업소 유저(role: shop) → /admin → 홈 리다이렉트", () => {
  const auth = makeSession("shop");

  it("/admin → Response.redirect('/')", () => {
    expectRedirectTo(authorized({ auth, request: makeRequest("/admin") }), "/");
  });

  it("/admin/analytics → Response.redirect('/')", () => {
    expectRedirectTo(authorized({ auth, request: makeRequest("/admin/analytics") }), "/");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. 관리자 (role: admin) — /admin 접근 허용
// ═════════════════════════════════════════════════════════════════════════════

describe("관리자(role: admin) → /admin 접근 허용", () => {
  const auth = makeSession("admin");

  it("/admin → true", () => {
    expect(authorized({ auth, request: makeRequest("/admin") })).toBe(true);
  });

  it("/admin/analytics → true", () => {
    expect(authorized({ auth, request: makeRequest("/admin/analytics") })).toBe(true);
  });

  it("/admin/users/42 → true", () => {
    expect(authorized({ auth, request: makeRequest("/admin/users/42") })).toBe(true);
  });

  it("/admin/shops → true", () => {
    expect(authorized({ auth, request: makeRequest("/admin/shops") })).toBe(true);
  });

  it("/admin/coupons → true", () => {
    expect(authorized({ auth, request: makeRequest("/admin/coupons") })).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. /shop 경로 보호
// ═════════════════════════════════════════════════════════════════════════════

describe("/shop 경로 보호", () => {
  it("비로그인 → /shop → false", () => {
    expect(authorized({ auth: null, request: makeRequest("/shop") })).toBe(false);
  });

  it("일반 유저(user) → /shop → 홈 리다이렉트", () => {
    expectRedirectTo(
      authorized({ auth: makeSession("user"), request: makeRequest("/shop") }),
      "/"
    );
  });

  it("업소 유저(shop) → /shop → true", () => {
    expect(authorized({ auth: makeSession("shop"), request: makeRequest("/shop") })).toBe(true);
  });

  it("관리자(admin) → /shop → true", () => {
    expect(authorized({ auth: makeSession("admin"), request: makeRequest("/shop") })).toBe(true);
  });

  it("업소 유저(shop) → /shop/dashboard → true", () => {
    expect(authorized({ auth: makeSession("shop"), request: makeRequest("/shop/dashboard") })).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. 공개 경로 — 누구나 접근 가능
// ═════════════════════════════════════════════════════════════════════════════

describe("공개 경로 — 항상 true", () => {
  it("비로그인 → / → true", () => {
    expect(authorized({ auth: null, request: makeRequest("/") })).toBe(true);
  });

  it("비로그인 → /login → true", () => {
    expect(authorized({ auth: null, request: makeRequest("/login") })).toBe(true);
  });

  it("비로그인 → /coupons → true", () => {
    expect(authorized({ auth: null, request: makeRequest("/coupons") })).toBe(true);
  });

  it("일반 유저 → / → true", () => {
    expect(authorized({ auth: makeSession("user"), request: makeRequest("/") })).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. /mypage 보호
// ═════════════════════════════════════════════════════════════════════════════

describe("/mypage 보호", () => {
  it("비로그인 → /mypage → false", () => {
    expect(authorized({ auth: null, request: makeRequest("/mypage") })).toBe(false);
  });

  it("로그인 → /mypage → true", () => {
    expect(authorized({ auth: makeSession("user"), request: makeRequest("/mypage") })).toBe(true);
  });
});
