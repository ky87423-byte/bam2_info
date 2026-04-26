"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, Loader2, Star } from "lucide-react";
import type { ShopPost } from "@/lib/data";

const MAX_PHOTOS = 30;

const CATEGORIES = [
  "술집", "나이트클럽", "단란주점", "룸살롱", "노래방",
  "클럽", "헌팅포차", "풀살롱", "바", "유흥주점", "기타",
];

interface Props {
  areas: string[];
  action: (prev: unknown, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  defaultValues?: Partial<ShopPost>;
  submitLabel?: string;
}

export default function ShopPostForm({ areas, action, defaultValues = {}, submitLabel = "제출 (승인 요청)" }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(defaultValues.photos ?? []);
  const [mainPhoto, setMainPhoto] = useState(defaultValues.mainPhoto ?? "");
  const [uploading, setUploading] = useState(false);
  const [timeFull, setTimeFull] = useState(defaultValues.timeFull ?? false);

  if ((state as { success?: boolean } | null)?.success) {
    router.push("/shop/dashboard");
    return null;
  }

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

  return (
    <form action={formAction} className="space-y-6">
      {defaultValues.id && <input type="hidden" name="postId" value={defaultValues.id} />}
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />
      <input type="hidden" name="mainPhoto" value={mainPhoto} />

      {(state as { error?: string } | null)?.error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
          {(state as { error: string }).error}
        </div>
      )}

      {/* 기본 정보 */}
      <Section title="기본 정보">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="업소명" name="company" defaultValue={defaultValues.company} required placeholder="업소명 (필수)" />
          <Field label="슬로건 / 제목" name="subject" defaultValue={defaultValues.subject} placeholder="예: 24시간 영업, 신규 오픈" />
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">소개글</label>
            <textarea
              name="content"
              defaultValue={defaultValues.content}
              rows={4}
              placeholder="업소 소개, 서비스 안내 등"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>
      </Section>

      {/* 지역 / 업종 */}
      <Section title="지역 / 업종">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">지역</label>
            <select name="area" defaultValue={defaultValues.area ?? ""} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
              <option value="">지역 선택</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">업종</label>
            <select name="category" defaultValue={defaultValues.category ?? ""} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
              <option value="">업종 선택</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="세부 업종" name="category2" defaultValue={defaultValues.category2} placeholder="예: 풀클럽, 가라오케" />
        </div>
      </Section>

      {/* 연락처 */}
      <Section title="연락처">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="전화번호" name="phone" defaultValue={defaultValues.phone} placeholder="02-0000-0000" />
          <Field label="휴대폰" name="hphone" defaultValue={defaultValues.hphone} placeholder="010-0000-0000" />
          <Field label="텔레그램" name="telegram" defaultValue={defaultValues.telegram} placeholder="@username" />
        </div>
      </Section>

      {/* 영업시간 / 가격 */}
      <Section title="영업시간 / 가격">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 flex gap-3 items-end">
            <Field label="오픈 시간" name="time1" defaultValue={defaultValues.time1} placeholder="18:00" />
            <Field label="마감 시간" name="time2" defaultValue={defaultValues.time2} placeholder="06:00" />
            <div className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                id="timeFull"
                name="timeFull"
                checked={timeFull}
                onChange={(e) => setTimeFull(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <label htmlFor="timeFull" className="text-sm text-gray-600 whitespace-nowrap">24시간</label>
            </div>
          </div>
          <Field label="가격 (원)" name="price" type="number" defaultValue={defaultValues.price?.toString()} placeholder="0" />
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
                      type="button"
                      onClick={() => setMainPhoto(url)}
                      title="대표사진 설정"
                      className="p-1 bg-yellow-400 rounded-full text-white hover:bg-yellow-500"
                    >
                      <Star size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
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
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="photoInput"
              />
              <label
                htmlFor="photoInput"
                className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-colors w-fit ${uploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                {uploading ? "업로드 중..." : `사진 추가 (최대 ${MAX_PHOTOS}장)`}
              </label>
              <p className="text-xs text-gray-400 mt-1.5">JPG, PNG, WebP · 파일당 5MB 이하 · ★ 버튼으로 대표사진 설정</p>
            </div>
          )}
        </div>
      </Section>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/shop/dashboard")}
          className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending || uploading}
          className="ml-auto px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {submitLabel}
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

function Field({ label, name, defaultValue, type = "text", required, placeholder }: {
  label: string; name: string; defaultValue?: string; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
      />
    </div>
  );
}
