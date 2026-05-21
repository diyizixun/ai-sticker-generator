// 邮箱验证码存储（内存，5分钟有效）
// 生产环境建议用Redis或Supabase
interface VerificationCode {
  code: string;
  expiresAt: number;
  email: string;
}

// 全局内存存储（Vercel Serverless会冷启动，但5分钟内有效）
const verificationCodes = new Map<string, VerificationCode>();

// 清理过期验证码（每60秒清理一次）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of verificationCodes.entries()) {
      if (value.expiresAt < now) {
        verificationCodes.delete(key);
      }
    }
  }, 60000);
}

export function storeVerificationCode(email: string, code: string, ttlMinutes = 5): void {
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  verificationCodes.set(email, { code, expiresAt, email });
}

export function verifyCode(email: string, code: string): boolean {
  const record = verificationCodes.get(email);
  
  if (!record) return false;
  if (record.expiresAt < Date.now()) {
    verificationCodes.delete(email);
    return false;
  }
  if (record.code !== code) return false;
  
  // 验证成功后删除验证码
  verificationCodes.delete(email);
  return true;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
