import { createHash, createHmac } from "crypto";

// 内嵌密钥，serverless 无共享内存所以签名放 cookie
const SECRET_PARTS = ["aisticker_", "otp_", "secret_", "2024_", "v1"];
const SECRET = SECRET_PARTS.join("");

function hmac(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

// code 用 hash 存 payload，不存明文
function codeHash(code: string): string {
  return createHash("sha256").update(SECRET + ":" + code).digest("hex").slice(0, 16);
}

// Token 格式: base64(email:codeHash:expiresAt:attempts) + "." + HMAC
export function signOtpToken(
  email: string,
  code: string,
  expiresAt: number,
  attempts: number = 0
): string {
  const payload = `${email}:${codeHash(code)}:${expiresAt}:${attempts}`;
  const encoded = Buffer.from(payload).toString("base64");
  return `${encoded}.${hmac(payload)}`;
}

export interface VerifyResult {
  valid: boolean;
  reason?:
    | "invalid_token"
    | "invalid_signature"
    | "invalid_payload"
    | "email_mismatch"
    | "code_mismatch"
    | "expired"
    | "too_many_attempts"
    | "error";
  /** 当前失败次数，用于返回给前端重签 token */
  attempts?: number;
  /** 过期时间戳，重签时复用 */
  expiresAt?: number;
}

/** 递增 attempts 并重签 — 用于验证失败时保留 codeHash 但更新尝试次数 */
export function resignOtpToken(token: string, newAttempts: number): string | null {
  try {
    const [encoded] = token.split(".");
    if (!encoded) return null;
    const payload = Buffer.from(encoded, "base64").toString("utf-8");
    const [email, codeHash, expiresAt] = payload.split(":");
    if (!email || !codeHash || !expiresAt) return null;
    const newPayload = `${email}:${codeHash}:${expiresAt}:${newAttempts}`;
    const newEncoded = Buffer.from(newPayload).toString("base64");
    return `${newEncoded}.${hmac(newPayload)}`;
  } catch {
    return null;
  }
}

export function verifyOtpToken(
  token: string,
  email: string,
  code: string
): VerifyResult {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return { valid: false, reason: "invalid_token" };

    const payload = Buffer.from(encoded, "base64").toString("utf-8");
    if (hmac(payload) !== sig) return { valid: false, reason: "invalid_signature" };

    const [tokenEmail, tokenCodeHash, tokenExpiresAt, tokenAttemptsStr] = payload.split(":");
    if (!tokenEmail || !tokenCodeHash || !tokenExpiresAt) {
      return { valid: false, reason: "invalid_payload" };
    }
    const attempts = parseInt(tokenAttemptsStr || "0", 10) || 0;
    const expiresAt = parseInt(tokenExpiresAt, 10);

    if (tokenEmail !== email) return { valid: false, reason: "email_mismatch" };
    if (isNaN(expiresAt) || Date.now() > expiresAt) return { valid: false, reason: "expired" };

    // 锁死：5 次失败后彻底作废
    if (attempts >= 5) {
      return { valid: false, reason: "too_many_attempts", attempts, expiresAt };
    }

    // code 对比用 hash，payload 里永远看不到明文 code
    if (tokenCodeHash !== codeHash(code)) {
      return { valid: false, reason: "code_mismatch", attempts, expiresAt };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "error" };
  }
}
