import { verifyCreemWebhookSignature } from "@/lib/creem/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Creem webhook — 修正后的处理逻辑
// 文档: https://docs.creem.io/code/webhooks
//
// Creem webhook payload 结构（关键修正）:
// {
//   "type": "checkout.completed",
//   "object": {                          ← 不是 event.data！
//     "customer": { "email": "..." },    ← 客户邮箱
//     "metadata": { "user_email": "..." }, ← 自定义元数据
//     "subscription": { "metadata": {...} }
//   }
// }

/**
 * 从 Creem webhook payload 中提取用户邮箱。
 * 按可靠性排序尝试多个路径。
 */
function extractUserEmail(event: Record<string, unknown>): string | null {
  const obj = event.object as Record<string, unknown> | undefined;

  // 1. 最可靠：customer.email（Creem 原生字段）
  const custEmail = (obj?.customer as Record<string, unknown> | undefined)?.email;
  if (typeof custEmail === "string" && custEmail.includes("@")) return custEmail.toLowerCase();

  // 2. metadata.user_email（checkout 时传入的自定义字段）
  const metaEmail = (obj?.metadata as Record<string, unknown> | undefined)?.user_email;
  if (typeof metaEmail === "string" && metaEmail.includes("@")) return metaEmail.toLowerCase();

  // 3. subscription.metadata.user_email
  const subMeta = (obj?.subscription as Record<string, unknown> | undefined)?.metadata as Record<string, unknown> | undefined;
  const subEmail = subMeta?.user_email;
  if (typeof subEmail === "string" && subEmail.includes("@")) return subEmail.toLowerCase();

  // 4. 兼容旧版：event.data.customer.email（如果 Creem 改版）
  const data = event.data as Record<string, unknown> | undefined;
  const dataCustEmail = (data?.customer as Record<string, unknown> | undefined)?.email;
  if (typeof dataCustEmail === "string" && dataCustEmail.includes("@")) return dataCustEmail.toLowerCase();

  const dataMetaEmail = (data?.metadata as Record<string, unknown> | undefined)?.user_email;
  if (typeof dataMetaEmail === "string" && dataMetaEmail.includes("@")) return dataMetaEmail.toLowerCase();

  return null;
}

/**
 * 判断是否为支付成功事件。
 * 兼容多种 Creem 事件类型和状态。
 */
function isPaymentSuccessEvent(event: Record<string, unknown>): boolean {
  const eventType = (event.type as string) || "";
  const paymentEvents = ["checkout.completed", "subscription.paid", "checkout.paid", "payment.succeeded"];

  if (paymentEvents.includes(eventType)) return true;

  // 有些版本 event.type 可能为空，改用 object.status 判断
  const obj = event.object as Record<string, unknown> | undefined;
  if (obj?.status === "completed") return true;

  // 检查 subscription 状态
  const sub = obj?.subscription as Record<string, unknown> | undefined;
  if (sub?.status === "active") return true;

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("creem-signature") || "";
    const creemSignatureV1 = request.headers.get("creem-signature-v1") || "";

    console.log("[Creem Webhook] Payload length:", payload.length);
    console.log("[Creem Webhook] creem-signature:", signature ? "present" : "missing");
    console.log("[Creem Webhook] creem-signature-v1:", creemSignatureV1 ? "present" : "missing");

    // 验证签名
    const isValid =
      verifyCreemWebhookSignature(payload, signature) ||
      verifyCreemWebhookSignature(payload, creemSignatureV1);

    if (!isValid) {
      console.error("[Creem Webhook] ❌ Invalid signature — rejecting");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(payload);
    console.log("[Creem Webhook] Event type:", event.type || "N/A");

    // 记录关键字段用于调试
    const obj = event.object as Record<string, unknown> | undefined;
    console.log("[Creem Webhook] object.customer.email:", (obj?.customer as any)?.email || "N/A");
    console.log("[Creem Webhook] object.metadata:", JSON.stringify(obj?.metadata || {}));
    console.log("[Creem Webhook] Full event:", JSON.stringify(event, null, 2));

    // 判断是否是支付成功事件
    if (!isPaymentSuccessEvent(event)) {
      console.log(`[Creem Webhook] Skipping non-payment event: ${event.type || "unknown"}`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // 提取用户邮箱
    const userEmail = extractUserEmail(event);
    if (!userEmail) {
      console.error("[Creem Webhook] ❌ Cannot extract user email from payload!");
      console.error("[Creem Webhook] Full payload for debug:", JSON.stringify(event));
      return NextResponse.json(
        { received: true, error: "Missing user email", skipped: true },
        { status: 200 }
      );
    }

    console.log(`[Creem Webhook] ✅ Extracted user email: ${userEmail}`);

    if (!supabaseAdmin) {
      console.error("[Creem Webhook] ❌ supabaseAdmin not initialized");
      return NextResponse.json({ received: true, error: "DB not available" }, { status: 500 });
    }

    // ── 更新数据库 ──
    let usersUpdated = false;
    let profilesUpdated = false;

    // 1. 更新 users 表（generate API / quota API 读这个表判断 Pro 状态）
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
        console.error(`[Creem Webhook] ❌ Failed to update users.plan for ${userEmail}:`, userError);
      } else {
        console.log(`[Creem Webhook] ✅ users.plan = pro for ${userEmail}`);
        usersUpdated = true;
      }
    } else {
      console.warn(`[Creem Webhook] ⚠️ User not found in users table: ${userEmail}`);
    }

    // 2. 更新 profiles 表（checkout/status API 读这个表）
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
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
        console.error(`[Creem Webhook] ❌ Failed to update profiles.is_pro for ${userEmail}:`, profileError);
      } else {
        console.log(`[Creem Webhook] ✅ profiles.is_pro = true for ${userEmail}`);
        profilesUpdated = true;
      }
    } else {
      console.warn(`[Creem Webhook] ⚠️ User not found in profiles table: ${userEmail}`);
    }

    // 如果用户不在 profiles 表但 users 表已更新，尝试在 profiles 创建记录
    if (usersUpdated && !profilesUpdated) {
      const { error: insertError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          email: userEmail,
          is_pro: true,
          pro_since: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error(`[Creem Webhook] ❌ Failed to upsert profiles for ${userEmail}:`, insertError);
      } else {
        console.log(`[Creem Webhook] ✅ Created profiles record for ${userEmail}`);
      }
    }

    // 如果用户完全不在任何表中
    if (!user && !profile) {
      console.error(`[Creem Webhook] ❌ CRITICAL: User ${userEmail} not found in users OR profiles table!`);
      console.error(`[Creem Webhook] User must sign in/register before purchasing Pro.`);
    } else {
      console.log(`[Creem Webhook] 🎉 Successfully upgraded ${userEmail} to Pro (users:${usersUpdated}, profiles:${profilesUpdated})`);
    }

    return NextResponse.json({ received: true, upgraded: usersUpdated || profilesUpdated });
  } catch (error) {
    console.error("[Creem Webhook] ❌ Unexpected error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
