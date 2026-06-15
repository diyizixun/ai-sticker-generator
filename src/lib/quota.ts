// Quota: free users get 5/day (per visitor)
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
