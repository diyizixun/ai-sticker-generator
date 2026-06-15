// 免费用户日生成额度控制（IP-based，无需登录）

const FREE_DAILY_LIMIT = 5; // 每天免费生成次数

interface QuotaEntry {
  count: number;
  resetAt: number; // Unix timestamp (ms)
}

// 内存存储（Vercel 冷启动后会重置，但对 MVP 够用）
const store = new Map<string, QuotaEntry>();

// 每 10 分钟清理一次过期条目
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

/** 获取日重置时间戳（明天 00:00） */
function getNextReset(): number {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

/** 获取当日标识 key */
function getDailyKey(identifier: string): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return `${dateStr}:${identifier}`;
}

/** 从请求中提取用户标识（优先 cookie，fallback IP） */
export function getClientId(request: Request): string {
  // 尝试从 cookie 获取 visitor_id
  const cookieHeader = request.headers.get("cookie") || "";
  const visitorMatch = cookieHeader.match(/visitor_id=([^;]+)/);
  if (visitorMatch) return visitorMatch[1];

  // fallback: IP 地址
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return ip;
}

/** 检查并返回配额状态 */
export function checkQuota(identifier: string): {
  allowed: boolean;
  remaining: number;
  limit: number;
} {
  cleanup();

  const key = getDailyKey(identifier);
  const entry = store.get(key);
  const now = Date.now();

  if (!entry || now >= entry.resetAt) {
    return { allowed: true, remaining: FREE_DAILY_LIMIT, limit: FREE_DAILY_LIMIT };
  }

  const remaining = Math.max(0, FREE_DAILY_LIMIT - entry.count);
  return { allowed: remaining > 0, remaining, limit: FREE_DAILY_LIMIT };
}

/** 增加配额计数（生成成功后调用） */
export function incrementQuota(identifier: string): number {
  const key = getDailyKey(identifier);
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: getNextReset() };
  } else {
    entry = { count: entry.count + 1, resetAt: entry.resetAt };
  }

  store.set(key, entry);
  return Math.max(0, FREE_DAILY_LIMIT - entry.count);
}

/** 获取当前使用计数（不修改） */
export function getUsageCount(identifier: string): number {
  const key = getDailyKey(identifier);
  const entry = store.get(key);
  if (!entry || Date.now() >= entry.resetAt) return 0;
  return entry.count;
}
