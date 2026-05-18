// /api/billing - 订阅管理

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { cancelCreemSubscription } from "@/lib/creem/server";

// 获取订阅状态
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      plan: user.plan,
      subscriptionStatus: user.subscription_status,
      currentPeriodEnd: user.subscription_current_period_end,
    });
  } catch (error) {
    console.error("Billing status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing info" },
      { status: 500 }
    );
  }
}

// 取消订阅
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!user.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 }
      );
    }

    await cancelCreemSubscription(user.stripe_subscription_id);

    return NextResponse.json({
      message: "Subscription will be canceled at the end of the billing period",
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
