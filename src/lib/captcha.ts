import crypto from "crypto";

export interface CaptchaData {
  question: string;  // 화면에 표시할 수식 (예: "17 + 5")
  token: string;     // HMAC(answer:ts)
  ts: string;        // 생성 시각 (ms)
}

export function generateCaptcha(): CaptchaData {
  const a = Math.floor(Math.random() * 30) + 5;
  const b = Math.floor(Math.random() * 20) + 1;
  const useAdd = Math.random() > 0.35;

  // 뺄셈은 항상 양수 결과
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const answer = useAdd ? a + b : big - small;
  const question = useAdd ? `${a} + ${b}` : `${big} - ${small}`;

  const ts = Date.now().toString();
  const token = sign(String(answer), ts);

  return { question, token, ts };
}

export function verifyCaptcha(answer: string, token: string, ts: string): boolean {
  if (!answer || !token || !ts) return false;

  // 15분 내 토큰만 허용
  if (Date.now() - parseInt(ts, 10) > 900_000) return false;

  const expected = sign(answer.trim(), ts);

  try {
    return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

function sign(value: string, ts: string): string {
  const secret = process.env.AUTH_SECRET ?? "fallback-secret";
  return crypto.createHmac("sha256", secret).update(`${value}:${ts}`).digest("hex");
}
