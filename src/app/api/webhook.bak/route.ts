// /api/webhook - Creem Webhook处理

import { NextRequest, NextResponse } from "next/server";
import { verifyCreemWebhookSignature } from "@/lib/creem/server";
import {
  findUserById,
  updateUserStripeInfo,
} from "@/lib/db/users";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-creem-signature") || "";

    // 1. 验证签名（如果配置了webhook secret）
    if (process.env.CREEM_WEBHOOK_SECRET) {
      if (!verifyCreemWebhookSignature(body, signature)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(body);

    // 2. 处理不同事件
    switch (event.event_type || event.type) {
      case "payment.succeeded": {
        const data = event.data || event.object;
        const userId = data.metadata?.userId || data.customer_id;

        if (userId) {
          // 升级为Pro
          await updateUserStripeInfo(userId, {
            plan: "pro",
            subscription_status: "active",
            stripe_subscription_id: data.subscription_id || data.id,
            stripe_customer_id: data.customer_id,
          });

          // 记录支付
          try {
            const supabase = createServerSupabaseClient();
            await supabase.from("payments").insert({
              user_id: userId,
              stripe_payment_intent_id: data.payment_id || data.id,
              stripe_subscription_id: data.subscription_id,
              amount_cents: (data.amount || 0) * 100,
              currency: data.currency || "usd",
              status: "succeeded",
              description: "Pro subscription",
            });
          } catch (dbErr) {
            console.error("Payment record error:", dbErr);
          }
        }
        break;
      }

      case "subscription.canceled": {
        const data = event.data || event.object;
        const userId = data.metadata?.userId || data.customer_id;

        if (userId) {
          await updateUserStripeInfo(userId, {
            plan: "free",
            subscription_status: "canceled",
          });
        }
        break;
      }

      case "subscription.renewed": {
        const data = event.data || event.object;
        const userId = data.metadata?.userId || data.customer_id;

        if (userId) {
          await updateUserStripeInfo(userId, {
            plan: "pro",
            subscription_status: "active",
          });

          // 记录续费
          try {
            const supabase = createServerSupabaseClient();
            await supabase.from("payments").insert({
              user_id: userId,
              stripe_invoice_id: data.payment_id || data.id,
              stripe_subscription_id: data.subscription_id,
              amount_cents: (data.amount || 0) * 100,
              currency: data.currency || "usd",
              status: "succeeded",
              description: "Pro subscription renewal",
            });
          } catch (dbErr) {
            console.error("Renewal record error:", dbErr);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled Creem event: ${event.event_type || event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Creem Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
