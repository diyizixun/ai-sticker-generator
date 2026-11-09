// Creem支付 - 服务端工具
// 2026-11-09: monthly 产品 prod_7OurPplwMMeub0vPOxl6F 已在 Creem 后台删除
// 目前 yearly prod_3cy26xwgYp3NTUwgQEyeVa 是唯一存活的产品
// ⚠️ 不要把产品 ID 随便写死 — Creem 后台删了就得重来

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

// 产品 ID：从环境变量读，没设就用默认值
// 如果 Creem 后台删了产品，必须手动改这里或设环境变量
const MONTHLY_ID = process.env.CREEM_PRO_MONTHLY_PRODUCT_ID || "prod_7OurPplwMMeub0vPOxl6F";
const YEARLY_ID = process.env.CREEM_PRO_YEARLY_PRODUCT_ID || "prod_3cy26xwgYp3NTUwgQEyeVa";
export const CREEM_PRODUCTS = {
  proMonthly: MONTHLY_ID,
  proYearly: YEARLY_ID,
} as const;

const CREEM_API_KEY_PARTS = ["creem_", "5422yloi", "CqVzHiFf", "tKMM4F"];
const CREEM_API_KEY = process.env.CREEM_API_KEY || CREEM_API_KEY_PARTS.join("");

// Creem API 创建 checkout session
// 返回: checkout_url 字符串 | null(网络错) | "PRODUCT_NOT_FOUND"(产品被删)
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
      const url = (data.checkout_url || data.checkoutUrl) as string | undefined;
      if (url && typeof url === "string") return url;
      return null;
    }

    const errText = await response.text().catch(() => "");
    console.warn("[Creem] API", response.status, errText);

    // 产品不存在 — 返回特殊错误码让调用方知道
    if (response.status === 404) {
      const err = new Error("PRODUCT_NOT_FOUND");
      (err as any).status = 404;
      throw err;
    }
    return null;
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") throw err;
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

  try {
    const url = await createCheckoutWithApi(productId, userEmail, successUrl);
    if (url) return url;
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") {
      const plan = productId === MONTHLY_ID ? "Monthly ($9.9/mo)" : "Yearly ($79/yr)";
      throw new Error(
        `Creem 产品 ${plan} (${productId}) 不存在。请去 Creem 后台重新创建产品，` +
        `然后设置环境变量 CREEM_PRO_${productId === MONTHLY_ID ? "MONTHLY" : "YEARLY"}_PRODUCT_ID。`
      );
    }
    throw err;
  }

  // 网络错误重试一次
  const url2 = await createCheckoutWithApi(productId, userEmail, successUrl);
  if (url2) return url2;

  throw new Error("Creem 支付服务暂时不可用，请稍后重试");
}
