// Creem支付 - 服务端工具
// 文档: https://docs.creem.io
// 优势: 中国大陆身份证+支付宝即可收款，无需海外公司
//
// 当前方案：Creem 托管 Checkout URL（无需 API Key）
// API 方式（x-api-key）返回 403 error 1010，等 Creem 支持确认后再切回

// Creem Webhook签名验证（使用 creem-signature header）
export function verifyCreemWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const secret = process.env.CREEM_WEBHOOK_SECRET!;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return expectedSig === signature;
}

// Creem产品配置（在Dashboard创建后填入）
export const CREEM_PRODUCTS = {
  proMonthly: process.env.CREEM_PRO_MONTHLY_PRODUCT_ID!, // $9.9/月
  proYearly: process.env.CREEM_PRO_YEARLY_PRODUCT_ID!,   // $79/年
} as const;

// 创建Checkout链接 — 使用 Creem 托管 Checkout 页面
// 这是官方支持的免 API 方式，用户直接跳转到 Creem 支付页面
// 格式: https://www.creem.io/checkout/{product_id}?email=...
export function getCheckoutUrl(
  productId: string,
  userEmail: string,
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aisticker.pics";
  // Creem 托管 checkout — 直接跳转，无需 API
  const params = new URLSearchParams({
    email: userEmail,
    success_url: `${baseUrl}/settings?checkout=success`,
    cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
  });
  return `https://www.creem.io/checkout/${productId}?${params.toString()}`;
}

// Creem API调用封装（暂时未用，等 API 权限开通后启用）
async function creemApi(
  method: string,
  path: string,
  body?: Record<string, unknown>
) {
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) throw new Error("CREEM_API_KEY not configured");

  const response = await fetch(`https://api.creem.io/v1${path}`, {
    method,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Creem API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// 查询支付状态
export async function getPayment(paymentId: string) {
  return creemApi("GET", `/payments/${paymentId}`);
}

// 查询订阅状态
export async function getSubscription(subscriptionId: string) {
  return creemApi("GET", `/subscriptions/${subscriptionId}`);
}

// 取消订阅
export async function cancelCreemSubscription(subscriptionId: string) {
  return creemApi("POST", `/subscriptions/${subscriptionId}/cancel`);
}
