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
  } catch (error) {
    console.error("Checkout error:", error);
    return Response.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
