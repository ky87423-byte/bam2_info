"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, Loader2, Star } from "lucide-react";
import { actionShopCreateCoupon, actionShopUpdateCoupon } from "@/lib/actions/coupon";
import type { CouponData } from "@/lib/data";

const MAX_PHOTOS = 30;

interface Props {
  coupon?:   CouponData;
  areas:     string[];
  bizTypes:  string[];
}

export default function ShopCouponForm({ coupon, areas, bizTypes }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [couponType, setCouponType] = useState<"ORIGINAL_PRICE" | "FREE" | "DISCOUNT">(
    coupon?.couponType ?? "DISCOUNT",
  );
  const [photos, setPhotos]       = useState<string[]>(coupon?.photos ?? []);
  const [mainPhoto, setMainPhoto] = useState<string>(coupon?.mainPhoto ?? "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const isEdit = !!coupon;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, remaining);
    if (!toUpload.length) return;

    setUploading(true);
    const urls: string[] = [];
    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) urls.push(json.url);
    }
    const next = [...photos, ...urls];
    setPhotos(next);
    if (!mainPhoto && next.length) setMainPhoto(next[0]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(url: string) {
    const next = photos.filter((p) => p !== url);
    setPhotos(next);
    if (mainPhoto === url) setMainPhoto(next[0] ?? "");
  }

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const r = isEdit
        ? await actionShopUpdateCoupon(formData)
        : await actionShopCreateCoupon(formData);
      if (r?.error) { setError(r.error); return; }
      router.push("/shop/coupons");
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6 max-w-3xl">
      {coupon && <input type="hidden" name="id" value={coupon.id} />}
      <input type="hidden" name="photos"    value={JSON.stringify(photos)} />
      <input type="hidden" name="mainPhoto" value={mainPhoto} />

      {/* 기본 정보 */}
      <Section title="기본 정보">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">제목 <span className="text-red-500">*</span></label>
            <input
              type="text" name="title" defaultValue={coupon?.title} required maxLength={80}
              placeholder="예: 첫 방문 손님 30,000원 할인 쿠폰"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">홍보 본문</label>
            <textarea
              name="description" defaultValue={coupon?.description} rows={8} maxLength={5000}
              placeholder="업소 소개, 쿠폰 사용 조건, 위치 안내, 영업시간 등 자유롭게 작성하세요. 줄바꿈도 그대로 표시됩니다."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-y"
            />
          </div>
        </div>
      </Section>

      {/* 쿠폰 종류 */}
      <Section title="쿠폰 설정">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">쿠폰 종류 <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {(["ORIGINAL_PRICE", "FREE", "DISCOUNT"] as const).map((t) => (
                <label
                  key={t}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                    couponType === t
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio" name="couponType" value={t}
                    checked={couponType === t} onChange={() => setCouponType(t)}
                    className="sr-only"
                  />
                  {t === "ORIGINAL_PRICE" && "원가권"}
                  {t === "FREE" && "무료권"}
                  {t === "DISCOUNT" && "할인권"}
                </label>
              ))}
            </div>
          </div>

          {couponType === "DISCOUNT" && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">할인 금액 (원) <span className="text-red-500">*</span></label>
              <input
                type="number" name="discountAmount" defaultValue={coupon?.discountAmount ?? 10000}
                min={1000} max={1_000_000} step={1000} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              <p className="text-[11px] text-gray-400 mt-1">1,000원 ~ 1,000,000원</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">발급 수량 (선착순)</label>
              <input
                type="number" name="maxIssue" defaultValue={coupon?.maxIssue ?? 0} min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              <p className="text-[11px] text-gray-400 mt-1">0 = 무제한</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">유효기간</label>
              <input
                type="date" name="validUntil" defaultValue={coupon?.validUntil}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* 지역 / 업종 */}
      <Section title="지역 / 업종">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">지역</label>
            <select name="area" defaultValue={coupon?.area ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
            >
              <option value="">지역 선택</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">업종</label>
            <select name="bizType" defaultValue={coupon?.bizType ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
            >
              <option value="">업종 선택</option>
              {bizTypes.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">대상 업소명 (표시용)</label>
            <input
              type="text" name="shopName" defaultValue={coupon?.shopName}
              placeholder="비워두면 표시 안 됨"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </Section>

      {/* 사진 */}
      <Section title={`사진 (${photos.length}/${MAX_PHOTOS})`}>
        <div className="space-y-3">
          {photos.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {photos.map((url) => (
                <div key={url} className="relative group aspect-square">
                  <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                  {mainPhoto === url && (
                    <div className="absolute top-1 left-1 bg-yellow-400 rounded-full p-0.5">
                      <Star size={10} className="text-white fill-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                    <button
                      type="button" onClick={() => setMainPhoto(url)} title="대표사진 설정"
                      className="p-1 bg-yellow-400 rounded-full text-white hover:bg-yellow-500"
                    >
                      <Star size={11} />
                    </button>
                    <button
                      type="button" onClick={() => removePhoto(url)}
                      className="p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {photos.length < MAX_PHOTOS && (
            <div>
              <input
                ref={fileInputRef} type="file" accept="image/*" multiple
                onChange={handleFileChange} className="hidden" id="couponPhotoInput"
              />
              <label
                htmlFor="couponPhotoInput"
                className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-colors w-fit ${uploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                {uploading ? "업로드 중..." : `사진 추가 (최대 ${MAX_PHOTOS}장)`}
              </label>
              <p className="text-xs text-gray-400 mt-1.5">JPG · PNG · WebP — ★ 버튼으로 대표사진 설정</p>
            </div>
          )}
        </div>
      </Section>

      <Section title="노출">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox" name="isActive" defaultChecked={coupon?.isActive ?? true}
            className="w-4 h-4 accent-green-500"
          />
          <span className="text-sm text-gray-700">즉시 활성화 (쿠폰 게시판에 노출)</span>
        </label>
      </Section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button" onClick={() => router.push("/shop/coupons")}
          className="px-5 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
        >
          취소
        </button>
        <button
          type="submit" disabled={pending || uploading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {pending ? "저장 중..." : isEdit ? "수정" : "등록"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b text-sm">{title}</h3>
      {children}
    </div>
  );
}
