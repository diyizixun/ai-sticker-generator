import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

const CREEM_BASE_URL = process.env.CREEM_BASE_URL || "https://api.creem.io/v1";
const CREEM_API_KEY = process.env.CREEM_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://aisticker.pics";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const plan = searchParams.get("plan") || "monthly";

    const productId =
      plan === "yearly"
        ? process.env.CREEM_PRO_YEARLY_PRODUCT_ID
        : process.env.CREEM_PRO_MONTHLY_PRODUCT_ID;

    if (!productId) {
      return NextResponse.json({ error: "Product not configured" }, { status: 500 });
    }

    const creemRes = await fetch(`${CREEM_BASE_URL}/checkout`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CREEM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: productId,
        customer_email: session.user.email,
        success_url: `${BASE_URL}/settings?checkout=success`,
        cancel_url: `${BASE_URL}/settings?checkout=canceled`,
        metadata: {
          user_id: (session.user as any).id || "",
        },
      }),
    });

    if (!creemRes.ok) {
      const error = await creemRes.text();
      console.error("Creem checkout error:", error);
      return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
    }

    const data = await creemRes.json();
    return NextResponse.json({ url: data.checkout_url || data.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
