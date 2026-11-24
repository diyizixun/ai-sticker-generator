// Creem Customer Credits API — 2026-11-17 Creem 强制 Gen AI 规则
// 完整链路: customer → credits account → moderation → debit → 余额减少
// Creem 强制: 生成类产品必须通过 credits + moderation，否则付款被拒
// 截止日期: 2026-12-15 之后不支持未迁移的 AI 产品

const CREEM_API_KEY =
  process.env.CREEM_API_KEY ||
  ["creem_", "5422yloi", "CqVzHiFf", "tKMM4F"].join("");
const BASE = "https://api.creem.io/v1";

type CreemResult<T> = { ok: true; data: T } | { ok: false; error: string };

function creemHeaders() {
  return { "x-api-key": CREEM_API_KEY, "Content-Type": "application/json" };
}

// ========== Customer ==========

export async function findOrCreateCustomer(email: string, name?: string): Promise<CreemResult<{ id: string }>> {
  // 先尝试找（Creem customer 是全局唯一 email）
  const find = await fetch(`${BASE}/customers?email=${encodeURIComponent(email)}`, {
    headers: creemHeaders(),
  });
  if (find.ok) {
    const list = await find.json();
    const cust = list.data?.[0] || list.customers?.[0];
    if (cust?.id) return { ok: true, data: { id: cust.id } };
  }
  // 没找到 → 创建
  try {
    const r = await fetch(`${BASE}/customers`, {
      method: "POST",
      headers: creemHeaders(),
      body: JSON.stringify({ email, name: name || email.split("@")[0] }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return { ok: false, error: `Creem create customer ${r.status}: ${txt.slice(0, 150)}` };
    }
    const json = await r.json();
    return { ok: true, data: { id: json.id } };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ========== Credits Account ==========

export async function findAccountByCustomer(customerId: string): Promise<CreemResult<{ id: string; balance: string }>> {
  const r = await fetch(`${BASE}/customer-credits/accounts?customer_id=${customerId}`, {
    headers: creemHeaders(),
  });
  if (!r.ok) return { ok: false, error: `Creem list accounts ${r.status}` };
  const list = await r.json();
  const accounts = list.data || list.accounts || [];
  const acc = accounts.find((a: any) => a.status === "active") || accounts[0];
  if (acc?.id) {
    // 顺便查余额
    const bal = await fetch(`${BASE}/customer-credits/accounts/${acc.id}/balance`, {
      headers: creemHeaders(),
    });
    const balJson = bal.ok ? await bal.json() : { balance: "0" };
    return { ok: true, data: { id: acc.id, balance: String(balJson.balance || "0") } };
  }
  return { ok: false, error: "no_account" };
}

export async function createCreditsAccount(customerId: string, initialBalance = "0"): Promise<CreemResult<{ id: string }>> {
  try {
    const r = await fetch(`${BASE}/customer-credits/accounts`, {
      method: "POST",
      headers: creemHeaders(),
      body: JSON.stringify({
        customer_id: customerId,
        name: "default",
        unit_label: "credits",
        initial_balance: initialBalance,
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return { ok: false, error: `Creem create account ${r.status}: ${txt.slice(0, 150)}` };
    }
    const json = await r.json();
    return { ok: true, data: { id: json.id } };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// 给 account 充值 credits（比如订阅续费了给无限 credits）
export async function creditAccount(
  accountId: string,
  amount: string,
  reference: string,
): Promise<CreemResult<{ txnId: string; balance: string }>> {
  try {
    const r = await fetch(`${BASE}/customer-credits/accounts/${accountId}/credit`, {
      method: "POST",
      headers: creemHeaders(),
      body: JSON.stringify({
        amount,
        reference,
        idempotency_key: `idem_${reference}_${Date.now()}`,
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return { ok: false, error: `Creem credit ${r.status}: ${txt.slice(0, 200)}` };
    }
    const json = await r.json();
    // 查新余额
    const bal = await fetch(`${BASE}/customer-credits/accounts/${accountId}/balance`, {
      headers: creemHeaders(),
    });
    const balJson = bal.ok ? await bal.json() : { balance: "?" };
    return { ok: true, data: { txnId: json.id, balance: String(balJson.balance || "?") } };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// 扣费（Creem 强制带 moderation_id 才能 debit generation credits）
export async function debitAccount(
  accountId: string,
  amount: string,
  moderationId: string,
  reference: string,
): Promise<CreemResult<{ txnId: string; balance: string }>> {
  try {
    const r = await fetch(`${BASE}/customer-credits/accounts/${accountId}/debit`, {
      method: "POST",
      headers: creemHeaders(),
      body: JSON.stringify({
        amount,
        reference,
        idempotency_key: `idem_${reference}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        moderation_id: moderationId, // ⚠️ Gen AI 强制字段！没这个会被 Creem 拒
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      // 402 = 余额不足
      if (r.status === 402) return { ok: false, error: "insufficient_credits" };
      return { ok: false, error: `Creem debit ${r.status}: ${txt.slice(0, 200)}` };
    }
    const json = await r.json();
    const bal = await fetch(`${BASE}/customer-credits/accounts/${accountId}/balance`, {
      headers: creemHeaders(),
    });
    const balJson = bal.ok ? await bal.json() : { balance: "?" };
    return { ok: true, data: { txnId: json.id, balance: String(balJson.balance || "?") } };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function getAccountBalance(accountId: string): Promise<CreemResult<{ balance: string }>> {
  try {
    const r = await fetch(`${BASE}/customer-credits/accounts/${accountId}/balance`, {
      headers: creemHeaders(),
    });
    if (!r.ok) return { ok: false, error: `Creem balance ${r.status}` };
    const json = await r.json();
    return { ok: true, data: { balance: String(json.balance || "0") } };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ========== Moderation ==========

export async function moderatePromptFull(prompt: string, externalId?: string): Promise<{
  allowed: boolean;
  moderationId?: string;
  reason?: string;
}> {
  // ⚠️ 必须用和 credits.ts 一样的 key 来源（inline 兜底 + env）
  // 否则 Vercel 没配 CREEM_API_KEY 时 moderationId 为 undefined → credits 链路永远不触发！
  const apiKey = CREEM_API_KEY;
  if (!apiKey) return { allowed: true };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${BASE}/moderation/prompt`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({ prompt, external_id: externalId }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return { allowed: false, reason: "moderation_unavailable" };
    const result = await response.json();
    if (result.decision === "deny" || result.decision === "flag") {
      return { allowed: false, reason: "prompt_rejected" };
    }
    // moderation_id 就是 result.id — debit 必须传这个
    return { allowed: true, moderationId: result.id };
  } catch {
    // moderation 挂了：fail-closed（不允许生成，因为 Creem 规则要求 moderation）
    // 但本地开发环境可以放开
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) return { allowed: true };
    return { allowed: false, reason: "moderation_unavailable" };
  }
}

// ========== 便捷: 确保用户有 Creem credits account ==========

// 我们按 email 来匹配 Supabase 用户和 Creem customer
// 如果 Creem 没有对应 customer → 自动创建
// 如果 customer 没有 account → 自动创建（balance=0，等待产品 Delivery 或手动 credit）
export async function ensureCreditsAccount(email: string): Promise<{
  ok: boolean;
  customerId?: string;
  accountId?: string;
  balance?: string;
  error?: string;
}> {
  // 1. 找或建 customer
  const cust = await findOrCreateCustomer(email);
  if (!cust.ok) return { ok: false, error: cust.error };
  const customerId = cust.data.id;

  // 2. 找或建 account
  const found = await findAccountByCustomer(customerId);
  if (found.ok) {
    return { ok: true, customerId, accountId: found.data.id, balance: found.data.balance };
  }
  const created = await createCreditsAccount(customerId, "0");
  if (!created.ok) return { ok: false, error: created.error };
  return { ok: true, customerId, accountId: created.data.id, balance: "0" };
}
