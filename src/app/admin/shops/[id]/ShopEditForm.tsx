"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { actionUpdateShop, actionDeleteShop, actionToggleShopVisibility } from "@/lib/actions/shop";
import type { ShopData } from "@/lib/data";

export default function ShopEditForm({ shop }: { shop: ShopData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [visible, setVisible] = useState(shop.isVisible);
  const allPhotos = [...(shop.mainPhoto ? [shop.mainPhoto] : []), ...shop.photos];

  const handleDelete = () => {
    if (!confirm(`"${shop.company}" 업소를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      await actionDeleteShop(shop.id);
      router.push("/admin/shops");
    });
  };

  const handleToggle = () => {
    startTransition(async () => {
      await actionToggleShopVisibility(shop.id);
      setVisible((v) => !v);
      router.refresh();
    });
  };

  return (
    <form action={actionUpdateShop} className="space-y-4 max-w-3xl">
      <input type="hidden" name="id" value={shop.id} />

      {/* 기본 정보 */}
      <Section title="기본 정보">
        <div className="grid grid-cols-2 gap-4">
          <Field label="업소명" name="company" defaultValue={shop.company} required />
          <Field label="지역" name="area" defaultValue={shop.area} />
          <Field label="업종 (대)" name="category" defaultValue={shop.category} />
          <Field label="업종 (소)" name="category2" defaultValue={shop.category2} />
          <Field label="가격 (원)" name="price" type="number" defaultValue={shop.price.toString()} />
          <div>
            <label className="text-xs text-gray-500 block mb-2">노출 여부</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isVisible"
                defaultChecked={shop.isVisible}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-gray-700">노출</span>
            </label>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Field label="영업 시작" name="time1" defaultValue={shop.time1} placeholder="09:00" />
          <Field label="영업 종료" name="time2" defaultValue={shop.time2} placeholder="22:00" />
          <div>
            <label className="text-xs text-gray-500 block mb-2">24시간</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="timeFull"
                defaultChecked={shop.timeFull}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-gray-700">24시간 영업</span>
            </label>
          </div>
        </div>
      </Section>

      {/* 연락처 */}
      <Section title="연락처">
        <div className="grid grid-cols-3 gap-4">
          <Field label="전화번호" name="phone" defaultValue={shop.phone} />
          <Field label="핸드폰" name="hphone" defaultValue={shop.hphone} />
          <Field label="텔레그램" name="telegram" defaultValue={shop.telegram} />
        </div>
      </Section>

      {/* 광고문구 */}
      <Section title="광고문구">
        <label className="text-xs text-gray-500 block mb-1">내용</label>
        <textarea
          name="subject"
          defaultValue={shop.subject}
          rows={5}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
        />
      </Section>

      {/* 이미지 */}
      {allPhotos.length > 0 && (
        <Section title={`이미지 (${allPhotos.length}장)`}>
          <div className="grid grid-cols-4 gap-2">
            {allPhotos.map((photo, i) => (
              <div key={i} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <Image src={photo} alt={`사진 ${i + 1}`} fill className="object-cover" unoptimized />
                {i === 0 && (
                  <span className="absolute top-1 left-1 bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded font-bold">
                    대표
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 하단 버튼 */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          삭제
        </button>
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {visible ? "숨김 처리" : "노출 처리"}
        </button>
        <a
          href={`/shop/${shop.id}`}
          target="_blank"
          className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-colors ml-auto"
        >
          사이트에서 보기 ↗
        </a>
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {pending ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label, name, defaultValue, type = "text", placeholder, required,
}: {
  label: string; name: string; defaultValue?: string; type?: string;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
      />
    </div>
  );
}
