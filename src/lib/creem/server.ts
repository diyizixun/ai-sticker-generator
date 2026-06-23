// Creem支付 - 服务端工具
// 当前方案：Creem 托管 Checkout URL + API Key
// 如果 API 仍然 403，自动降级到托管 URL

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

// Creem产品配置
export const CREEM_PRODUCTS = {
  proMonthly: process.env.CREEM_PRO_MONTHLY_PRODUCT_ID!, // $9.9/月
  proYearly: process.env.CREEM_PRO_YEARLY_PRODUCT_ID!,   // $79/年
} as const;

// 创建Checkout链接
// 优先用 Creem API（有更好的 success_url 支持），API 不可用时降级到托管 URL
export async function getCheckoutUrl(
  productId: string,
  userEmail: string,
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aisticker.pics";
  const apiKey = process.env.CREEM_API_KEY;

  // 先尝试 API 方式
  if (apiKey) {
    try {
      const response = await fetch("https://api.creem.io/v1/checkouts", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          success_url: `${baseUrl}/settings?checkout=success`,
          cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // API 返回的 checkout_url 应该是字符串，如果不是则降级
        if (typeof data.checkout_url === 'string' && data.checkout_url) {
          return data.checkout_url;
        }
      }
    } catch {
      // API 调用失败，降级到托管 URL
    }
  }

  // 降级：使用 Creem 托管 Checkout URL
  const params = new URLSearchParams({
    email: userEmail,
    success_url: `${baseUrl}/settings?checkout=success`,
    cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
  });
  return `https://www.creem.io/checkout/${productId}?${params.toString()}`;
}
