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
 * ⚠️ 2026-11-25 基于真实 Creem payload 结构重写！
 * 真实结构: {
 *   "type": "checkout.completed",
 *   "request_id": "user@domain.com_timestamp",    ← 路径 1
 *   "order": {                                      ← 路径 2
 *     "customer": { "email": "user@domain.com" }
 *   },
 *   "subscription": {                               ← 路径 3
 *     "customer_email": "user@domain.com",
 *     "metadata": { "user_email": "..." }
 *   }
 * }
 */
function extractUserEmail(event: Record<string, unknown>): string | null {
  const eventType = (event.type as string) || "";

  // ⭐ 路径 1: request_id 里直接带邮箱（checkout 时 our code 传的 request_id）
  //    格式: "user@domain.com_timestamp" → 取 @ 开头那部分
  const requestId = event.request_id as string | undefined;
  if (requestId && requestId.includes("@")) {
    const match = requestId.match(/([\w.+-]+@[\w-]+\.[\w.-]+)/);
    if (match) return match[1].toLowerCase();
  }

  // ⭐ 路径 2: order.customer.email（checkout.completed 事件）
  const order = event.order as Record<string, unknown> | undefined;
  if (order) {
    const oCust = order.customer as Record<string, unknown> | undefined;
    if (oCust?.email && typeof oCust.email === "string" && oCust.email.includes("@")) {
      return (oCust.email as string).toLowerCase();
    }
  }

  // ⭐ 路径 3: subscription 对象（subscription.active / subscription.paid 事件）
  const sub = event.subscription as Record<string, unknown> | undefined;
  if (sub) {
    // subscription.customer_email
    const subCustEmail = sub.customer_email as string | undefined;
    if (subCustEmail && subCustEmail.includes("@")) return subCustEmail.toLowerCase();

    // subscription.metadata.user_email
    const subMeta = sub.metadata as Record<string, unknown> | undefined;
    const subMetaEmail = subMeta?.user_email as string | undefined;
    if (subMetaEmail && subMetaEmail.includes("@")) return subMetaEmail.toLowerCase();
  }

  // ⭐ 路径 4: customer 直接在根（某些事件）
  const cust = event.customer as Record<string, unknown> | undefined;
  if (cust?.email && typeof cust.email === "string" && cust.email.includes("@")) {
    return (cust.email as string).toLowerCase();
  }

  // 旧路径 fallback：event.object.*（我们之前假设的，可能某些场景 Creem 还保留）
  const obj = event.object as Record<string, unknown> | undefined;
  if (obj) {
    const oCust = obj.customer as Record<string, unknown> | undefined;
    if (oCust?.email && typeof oCust.email === "string" && oCust.email.includes("@")) {
      return (oCust.email as string).toLowerCase();
    }
    const oSubCust = (obj.subscription as Record<string, unknown> | undefined)?.customer_email as string | undefined;
    if (oSubCust && oSubCust.includes("@")) return oSubCust.toLowerCase();
    const oMeta = obj.metadata as Record<string, unknown> | undefined;
    const oMetaEmail = oMeta?.user_email as string | undefined;
    if (oMetaEmail && oMetaEmail.includes("@")) return oMetaEmail.toLowerCase();
  }

  // 最后 fallback: request_id 里搜 @xxx
  if (requestId) {
    const atIdx = requestId.indexOf("@");
    if (atIdx > 0) {
      const email = requestId.substring(0, atIdx);
      const domainStart = atIdx + 1;
      const underscoreIdx = requestId.indexOf("_", domainStart);
      const domain = underscoreIdx > 0 ? requestId.substring(domainStart, underscoreIdx) : requestId.substring(domainStart);
      return `${email}@${domain}`.toLowerCase();
    }
  }

  console.error("[Creem Webhook] ❌ extractUserEmail failed! Full payload keys:", Object.keys(event));
  return null;
}

/**
 * 判断是否为支付成功事件。
 * 兼容多种 Creem 事件类型和状态。
 */
function isPaymentSuccessEvent(event: Record<string, unknown>): boolean {
  const eventType = (event.type as string) || "";
  const paymentEvents = [
    "checkout.completed",
    "checkout.paid",
    "payment.succeeded",
    "subscription.active",
    "subscription.paid",
    "subscription.trialing",
  ];

  if (paymentEvents.includes(eventType)) return true;

  // 根层级 status
  const rootStatus = event.status as string | undefined;
  if (rootStatus === "completed" || rootStatus === "active" || rootStatus === "paid") return true;

  // order.status
  const order = event.order as Record<string, unknown> | undefined;
  const orderStatus = order?.status as string | undefined;
  if (orderStatus === "completed" || orderStatus === "paid") return true;

  // subscription.status
  const sub = event.subscription as Record<string, unknown> | undefined;
  const subStatus = sub?.status as string | undefined;
  if (subStatus === "active" || subStatus === "trialing" || subStatus === "paid") return true;

  // 旧 fallback: event.object.*
  const obj = event.object as Record<string, unknown> | undefined;
  if (obj) {
    if (obj.status === "completed" || obj.status === "active") return true;
    const oSub = obj.subscription as Record<string, unknown> | undefined;
    if (oSub?.status === "active" || oSub?.status === "trialing") return true;
  }

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
    const errors: string[] = [];

    const now = new Date().toISOString();

    // 1. users 表 — 先 insert（可能第一次就成），如果冲突就 update
    const { error: insertErr } = await supabaseAdmin
      .from("users")
      .insert({
        email: userEmail,
        plan: "pro",
        subscription_status: "active",
      });

    if (insertErr) {
      // 可能已存在 → update
      const { error: updateErr } = await supabaseAdmin
        .from("users")
        .update({ plan: "pro", subscription_status: "active" })
        .eq("email", userEmail);

      if (updateErr) {
        errors.push(`users: ${insertErr.message} / update: ${updateErr.message}`);
        console.error(`[Creem Webhook] ❌ users insert+update 都失败:`, insertErr.message, "|", updateErr.message);
      } else {
        usersUpdated = true;
        console.log(`[Creem Webhook] ✅ users.update plan=pro for ${userEmail}`);
      }
    } else {
      usersUpdated = true;
      console.log(`[Creem Webhook] ✅ users.insert plan=pro for ${userEmail}`);
    }

    // 2. profiles 表
    const { error: pInsertErr } = await supabaseAdmin
      .from("profiles")
      .insert({ email: userEmail, is_pro: true, pro_since: now });

    if (pInsertErr) {
      const { error: pUpdateErr } = await supabaseAdmin
        .from("profiles")
        .update({ is_pro: true, pro_since: now })
        .eq("email", userEmail);

      if (pUpdateErr) {
        errors.push(`profiles: ${pInsertErr.message} / update: ${pUpdateErr.message}`);
        console.warn(`[Creem Webhook] ⚠️ profiles 失败:`, pInsertErr.message);
      } else {
        profilesUpdated = true;
      }
    } else {
      profilesUpdated = true;
    }

    return NextResponse.json({
      received: true,
      upgraded: usersUpdated || profilesUpdated,
      usersUpdated,
      profilesUpdated,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    console.error("[Creem Webhook] ❌ Unexpected error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
