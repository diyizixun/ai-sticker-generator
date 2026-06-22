import { getCheckoutUrl } from "@/lib/creem/server";
import { getServerSession } from "@/lib/supabase/getServerSession";

export async function POST(request: Request) {
  try {
    const { priceType } = await request.json();

    // 验证登录状态
    const session = await getServerSession();
    if (!session) {
      return Response.json(
        { error: "Please sign in first" },
        { status: 401 }
      );
    }

    // 确定产品 ID
    const productId =
      priceType === "yearly"
        ? process.env.CREEM_PRO_YEARLY_PRODUCT_ID!
        : process.env.CREEM_PRO_MONTHLY_PRODUCT_ID!;

    // 调 Creem API 获取真实 checkout URL
    const checkoutUrl = await getCheckoutUrl(
      productId,
      session.user.id,
      session.user.email!,
    );

    return Response.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    return Response.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
