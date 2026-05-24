import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyCreemWebhookSignature } from "@/lib/creem/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const signature = req.headers.get("creem-signature") || "";

    // 验证 webhook 签名
    if (process.env.CREEM_WEBHOOK_SECRET && signature) {
      const payload = JSON.stringify(body);
      const isValid = verifyCreemWebhookSignature(payload, signature);
      if (!isValid) {
        console.error("Invalid Creem webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.warn("CREEM_WEBHOOK_SECRET not set, skipping signature verification");
    }

    const { event_type, object } = body;
    console.log("Creem webhook:", event_type, object);

    switch (event_type) {
      case "checkout.completed": {
        const { customer_email, metadata } = object;
        if (!customer_email) break;

        if (!supabaseAdmin) {
          console.error("Supabase admin not initialized");
          break;
        }

        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", customer_email)
          .single();

        if (error || !user) {
          console.error("User not found:", customer_email, error);
          break;
        }

        await supabaseAdmin
          .from("users")
          .update({
            plan: "pro",
            subscription_status: "active",
            subscription_id: object.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        break;
      }

      case "subscription.canceled":
      case "subscription.expired": {
        const { customer_email } = object;
        if (!customer_email) break;

        if (!supabaseAdmin) {
          console.error("Supabase admin not initialized");
          break;
        }

        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", customer_email)
          .single();

        if (error || !user) {
          console.error("User not found:", customer_email, error);
          break;
        }

        await supabaseAdmin
          .from("users")
          .update({
            plan: "free",
            subscription_status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        break;
      }

      default:
        console.log("Unhandled event:", event_type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
