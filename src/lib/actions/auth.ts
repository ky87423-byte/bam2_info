"use server";

import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { createUser, checkAttendance, awardPoints, getSettings, getUserByUsername } from "@/lib/data";
import { verifyCaptcha } from "@/lib/captcha";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";

export type RegisterValues = { username?: string; nickname?: string };
export type RegisterState = { error?: string; success?: boolean; values?: RegisterValues };

export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  if (formData.get("website")) return { error: "비정상적인 요청입니다." };

  const captchaAnswer = ((formData.get("captchaAnswer") as string) ?? "").trim();
  const captchaToken  = (formData.get("captchaToken")  as string) ?? "";
  const captchaTs     = (formData.get("captchaTs")     as string) ?? "";

  if (!verifyCaptcha(captchaAnswer, captchaToken, captchaTs)) {
    return { error: "보안 코드가 올바르지 않습니다. 다시 확인해주세요." };
  }

  const username = ((formData.get("username") as string) ?? "").trim();
  const nickname = ((formData.get("nickname") as string) ?? "").trim();
  const password = (formData.get("password") as string) ?? "";
  const confirm  = (formData.get("confirm")  as string) ?? "";

  const values: RegisterValues = { username, nickname };

  if (!username || username.length < 3)  return { error: "아이디는 3자 이상이어야 합니다.", values };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { error: "아이디는 영문, 숫자, _만 사용 가능합니다.", values };
  if (!password || password.length < 6)  return { error: "비밀번호는 6자 이상이어야 합니다.", values };
  if (password !== confirm)              return { error: "비밀번호가 일치하지 않습니다.", values };

  const passwordHash = await bcrypt.hash(password, 10);
  const result = createUser({ username, nickname: nickname || username, passwordHash });
  if (!result.ok) return { error: result.error, values };

  const settings = getSettings();
  if (settings.pointSignup > 0) {
    awardPoints(result.user.id, "signup", settings.pointSignup, "회원가입 환영 포인트");
  }

  await signIn("credentials", { username, password, redirectTo: "/" });
  return { success: true };
}

export type ShopRegisterValues = {
  username?: string; nickname?: string; company?: string;
  category?: string; area?: string; phone?: string;
};
export type ShopRegisterState = { error?: string; success?: boolean; values?: ShopRegisterValues };

export async function shopRegisterAction(
  _prev: ShopRegisterState,
  formData: FormData
): Promise<ShopRegisterState> {
  if (formData.get("website")) return { error: "비정상적인 요청입니다." };

  const captchaAnswer = ((formData.get("captchaAnswer") as string) ?? "").trim();
  const captchaToken  = (formData.get("captchaToken")  as string) ?? "";
  const captchaTs     = (formData.get("captchaTs")     as string) ?? "";
  if (!verifyCaptcha(captchaAnswer, captchaToken, captchaTs)) {
    return { error: "보안 코드가 올바르지 않습니다. 다시 확인해주세요." };
  }

  const username  = ((formData.get("username")  as string) ?? "").trim();
  const nickname  = ((formData.get("nickname")  as string) ?? "").trim();
  const password  = (formData.get("password")  as string) ?? "";
  const confirm   = (formData.get("confirm")   as string) ?? "";
  const company   = ((formData.get("company")  as string) ?? "").trim();
  const category  = ((formData.get("category") as string) ?? "").trim();
  const area      = ((formData.get("area")     as string) ?? "").trim();
  const phone     = ((formData.get("phone")    as string) ?? "").trim();

  const values: ShopRegisterValues = { username, nickname, company, category, area, phone };

  if (!username || username.length < 3)  return { error: "아이디는 3자 이상이어야 합니다.", values };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { error: "아이디는 영문, 숫자, _만 사용 가능합니다.", values };
  if (!password || password.length < 6)  return { error: "비밀번호는 6자 이상이어야 합니다.", values };
  if (password !== confirm)              return { error: "비밀번호가 일치하지 않습니다.", values };
  if (!company)                          return { error: "업소명은 필수 항목입니다.", values };

  const passwordHash = await bcrypt.hash(password, 10);
  const memo = `[업소 신청] 업소명: ${company}${category ? ` | 업종: ${category}` : ""}${area ? ` | 지역: ${area}` : ""}${phone ? ` | 연락처: ${phone}` : ""}`;

  const result = createUser({ username, nickname: nickname || username, passwordHash, role: "shop", status: "blocked", memo });
  if (!result.ok) return { error: result.error, values };

  return { success: true };
}

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = ((formData.get("username") as string) ?? "").trim();

  // 업소 신청 승인 대기 중인 계정 사전 체크
  const candidate = getUserByUsername(username);
  if (candidate?.role === "shop" && candidate?.status === "blocked") {
    return { error: "업소회원 신청이 승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다." };
  }

  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: (formData.get("callbackUrl") as string) || "/",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
    }
    throw e;
  }
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function attendAction(userId: number) {
  const result = checkAttendance(userId);
  revalidatePath("/attend");
  revalidatePath("/mypage");
  return result;
}

export async function adminAwardPointsAction(formData: FormData) {
  const userId = parseInt(formData.get("userId") as string, 10);
  const amount = parseInt(formData.get("amount") as string, 10);
  const memo = (formData.get("memo") as string) || "관리자 지급";
  if (!userId || !amount) return;
  awardPoints(userId, "admin", amount, memo);
  revalidatePath("/admin/points");
  revalidatePath("/admin/users");
}
