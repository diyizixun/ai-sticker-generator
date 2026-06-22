import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyCreemWebhookSignature } from "@/lib/creem/server";

/**
 * POST /api/webhooks/creem
 *
 * Creem 支付成功/订阅变更时回调此接口
 * 事件类型：payment.succeeded, subscription.created, subscription.cancelled 等
 */
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-creem-signature") || "";
    const rawBody = await req.text();

    // 验证签名
    const isValid = verifyCreemWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error("[Creem Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const { event_type, data } = event;

    console.log("[Creem Webhook]", event_type, data);

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // 根据事件类型处理
    switch (event_type) {
      case "payment.succeeded":
      case "subscription.created":
      case "subscription.renewed": {
        const email = data.customer_email || data.customer?.email;
        const subscriptionId = data.id || data.subscription_id;

        if (email) {
          await supabaseAdmin
            .from("users")
            .update({
              plan: "pro",
              subscription_status: "active",
              stripe_subscription_id: subscriptionId || null,
              updated_at: new Date().toISOString(),
            })
            .eq("email", email);
          console.log(`[Creem Webhook] Upgraded ${email} to Pro`);
        }
        break;
      }

      case "subscription.cancelled":
      case "subscription.expired": {
        const email = data.customer_email || data.customer?.email;

        if (email) {
          await supabaseAdmin
            .from("users")
            .update({
              plan: "free",
              subscription_status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("email", email);
          console.log(`[Creem Webhook] Downgraded ${email} to Free`);
        }
        break;
      }

      default:
        console.log(`[Creem Webhook] Unhandled event: ${event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[Creem Webhook] Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
