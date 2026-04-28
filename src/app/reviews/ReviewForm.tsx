"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, ImagePlus, X, Loader2, Lock, ShieldCheck } from "lucide-react";
import {
  actionCreateReview, actionCreateCertifiedReview, actionUpdateReview,
} from "@/lib/actions/review";
import type { ReviewData } from "@/lib/data";

const MAX_PHOTOS = 30;

type Mode = "general" | "certified" | "edit";

interface Props {
  mode: Mode;
  fixedShopName?: string;       // certified 모드에서 고정
  fixedBizType?: string;        // certified 모드에서 고정
  userCouponId?: number | null;
  bizTypes: string[];
  tagPresets: string[];
  defaultValues?: Partial<ReviewData>;
}

export default function ReviewForm({
  mode, fixedShopName = "", fixedBizType = "", userCouponId,
  bizTypes, tagPresets, defaultValues = {},
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError]     = useState("");
  const [photos, setPhotos]   = useState<string[]>(defaultValues.photos ?? []);
  const [mainPhoto, setMain]  = useState<string>(defaultValues.mainPhoto ?? "");
  const [uploading, setUp]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tags, setTags] = useState<string[]>(defaultValues.tags ?? []);
  const [rFac, setRFac] = useState(defaultValues.ratingFacility ?? 5);
  const [rSrv, setRSrv] = useState(defaultValues.ratingService  ?? 5);
  const [rPri, setRPri] = useState(defaultValues.ratingPrice    ?? 5);

  const isCertified = mode === "certified";
  const isEdit      = mode === "edit";
  const lockShop    = isCertified || (isEdit && defaultValues.isCertified);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, remaining);
    if (!toUpload.length) return;

    setUp(true);
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
    if (!mainPhoto && next.length) setMain(next[0]);
    setUp(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto(url: string) {
    const next = photos.filter((p) => p !== url);
    setPhotos(next);
    if (mainPhoto === url) setMain(next[0] ?? "");
  }

  function toggleTag(tag: string) {
    setTags((cur) => cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag].slice(0, 10));
  }

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      let res: { ok?: boolean; id?: number; error?: string } | undefined;
      if (isEdit) {
        res = await actionUpdateReview(formData);
      } else if (isCertified) {
        res = await actionCreateCertifiedReview(formData);
      } else {
        res = await actionCreateReview(formData);
      }
      if (res?.error) { setError(res.error); return; }
      const id = res?.id ?? defaultValues.id;
      router.push(id ? `/reviews/${id}` : "/reviews");
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="space-y-5">
      {isEdit && defaultValues.id && <input type="hidden" name="id" value={defaultValues.id} />}
      {isCertified && userCouponId && <input type="hidden" name="userCouponId" value={userCouponId} />}
      <input type="hidden" name="photos"    value={JSON.stringify(photos)} />
      <input type="hidden" name="mainPhoto" value={mainPhoto} />
      <input type="hidden" name="ratingFacility" value={rFac} />
      <input type="hidden" name="ratingService"  value={rSrv} />
      <input type="hidden" name="ratingPrice"    value={rPri} />

      {/* 업소명 / 업종 */}
      <Section title="업소 정보">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/60 block mb-1 flex items-center gap-1">
              업소명 {lockShop && <Lock size={10} className="text-yellow-400" />}
            </label>
            <input
              type="text" name="shopName"
              defaultValue={lockShop ? fixedShopName || defaultValues.shopName : defaultValues.shopName}
              required maxLength={80}
              readOnly={lockShop}
              placeholder="방문하신 업소명"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                lockShop
                  ? "bg-yellow-400/10 border-yellow-400/40 text-yellow-200 cursor-not-allowed"
                  : "bg-white/5 border-white/10 text-white focus:border-yellow-400"
              }`}
            />
          </div>
          <div>
            <label className="text-xs text-white/60 block mb-1 flex items-center gap-1">
              업종 (말머리) {lockShop && <Lock size={10} className="text-yellow-400" />}
            </label>
            {lockShop ? (
              <>
                <input type="hidden" name="bizType" value={fixedBizType || defaultValues.bizType || ""} />
                <input
                  type="text" readOnly
                  value={fixedBizType || defaultValues.bizType || ""}
                  className="w-full bg-yellow-400/10 border border-yellow-400/40 text-yellow-200 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
                />
              </>
            ) : (
              <select
                name="bizType" defaultValue={defaultValues.bizType ?? ""} required
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
              >
                <option value="" disabled>업종 선택</option>
                {bizTypes.map((b) => <option key={b} value={b} className="bg-[#1a1a2e]">{b}</option>)}
              </select>
            )}
          </div>
        </div>
        {isCertified && (
          <p className="mt-2 text-[11px] text-yellow-400/80 flex items-center gap-1">
            <ShieldCheck size={11} /> 사용 확인된 쿠폰 정보로 자동 입력되었습니다.
          </p>
        )}
      </Section>

      {/* 제목 + 본문 */}
      <Section title="후기">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/60 block mb-1">제목</label>
            <input
              type="text" name="title" required maxLength={80}
              defaultValue={defaultValues.title}
              placeholder="예: 친절하고 깔끔한 매장입니다"
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 block mb-1">본문</label>
            <textarea
              name="content" required rows={8} maxLength={5000}
              defaultValue={defaultValues.content}
              placeholder="실제 경험을 자세히 적어주세요. (10자 이상)"
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-y"
            />
          </div>
        </div>
      </Section>

      {/* 별점 — 3축 */}
      <Section title="상세 평가">
        <div className="space-y-3">
          <RatingRow label="시설"   value={rFac} onChange={setRFac} />
          <RatingRow label="서비스" value={rSrv} onChange={setRSrv} />
          <RatingRow label="가격"   value={rPri} onChange={setRPri} />
        </div>
      </Section>

      {/* 태그 */}
      <Section title="태그 (선택, 최대 10개)">
        <div className="flex flex-wrap gap-2">
          {tagPresets.map((t) => {
            const active = tags.includes(t);
            return (
              <label key={t}
                className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
                  active
                    ? "bg-yellow-400 text-[#1a1a2e] border-yellow-400"
                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                }`}
              >
                <input
                  type="checkbox" name="tags" value={t} checked={active}
                  onChange={() => toggleTag(t)}
                  className="sr-only"
                />
                #{t}
              </label>
            );
          })}
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
                      <Star size={10} className="text-[#1a1a2e] fill-[#1a1a2e]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                    <button type="button" onClick={() => setMain(url)}
                      className="p-1 bg-yellow-400 rounded-full text-[#1a1a2e] hover:bg-yellow-300">
                      <Star size={11} />
                    </button>
                    <button type="button" onClick={() => removePhoto(url)}
                      className="p-1 bg-red-500 rounded-full text-white hover:bg-red-600">
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {photos.length < MAX_PHOTOS && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" multiple
                onChange={handleFileChange} className="hidden" id="reviewPhotoInput" />
              <label
                htmlFor="reviewPhotoInput"
                className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-white/20 rounded-lg text-sm text-white/60 cursor-pointer hover:border-yellow-400 hover:text-yellow-400 transition-colors w-fit ${uploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                {uploading ? "업로드 중..." : `사진 추가 (최대 ${MAX_PHOTOS}장)`}
              </label>
            </div>
          )}
        </div>
      </Section>

      {error && (
        <div className="bg-red-500/15 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={() => router.push("/reviews")}
          className="px-5 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">
          취소
        </button>
        <button type="submit" disabled={pending || uploading}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
            isCertified
              ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-[#1a1a2e] hover:shadow-lg"
              : "bg-yellow-400 text-[#1a1a2e] hover:bg-yellow-300"
          }`}>
          {pending ? "저장 중..." : isEdit ? "수정 완료" : isCertified ? "인증 후기 등록" : "후기 등록"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="font-bold text-white/80 mb-4 pb-2 border-b border-white/10 text-sm">{title}</h3>
      {children}
    </div>
  );
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/70 w-14 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i} type="button" onClick={() => onChange(i)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              size={20}
              className={i <= value ? "fill-yellow-400 text-yellow-400" : "text-white/20 hover:text-white/40"}
            />
          </button>
        ))}
      </div>
      <span className="text-sm font-bold text-yellow-400 ml-2">{value}.0</span>
    </div>
  );
}
