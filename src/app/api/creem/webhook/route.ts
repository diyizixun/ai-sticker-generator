import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const CREEM_WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const signature = req.headers.get("creem-signature") || "";

    if (CREEM_WEBHOOK_SECRET && signature) {
      // TODO: verify signature
    }

    const { event_type, object } = body;
    console.log("Creem webhook:", event_type, object);

    switch (event_type) {
      case "checkout.completed": {
        const { customer_email, metadata } = object;
        if (!customer_email) break;

        const { data: user } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", customer_email)
          .single();

        if (user) {
          await supabaseAdmin
            .from("users")
            .update({
              plan: "pro",
              subscription_status: "active",
              subscription_id: object.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);
        }
        break;
      }

      case "subscription.canceled":
      case "subscription.expired": {
        const { customer_email } = object;
        if (!customer_email) break;

        const { data: user } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", customer_email)
          .single();

        if (user) {
          await supabaseAdmin
            .from("users")
            .update({
              plan: "free",
              subscription_status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);
        }
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
