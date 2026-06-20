// 客户端 localStorage quota 管理（匿名用户）
// 解决 Vercel serverless 内存不持久问题

const KEY = "aisticker_quota";
const FREE_DAILY_LIMIT = 5;

interface QuotaData {
  date: string; // "2026-06-20"
  used: number;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function getLocalQuota(): { remaining: number; limit: number } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { remaining: FREE_DAILY_LIMIT, limit: FREE_DAILY_LIMIT };
    const data: QuotaData = JSON.parse(raw);
    // 不是今天的数据，重置
    if (data.date !== today()) return { remaining: FREE_DAILY_LIMIT, limit: FREE_DAILY_LIMIT };
    return {
      remaining: Math.max(0, FREE_DAILY_LIMIT - data.used),
      limit: FREE_DAILY_LIMIT,
    };
  } catch {
    return { remaining: FREE_DAILY_LIMIT, limit: FREE_DAILY_LIMIT };
  }
}

export function incrementLocalQuota(): { remaining: number; limit: number } {
  try {
    const raw = localStorage.getItem(KEY);
    let used = 1;
    if (raw) {
      const data: QuotaData = JSON.parse(raw);
      if (data.date === today()) {
        used = data.used + 1;
      }
    }
    localStorage.setItem(KEY, JSON.stringify({ date: today(), used }));
    return {
      remaining: Math.max(0, FREE_DAILY_LIMIT - used),
      limit: FREE_DAILY_LIMIT,
    };
  } catch {
    return { remaining: FREE_DAILY_LIMIT, limit: FREE_DAILY_LIMIT };
  }
}
