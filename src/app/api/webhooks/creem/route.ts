import { verifyCreemWebhookSignature } from "@/lib/creem/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Creem webhook 验证 & 处理
// 文档: https://docs.creem.io/api-reference/endpoint/webhook
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("creem-signature") || "";
    const creemSignatureV1 = request.headers.get("creem-signature-v1") || "";

    console.log("[Creem Webhook] Received payload length:", payload.length);
    console.log("[Creem Webhook] Headers - creem-signature:", signature ? "present" : "missing");
    console.log("[Creem Webhook] Headers - creem-signature-v1:", creemSignatureV1 ? "present" : "missing");

    // 验证 webhook 签名（尝试两种可能的 header）
    const isValid = verifyCreemWebhookSignature(payload, signature) ||
                    verifyCreemWebhookSignature(payload, creemSignatureV1);

    if (!isValid) {
      console.error("[Creem Webhook] Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(payload);
    console.log("[Creem Webhook] Event type:", event.type);
    console.log("[Creem Webhook] Event data:", JSON.stringify(event.data));
    console.log("[Creem Webhook] Full event:", JSON.stringify(event, null, 2));

    // 处理支付成功事件
    // Creem event types: checkout.completed, subscription.paid, etc.
    if (
      event.type === "checkout.completed" ||
      event.type === "subscription.paid" ||
      event.type === "checkout.paid"
    ) {
      // 从 metadata 中获取用户 email（创建 checkout 时传入）
      const userEmail =
        event.data?.metadata?.user_email ||
        event.metadata?.user_email;

      if (userEmail && supabaseAdmin) {
        // 同时更新 users 表和 profiles 表（/api/generate 和 /api/quota 从 users 读 plan 字段）
        let updated = false;

        // 1. 更新 users 表（API 路由读这个表判断 isPro）
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("id, email")
          .eq("email", userEmail)
          .single();

        if (user) {
          const { error: userError } = await supabaseAdmin
            .from("users")
            .update({
              plan: "pro",
              subscription_status: "active",
            })
            .eq("id", user.id);

          if (userError) {
            console.error("[Creem] Failed to update users.plan:", userError);
          } else {
            console.log(`[Creem] users.plan set to pro for ${userEmail}`);
            updated = true;
          }
        }

        // 2. 同时更新 profiles 表（保持兼容）
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", userEmail)
          .single();

        if (profile) {
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
              is_pro: true,
              pro_since: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", profile.id);

          if (profileError) {
            console.error("[Creem] Failed to update profiles.is_pro:", profileError);
          } else if (!updated) {
            console.log(`[Creem] profiles.is_pro set for ${userEmail} (users table not found)`);
          }
        }

        if (!user && !profile) {
          console.error("[Creem] User not found in users or profiles by email:", userEmail);
        } else {
          console.log(`[Creem] User ${userEmail} upgraded to Pro (users:${!!user}, profiles:${!!profile})`);
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
