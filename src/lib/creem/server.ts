// Creem支付 - 服务端工具
// 文档: https://docs.creem.io
// 优势: 中国大陆身份证+支付宝即可收款，无需海外公司

import { z } from "zod";

const CREEM_API_BASE = "https://api.creem.io/v1";

// Creem Webhook签名验证
export function verifyCreemWebhookSignature(
  payload: string,
  signature: string
): boolean {
  // Creem使用HMAC-SHA256签名
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

// 创建Checkout链接 — 调 Creem API 获取真实 checkout URL
export async function getCheckoutUrl(
  productId: string,
  userId: string,
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aisticker.pics";
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) throw new Error("CREEM_API_KEY not configured");

  const response = await fetch("https://api.creem.io/v1/checkout", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      customer_id: userId,
      success_url: `${baseUrl}/settings?checkout=success`,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Creem checkout error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  // 返回 checkout_url（Creem 返回的真实支付链接）
  return data.checkout_url || data.url;
}

// Creem API调用封装
async function creemApi(
  method: string,
  path: string,
  body?: Record<string, unknown>
) {
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) throw new Error("CREEM_API_KEY not configured");

  const response = await fetch(`${CREEM_API_BASE}${path}`, {
    method,
    headers: {
      "X-API-KEY": apiKey,
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
