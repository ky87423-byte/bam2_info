import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/data";
import { generateCaptcha } from "@/lib/captcha";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const session = await auth();
  if (session) redirect("/");

  const settings = getSettings();
  const captcha = generateCaptcha();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-400">BAM</h1>
          <p className="text-gray-500 text-sm mt-1">회원가입</p>
          {settings.pointSignup > 0 && (
            <p className="text-xs text-green-600 mt-2 font-medium">
              가입 즉시 {settings.pointSignup.toLocaleString()}P 지급!
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <RegisterForm captcha={captcha} />
        </div>
      </div>
    </div>
  );
}
