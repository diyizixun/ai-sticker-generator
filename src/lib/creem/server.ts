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
// 使用 Creem API 创建 checkout session，获取 checkout_url 重定向用户
// 注意：Creem API 只接受 product_id 参数，不支持 success_url / cancel_url
export async function getCheckoutUrl(
  productId: string,
  userEmail: string,
): Promise<string> {
  const apiKey = process.env.CREEM_API_KEY;

  // 使用 Creem API 创建 checkout session
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
          metadata: {
            user_email: userEmail,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (typeof data.checkout_url === 'string' && data.checkout_url) {
          return data.checkout_url;
        }
      } else {
        const errText = await response.text();
        console.error('[Creem API] 创建 checkout 失败:', response.status, errText);
      }
    } catch (err) {
      console.error('[Creem API] 网络错误:', err);
    }
  }

  // 降级：直接返回 Creem 产品页（用户需要在 Creem 上完成支付）
  return `https://www.creem.io/checkout/${productId}`;
}
