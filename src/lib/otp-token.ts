import { createHash, createHmac } from "crypto";

// 用内嵌密钥签名 OTP token，避免 serverless 内存不共享问题
// token 格式: base64(email:code:expiresAt) + "." + HMAC签名
const SECRET_PARTS = ["aisticker_", "otp_", "secret_", "2024_", "v1"];
const SECRET = SECRET_PARTS.join("");

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

export function signOtpToken(email: string, code: string, expiresAt: number): string {
  const payload = `${email}:${code}:${expiresAt}`;
  const encoded = Buffer.from(payload).toString("base64");
  return `${encoded}.${sign(payload)}`;
}

export function verifyOtpToken(
  token: string,
  email: string,
  code: string
): { valid: boolean; reason?: string } {
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) {
      return { valid: false, reason: "invalid_token" };
    }

    const payload = Buffer.from(encoded, "base64").toString("utf-8");
    const expectedSignature = sign(payload);
    if (signature !== expectedSignature) {
      return { valid: false, reason: "invalid_signature" };
    }

    const [tokenEmail, tokenCode, tokenExpiresAt] = payload.split(":");
    if (!tokenEmail || !tokenCode || !tokenExpiresAt) {
      return { valid: false, reason: "invalid_payload" };
    }

    if (tokenEmail !== email) {
      return { valid: false, reason: "email_mismatch" };
    }

    if (tokenCode !== code) {
      return { valid: false, reason: "code_mismatch" };
    }

    const expiresAt = parseInt(tokenExpiresAt, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return { valid: false, reason: "expired" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "error" };
  }
}
