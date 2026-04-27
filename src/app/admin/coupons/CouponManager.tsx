"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actionCreateCoupon, actionUpdateCoupon, actionDeleteCoupon,
  actionToggleCouponActive, actionSaveMenuVisibility,
} from "@/lib/actions/coupon";
import type { CouponData, UserData } from "@/lib/data";
import { Plus, Pencil, Trash2, Tag, X, Ticket, Globe, EyeOff } from "lucide-react";

type Tab = "coupon" | "event";

interface Props {
  initialCoupons: CouponData[];
  shopUsers: UserData[];
  menuCouponVisible: boolean;
  menuEventVisible: boolean;
}

export default function CouponManager({ initialCoupons, shopUsers, menuCouponVisible, menuEventVisible }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("coupon");
  const [editing, setEditing] = useState<CouponData | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [couponVisible, setCouponVisible] = useState(menuCouponVisible);
  const [eventVisible, setEventVisible]   = useState(menuEventVisible);

  const items = initialCoupons.filter((c) => (c.type ?? "coupon") === tab);

  const handleCreate = (formData: FormData) => {
    startTransition(async () => {
      const r = await actionCreateCoupon(formData);
      if (r?.error) { alert(r.error); return; }
      router.refresh();
      setShowNew(false);
    });
  };

  const handleUpdate = (formData: FormData) => {
    startTransition(async () => {
      const r = await actionUpdateCoupon(formData);
      if (r?.error) { alert(r.error); return; }
      router.refresh();
      setEditing(null);
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`"${title}"을(를) 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      await actionDeleteCoupon(id);
      router.refresh();
    });
  };

  const handleToggleActive = (coupon: CouponData) => {
    startTransition(async () => {
      await actionToggleCouponActive(coupon.id, !coupon.isActive);
      router.refresh();
    });
  };

  const handleMenuToggle = (type: Tab) => {
    const nextCoupon = type === "coupon" ? !couponVisible : couponVisible;
    const nextEvent  = type === "event"  ? !eventVisible  : eventVisible;
    if (type === "coupon") setCouponVisible(nextCoupon);
    else setEventVisible(nextEvent);
    startTransition(async () => {
      await actionSaveMenuVisibility(nextCoupon, nextEvent);
    });
  };

  const isMenuVisible = tab === "coupon" ? couponVisible : eventVisible;
  const tabLabel      = tab === "coupon" ? "쿠폰" : "이벤트";

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">쿠폰 / 이벤트 관리</h2>
        <button
          onClick={() => { setShowNew(!showNew); setEditing(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          <Plus size={14} />
          {tabLabel} 추가
        </button>
      </div>

      {/* 탭 + 메뉴 ON/OFF */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(["coupon", "event"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setShowNew(false); setEditing(null); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "coupon" ? <Tag size={13} /> : <Ticket size={13} />}
              {t === "coupon" ? "쿠폰" : "이벤트"}
              <span className="text-xs text-gray-400">
                ({initialCoupons.filter((c) => (c.type ?? "coupon") === t).length})
              </span>
            </button>
          ))}
        </div>

        {/* 웹사이트 메뉴 노출 토글 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">웹사이트 {tabLabel} 메뉴</span>
          <button
            onClick={() => handleMenuToggle(tab)}
            disabled={pending}
            title={isMenuVisible ? "클릭하면 메뉴 숨김" : "클릭하면 메뉴 표시"}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
              isMenuVisible ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
              isMenuVisible ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
          <span className={`flex items-center gap-1 text-xs font-medium ${isMenuVisible ? "text-green-600" : "text-gray-400"}`}>
            {isMenuVisible ? <><Globe size={12} /> ON</> : <><EyeOff size={12} /> OFF</>}
          </span>
        </div>
      </div>

      {/* OFF 안내 배너 */}
      {!isMenuVisible && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2.5 rounded-lg mb-4">
          <EyeOff size={13} />
          웹사이트 / 모바일에서 <strong>{tabLabel}</strong> 메뉴가 숨겨져 있습니다. 토글을 켜면 다시 노출됩니다.
        </div>
      )}

      {/* 새 항목 폼 */}
      {showNew && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">{tabLabel} 추가</h3>
            <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <CouponForm type={tab} onSubmit={handleCreate} pending={pending} shopUsers={shopUsers} />
        </div>
      )}

      {/* 수정 폼 */}
      {editing && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">{tabLabel} 수정</h3>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <CouponForm type={tab} coupon={editing} onSubmit={handleUpdate} pending={pending} shopUsers={shopUsers} />
        </div>
      )}

      {/* 목록 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {items.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left">
                <th className="px-4 py-3 text-gray-500 font-medium">제목</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-28 text-center">할인/혜택</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-28">업소</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-24">유효기간</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-20 text-center">노출</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-20 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((coupon) => (
                <tr key={coupon.id} className={`hover:bg-gray-50 transition-colors ${!coupon.isActive ? "bg-gray-50/60" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {tab === "coupon"
                        ? <Tag size={13} className={coupon.isActive ? "text-green-500 shrink-0" : "text-gray-300 shrink-0"} />
                        : <Ticket size={13} className={coupon.isActive ? "text-blue-500 shrink-0" : "text-gray-300 shrink-0"} />
                      }
                      <div>
                        <p className={`font-medium ${coupon.isActive ? "text-gray-800" : "text-gray-400"}`}>{coupon.title}</p>
                        <p className="text-xs text-gray-400 truncate max-w-xs">{coupon.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold ${coupon.isActive ? "text-green-600" : "text-gray-400"}`}>
                      {coupon.discount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{coupon.shopName || "전체"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{coupon.validUntil || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(coupon)}
                      disabled={pending}
                      title={coupon.isActive ? "OFF로 전환 (미노출)" : "ON으로 전환 (노출)"}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
                        coupon.isActive ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        coupon.isActive ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                    <p className={`text-[10px] mt-0.5 ${coupon.isActive ? "text-green-600" : "text-gray-400"}`}>
                      {coupon.isActive ? "ON" : "OFF"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setEditing(coupon); setShowNew(false); }}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id, coupon.title)}
                        disabled={pending}
                        className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p>등록된 {tabLabel}이 없습니다.</p>
            <p className="text-xs mt-1">위 버튼을 눌러 추가하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CouponForm({
  type, coupon, onSubmit, pending, shopUsers,
}: {
  type: Tab;
  coupon?: CouponData;
  onSubmit: (fd: FormData) => void;
  pending: boolean;
  shopUsers: UserData[];
}) {
  return (
    <form action={onSubmit} className="space-y-3">
      {coupon && <input type="hidden" name="id" value={coupon.id} />}
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">제목</label>
          <input type="text" name="title" defaultValue={coupon?.title} required
            placeholder={type === "coupon" ? "예: 신규 가입 특별 할인" : "예: 봄맞이 이벤트"}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        {type === "coupon" ? (
          <div>
            <label className="text-xs text-gray-500 block mb-1">쿠폰 종류</label>
            <select name="couponType" defaultValue={coupon?.couponType ?? "DISCOUNT"} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
              <option value="ORIGINAL_PRICE">원가권 (ORIGINAL_PRICE)</option>
              <option value="FREE">무료권 (FREE)</option>
              <option value="DISCOUNT">할인권 (DISCOUNT)</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="text-xs text-gray-500 block mb-1">할인 / 혜택</label>
            <input type="text" name="discount" defaultValue={coupon?.discount} required
              placeholder="예: 10% 할인 / 무료 체험"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
        )}
        {type === "coupon" && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">할인 금액 (원)</label>
            <input type="number" name="discountAmount" defaultValue={coupon?.discountAmount ?? ""}
              min={1000} max={1_000_000} step={1000}
              placeholder="DISCOUNT 일 때만 입력 (1,000 ~ 1,000,000)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            <p className="text-[11px] text-gray-400 mt-1">원가권/무료권은 비워둬도 됩니다.</p>
          </div>
        )}
        <div>
          <label className="text-xs text-gray-500 block mb-1">담당 업소회원</label>
          <select name="ownerUserId" defaultValue={coupon?.ownerUserId?.toString() ?? ""}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
            <option value="">전체 (관리자)</option>
            {shopUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.nickname} ({u.username})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">대상 업소명</label>
          <input type="text" name="shopName" defaultValue={coupon?.shopName}
            placeholder="비워두면 전체 적용"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">유효기간</label>
          <input type="date" name="validUntil" defaultValue={coupon?.validUntil}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        {type === "coupon" && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">발급 수량 (0 = 무제한)</label>
            <input type="number" name="maxIssue" defaultValue={coupon?.maxIssue ?? 0} min={0}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
        )}
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">설명</label>
        <textarea name="description" defaultValue={coupon?.description} rows={2}
          placeholder="상세 설명"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="isActive" defaultChecked={coupon?.isActive ?? true}
            className="w-4 h-4 accent-green-500" />
          <span className="text-sm text-gray-700">즉시 활성화 (웹사이트 노출)</span>
        </label>
        <button type="submit" disabled={pending}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50">
          {pending ? "저장 중..." : coupon ? "수정" : "추가"}
        </button>
      </div>
    </form>
  );
}
