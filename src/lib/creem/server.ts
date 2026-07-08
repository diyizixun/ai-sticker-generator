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
// 官方文档: https://docs.creem.io/features/checkout/checkout-api
//
// ✅ 实测确认（2026-07-08）：
// - 认证头：x-api-key（不是 Authorization: Bearer！）
// - 响应字段：checkout_url（snake_case）
// - checkout_url 格式：https://creem.io/checkout/{product_id}/{checkout_id}
//   （既不是 checkout.creem.io/p/{id}，也不是 checkout.creem.io/{id}）
export async function getCheckoutUrl(
  productId: string,
  userEmail: string,
): Promise<string> {
  const apiKey = process.env.CREEM_API_KEY;

  // 使用 Creem API 创建 checkout session
  if (apiKey) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aisticker.pics";
      const response = await fetch("https://api.creem.io/v1/checkouts", {
        method: "POST",
        headers: {
          // ✅ 官方文档 + 实测确认：x-api-key，不是 Authorization: Bearer
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          request_id: `user_${userEmail}_${Date.now()}`,
          success_url: `${baseUrl}/pricing?checkout_id={CHECKOUT_ID}`,
          // customer.email 是 Creem 原生字段
          customer: {
            email: userEmail,
          },
          metadata: {
            user_email: userEmail,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Creem API] 创建 checkout 成功:', JSON.stringify(data));
        // ✅ 响应字段是 checkout_url（snake_case）
        if (typeof data.checkout_url === 'string' && data.checkout_url) {
          return data.checkout_url;
        }
        // 兼容 SDK camelCase 格式
        if (typeof data.checkoutUrl === 'string' && data.checkoutUrl) {
          return data.checkoutUrl;
        }
      } else {
        const errText = await response.text();
        console.error('[Creem API] 创建 checkout 失败:', response.status, errText);
      }
    } catch (err) {
      console.error('[Creem API] 网络错误:', err);
    }
  }

  // 降级：直接用 creem.io/checkout/{product_id}（实测可访问的基础格式）
  // 注意：不带 checkout_id 也能跳转，Creem 会自动生成
  console.log('[Creem API] 降级到托管 checkout 页面');
  return `https://creem.io/checkout/${productId}`;
}
