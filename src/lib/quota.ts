// In-memory OTP store (server-side only, resets on cold start)
// Key: email, Value: { code, expiresAt }
const otpStore = new Map<string, { code: string; expiresAt: number }>();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createOTP(email: string): string {
  const code = generateCode();
  otpStore.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
  return code;
}

export function verifyOTP(email: string, code: string): boolean {
  const record = otpStore.get(email.toLowerCase());
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return false;
  }
  if (record.code !== code) return false;
  otpStore.delete(email.toLowerCase()); // one-time use
  return true;
}

// Quota: free users get 5/day (same as before, per visitor)
const quotaStore = new Map<string, { count: number; date: string }>();
export const FREE_DAILY_LIMIT = 5;

export function getQuota(key: string): { used: number; limit: number; remaining: number } {
  const today = new Date().toISOString().slice(0, 10);
  const record = quotaStore.get(key);
  if (!record || record.date !== today) {
    return { used: 0, limit: FREE_DAILY_LIMIT, remaining: FREE_DAILY_LIMIT };
  }
  return { used: record.count, limit: FREE_DAILY_LIMIT, remaining: Math.max(0, FREE_DAILY_LIMIT - record.count) };
}

export function checkAndIncrementQuota(key: string): { allowed: boolean; remaining: number } {
  const q = getQuota(key);
  if (q.remaining <= 0) return { allowed: false, remaining: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const record = quotaStore.get(key);
  if (!record || record.date !== today) {
    quotaStore.set(key, { count: 1, date: today });
  } else {
    quotaStore.set(key, { count: record.count + 1, date: today });
  }
  return { allowed: true, remaining: q.remaining - 1 };
}
