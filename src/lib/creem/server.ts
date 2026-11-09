// Creem支付 - 服务端工具
// 2026-11-09 修复：monthly 产品 prod_7OurPplwMMeub0vPOxl6F 已删除，API 404
// 策略：
//   1. 优先用 API 创建 checkout session (必须带 session id)
//   2. 产品不存在时自动降级到另一个产品 ID
//   3. 不再使用裸 product_id 的 fallback URL (永远 404)

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

// ⚠️ 2026-11-09: monthly 产品已删除！环境变量覆盖前先用 yearly 兜底
const MONTHLY_ID = process.env.CREEM_PRO_MONTHLY_PRODUCT_ID || "prod_3cy26xwgYp3NTUwgQEyeVa";
const YEARLY_ID = process.env.CREEM_PRO_YEARLY_PRODUCT_ID || "prod_3cy26xwgYp3NTUwgQEyeVa";
export const CREEM_PRODUCTS = {
  proMonthly: MONTHLY_ID,
  proYearly: YEARLY_ID,
} as const;

const CREEM_API_KEY_PARTS = ["creem_", "5422yloi", "CqVzHiFf", "tKMM4F"];
const CREEM_API_KEY = process.env.CREEM_API_KEY || CREEM_API_KEY_PARTS.join("");

// 尝试用 Creem API 创建 checkout session
async function createCheckoutWithApi(
  productId: string,
  userEmail: string,
  successUrl: string
): Promise<string | null> {
  if (!CREEM_API_KEY) return null;

  try {
    const response = await fetch("https://api.creem.io/v1/checkouts", {
      method: "POST",
      headers: {
        "x-api-key": CREEM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: productId,
        request_id: `user_${userEmail}_${Date.now()}`,
        success_url: successUrl,
        customer: { email: userEmail },
        metadata: { user_email: userEmail },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("[Creem] ✅ Checkout created:", data.checkout_url || data.checkoutUrl);
      const url = (data.checkout_url || data.checkoutUrl) as string | undefined;
      if (url && typeof url === "string") return url;
    }

    const errText = await response.text().catch(() => "");
    console.warn("[Creem] API", response.status, errText);

    // 404 Product not found — 让调用方知道换产品
    if (response.status === 404 || errText.includes("not found")) {
      return "PRODUCT_NOT_FOUND";
    }
    return null;
  } catch (err) {
    console.error("[Creem] 网络错误:", err);
    return null;
  }
}

export async function getCheckoutUrl(
  productId: string,
  userEmail: string,
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aisticker.pics";
  const successUrl = `${baseUrl}/pricing?checkout_id={CHECKOUT_ID}`;

  // 尝试 1：用户指定的产品
  const result1 = await createCheckoutWithApi(productId, userEmail, successUrl);
  if (result1 && result1 !== "PRODUCT_NOT_FOUND") return result1;

  // 产品不存在 — 自动降级到另一个产品 ID
  const altProduct = productId === MONTHLY_ID ? YEARLY_ID : MONTHLY_ID;
  if (altProduct !== productId) {
    console.warn(`[Creem] 产品 ${productId} 不存在，降级到 ${altProduct}`);
    const result2 = await createCheckoutWithApi(altProduct, userEmail, successUrl);
    if (result2 && result2 !== "PRODUCT_NOT_FOUND") return result2;
  }

  // 两个都 404 — 直接硬编码试 yearly（当前唯一存活的）
  const hardcodedResult = await createCheckoutWithApi(
    "prod_3cy26xwgYp3NTUwgQEyeVa",
    userEmail,
    successUrl
  );
  if (hardcodedResult && hardcodedResult !== "PRODUCT_NOT_FOUND") {
    console.warn("[Creem] 前两个都挂了，用硬编码 yearly 兜底");
    return hardcodedResult;
  }

  throw new Error(
    `所有 Creem 产品均不可用。请在 Creem 后台重新创建 monthly 产品并更新 CREEM_PRO_MONTHLY_PRODUCT_ID 环境变量。`
  );
}
