import { NextRequest, NextResponse } from "next/server";
import { getClientId, checkQuota } from "@/lib/quota";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  // 优先检查登录用户（DB-backed quota）
  const session = req.cookies.get("session")?.value;
  if (session && supabaseAdmin) {
    const today = new Date().toISOString().split("T")[0];

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("plan, subscription_status")
      .eq("email", session)
      .single();

    const isPro = userRow?.plan === "pro" && userRow?.subscription_status === "active";
    const dailyLimit = isPro ? 9999 : 5;

    const { count } = await supabaseAdmin
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_email", session)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);

    const used = count || 0;
    const remaining = isPro ? 9999 : Math.max(0, dailyLimit - used);

    return NextResponse.json({
      allowed: remaining > 0 || isPro,
      remaining,
      limit: dailyLimit,
      plan: userRow?.plan || "free",
    });
  }

  // 匿名用户：内存 quota
  const clientId = getClientId(req);
  const quota = checkQuota(clientId);
  return NextResponse.json({
    allowed: quota.allowed,
    remaining: quota.remaining,
    limit: quota.limit,
    plan: "free",
  });
}
