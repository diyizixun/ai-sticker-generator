// /api/checkout - 创建Creem支付链接（POST）
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";

const CheckoutSchema = z.object({
  priceType: z.enum(["monthly", "yearly"]),
});

const CREEM_API_KEY = process.env.CREEM_API_KEY!;
const CREEM_BASE_URL = process.env.CREEM_API_BASE_URL || "https://api.creem.io";
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://aisticker.pics";

export async function POST(req: NextRequest) {
  try {
    // 1. 验证用户登录
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. 解析参数
    const body = await req.json();
    const { priceType } = CheckoutSchema.parse(body);

    // 3. 选择正确的产品ID
    const productId =
      priceType === "yearly"
        ? process.env.CREEM_PRO_YEARLY_PRODUCT_ID
        : process.env.CREEM_PRO_MONTHLY_PRODUCT_ID;

    if (!productId) {
      console.error("Missing product ID for priceType:", priceType);
      return NextResponse.json(
        { error: "Product not configured. Please check CREEM_PRO_MONTHLY_PRODUCT_ID and CREEM_PRO_YEARLY_PRODUCT_ID environment variables." },
        { status: 500 }
      );
    }

    if (!CREEM_API_KEY) {
      console.error("Missing CREEM_API_KEY");
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      );
    }

    // 4. 调用 Creem API 创建 checkout session
    // Creem 使用 x-api-key 认证头，不是 Authorization Bearer
    const creemRes = await fetch(`${CREEM_BASE_URL}/v1/checkouts`, {
      method: "POST",
      headers: {
        "x-api-key": CREEM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: productId,
        customer_email: user.email,
        success_url: `${BASE_URL}/settings?checkout=success`,
        cancel_url: `${BASE_URL}/settings?checkout=cancelled`,
        metadata: {
          user_id: (user as any).id || "",
        },
      }),
    });

    if (!creemRes.ok) {
      const errorText = await creemRes.text();
      console.error("Creem checkout error:", creemRes.status, errorText);
      return NextResponse.json(
        { error: `Creem API error: ${creemRes.status} ${errorText.slice(0, 300)}` },
        { status: 500 }
      );
    }

    const data = await creemRes.json();
    console.log("Creem checkout response:", JSON.stringify(data));

    // Creem 返回的 checkout_url 字段
    const checkoutUrl = data.checkout_url || data.url || data.checkout?.checkout_url;
    
    if (!checkoutUrl) {
      console.error("No checkout URL in Creem response:", data);
      return NextResponse.json(
        { error: "No checkout URL returned from payment provider" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
