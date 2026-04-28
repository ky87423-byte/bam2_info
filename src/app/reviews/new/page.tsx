import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChevronLeft, ShieldCheck, PencilLine } from "lucide-react";
import { getCertifiedReviewContext } from "@/lib/actions/review";
import { REVIEW_BIZ_TYPES, REVIEW_TAG_PRESET } from "@/lib/data";
import ReviewForm from "../ReviewForm";

interface Props {
  searchParams: Promise<{ userCouponId?: string }>;
}

export default async function NewReviewPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/reviews/new");

  const sp = await searchParams;
  const userCouponIdRaw = sp.userCouponId;
  const userCouponId = userCouponIdRaw ? parseInt(userCouponIdRaw, 10) : null;

  // 인증 모드 (쿠폰 사용 후) — 컨텍스트 조회
  let certifiedCtx: { ok: true; userCouponId: number; shopName: string; bizType: string; couponTitle: string } | null = null;
  let certifiedError: string | null = null;
  if (userCouponId) {
    const r = await getCertifiedReviewContext(userCouponId);
    if ("ok" in r && r.ok) certifiedCtx = r;
    else certifiedError = ("error" in r ? r.error : null) ?? "인증 컨텍스트를 가져올 수 없습니다.";
  }

  const isCertifiedMode = !!certifiedCtx;

  return (
    <div className="bg-[#0e0e1a] min-h-screen text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/reviews" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-yellow-400 mb-4">
          <ChevronLeft size={14} /> 후기 게시판
        </Link>

        <div className="mb-6 flex items-center gap-3">
          {isCertifiedMode ? (
            <>
              <ShieldCheck size={22} className="text-yellow-400" />
              <h1 className="text-xl font-bold text-yellow-400">인증 후기 작성</h1>
              <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-[#1a1a2e] font-bold rounded-full">
                실제 방문 인증
              </span>
            </>
          ) : (
            <>
              <PencilLine size={22} className="text-white/70" />
              <h1 className="text-xl font-bold text-white">일반 후기 작성</h1>
            </>
          )}
        </div>

        {isCertifiedMode && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mb-6 text-sm">
            <p className="text-yellow-400 font-bold mb-1">실제 방문 인증 후기를 작성합니다</p>
            <p className="text-white/80">
              <span className="font-semibold">「{certifiedCtx!.couponTitle}」</span> 쿠폰을 사용하셨네요.
              아래 업소명과 업종은 자동 입력되며 변경할 수 없습니다. 인증 후기는 일반 후기보다 포인트가 더 많이 지급됩니다.
            </p>
          </div>
        )}

        {certifiedError && (
          <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-4 mb-6 text-sm text-red-300">
            <p className="font-bold mb-1">인증 후기를 작성할 수 없습니다</p>
            <p>{certifiedError}</p>
            <p className="mt-2 text-xs text-red-300/70">아래에서 일반 후기를 작성할 수 있습니다.</p>
          </div>
        )}

        <ReviewForm
          mode={isCertifiedMode ? "certified" : "general"}
          fixedShopName={certifiedCtx?.shopName ?? ""}
          fixedBizType={certifiedCtx?.bizType ?? ""}
          userCouponId={certifiedCtx?.userCouponId ?? null}
          bizTypes={[...REVIEW_BIZ_TYPES]}
          tagPresets={[...REVIEW_TAG_PRESET]}
        />
      </div>
    </div>
  );
}
