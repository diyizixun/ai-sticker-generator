// /api/checkout - 创建Creem支付链接（POST）
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";

const CheckoutSchema = z.object({
  priceType: z.enum(["monthly", "yearly"]),
});

const CREEM_API_KEY = process.env.CREEM_API_KEY!;
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
      return NextResponse.json(
        { error: "Product not configured" },
        { status: 500 }
      );
    }

    // 4. 调用 Creem API 创建 checkout session
    const creemRes = await fetch("https://api.creem.io/v1/checkout", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CREEM_API_KEY}`,
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
      const error = await creemRes.text();
      console.error("Creem checkout error:", error);
      return NextResponse.json(
        { error: "Failed to create checkout" },
        { status: 500 }
      );
    }

    const data = await creemRes.json();
    return NextResponse.json({ url: data.checkout_url || data.url });
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
