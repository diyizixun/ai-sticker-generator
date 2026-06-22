import { NextRequest, NextResponse } from "next/server";
import { getCheckoutUrl } from "@/lib/creem/server";

/**
 * POST /api/checkout
 * Body: { priceType: "monthly" | "yearly" }
 * 返回: { url: string }
 *
 * 使用 Creem 支付（中国大陆身份证+支付宝即可收款）
 */
export async function POST(req: NextRequest) {
  try {
    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.json(
        { error: "Please sign in first" },
        { status: 401 }
      );
    }

    const { priceType } = await req.json();
    if (!priceType || (priceType !== "monthly" && priceType !== "yearly")) {
      return NextResponse.json(
        { error: "Invalid priceType, must be 'monthly' or 'yearly'" },
        { status: 400 }
      );
    }

    const productId =
      priceType === "monthly"
        ? process.env.CREEM_PRO_MONTHLY_PRODUCT_ID
        : process.env.CREEM_PRO_YEARLY_PRODUCT_ID;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID not configured. Please set CREEM_PRO_MONTHLY_PRODUCT_ID / CREEM_PRO_YEARLY_PRODUCT_ID in environment variables." },
        { status: 500 }
      );
    }

    const checkoutUrl = getCheckoutUrl(productId, session);

    return NextResponse.json({ url: checkoutUrl });
  } catch (e: any) {
    console.error("[Checkout] Error:", e);
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}
