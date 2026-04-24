import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-400">BAM</h1>
          <p className="text-gray-500 text-sm mt-1">로그인</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
