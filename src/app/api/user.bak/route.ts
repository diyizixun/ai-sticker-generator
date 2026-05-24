// /api/user - 用户个人信息和生成历史

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserGenerations, checkGenerationQuota } from "@/lib/db/users";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [quota, generations] = await Promise.all([
      checkGenerationQuota(user.id),
      getUserGenerations(user.id, 20),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        subscriptionStatus: user.subscription_status,
        currentPeriodEnd: user.subscription_current_period_end,
        totalGenerations: user.total_generations,
        createdAt: user.created_at,
      },
      quota,
      generations,
    });
  } catch (error) {
    console.error("User profile error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
