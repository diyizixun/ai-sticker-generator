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
    console.log("Creem webhook event:", event.type, JSON.stringify(event.data));

    // 处理支付成功事件
    // Creem event types: checkout.paid, subscription.paid, etc.
    if (
      event.type === "checkout.paid" ||
      event.type === "subscription.paid" ||
      event.type === "payment.succeeded"
    ) {
      // 从 metadata 中获取用户 email（创建 checkout 时传入）
      const userEmail =
        event.data?.metadata?.user_email ||
        event.metadata?.user_email;

      if (userEmail && supabaseAdmin) {
        // 根据 email 查找用户 id
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", userEmail)
          .single();

        if (profile) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              is_pro: true,
              pro_since: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", profile.id);

          if (error) {
            console.error("Failed to update user to Pro:", error);
          } else {
            console.log(`User ${userEmail} upgraded to Pro`);
          }
        } else {
          console.error("Webhook: user not found by email:", userEmail);
        }
      } else {
        console.log("Webhook: no userEmail in metadata, event data:", JSON.stringify(event.data));
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
