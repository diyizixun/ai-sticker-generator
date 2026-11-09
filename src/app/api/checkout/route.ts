import { getCheckoutUrl, CREEM_PRODUCTS } from "@/lib/creem/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function getSessionEmail(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(request: Request) {
  try {
    const { priceType } = await request.json();

    const email = getSessionEmail(request);
    if (!email) {
      return Response.json(
        { error: "Please sign in first" },
        { status: 401 }
      );
    }

    const productId =
      priceType === "yearly" ? CREEM_PRODUCTS.proYearly : CREEM_PRODUCTS.proMonthly;

    const checkoutUrl = await getCheckoutUrl(productId, email);

    return Response.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error("Checkout error:", error);
    const msg = error?.message || "Failed to create checkout session";
    // 产品不存在返回 400，其他 500
    const status = msg.includes("不存在") || msg.includes("PRODUCT_NOT_FOUND") ? 400 : 500;
    return Response.json({ error: msg }, { status });
  }
}
