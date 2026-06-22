import { verifyCreemWebhookSignature } from "@/lib/creem/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Creem webhook 验证 & 处理
// 文档: https://docs.creem.io/api-reference/endpoint/webhook
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("creem-signature") || "";

    // 验证 webhook 签名
    const isValid = verifyCreemWebhookSignature(payload, signature);
    if (!isValid) {
      console.error("Invalid Creem webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(payload);
    console.log("Creem webhook event:", event.type, event.data?.id);

    // 处理支付成功事件
    // 注意: Creem webhook event type 可能不同，常见是 checkout.paid 或 subscription.paid
    if (
      event.type === "checkout.paid" ||
      event.type === "subscription.paid" ||
      event.type === "payment.succeeded"
    ) {
      const userId = event.data?.metadata?.userId || event.metadata?.userId;
      if (userId) {
        // 标记用户为 Pro
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            is_pro: true,
            pro_since: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (error) {
          console.error("Failed to update user to Pro:", error);
        } else {
          console.log(`User ${userId} upgraded to Pro`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
