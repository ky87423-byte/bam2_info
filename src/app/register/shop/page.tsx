import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { generateCaptcha } from "@/lib/captcha";
import { getAreas } from "@/lib/data";
import ShopRegisterForm from "./ShopRegisterForm";

export default async function ShopRegisterPage() {
  const session = await auth();
  if (session) redirect("/");

  const captcha = generateCaptcha();
  const areas = getAreas();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-400">BAM</h1>
          <p className="text-gray-500 text-sm mt-1">업소회원 가입 신청</p>
          <p className="text-xs text-blue-600 mt-2 bg-blue-50 px-4 py-2 rounded-lg inline-block">
            신청 후 관리자 승인을 받으면 로그인 및 업소 게시글 작성이 가능합니다.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <ShopRegisterForm captcha={captcha} areas={areas} />
        </div>
      </div>
    </div>
  );
}
