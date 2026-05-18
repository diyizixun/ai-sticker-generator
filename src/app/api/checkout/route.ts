// /api/checkout - 创建Creem支付链接

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCheckoutUrl, CREEM_PRODUCTS } from "@/lib/creem/server";
import { z } from "zod";

const CheckoutSchema = z.object({
  priceType: z.enum(["monthly", "yearly"]),
});

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

    // 3. 选择产品
    const productId =
      priceType === "monthly"
        ? CREEM_PRODUCTS.proMonthly
        : CREEM_PRODUCTS.proYearly;

    if (!productId) {
      return NextResponse.json(
        { error: "Payment not configured yet. Please try again later." },
        { status: 503 }
      );
    }

    // 4. 生成Checkout URL
    const checkoutUrl = getCheckoutUrl(productId, user.id);

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
