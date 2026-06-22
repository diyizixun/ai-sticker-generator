import { getCheckoutUrl } from "@/lib/creem/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// 从 cookie 获取当前登录用户 email
function getSessionEmail(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(request: Request) {
  try {
    const { priceType } = await request.json();

    // 验证登录状态（从 cookie 读取 session）
    const email = getSessionEmail(request);
    if (!email) {
      return Response.json(
        { error: "Please sign in first" },
        { status: 401 }
      );
    }

    // 从 DB 获取用户 ID（supabaseAdmin 可能为 null，需判断）
    let userId = email;
    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();
      if (profile?.id) userId = profile.id;
    }

    // 确定产品 ID
    const productId =
      priceType === "yearly"
        ? process.env.CREEM_PRO_YEARLY_PRODUCT_ID!
        : process.env.CREEM_PRO_MONTHLY_PRODUCT_ID!;

    // 调 Creem API 获取真实 checkout URL
    const checkoutUrl = await getCheckoutUrl(
      productId,
      userId,
      email,
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
