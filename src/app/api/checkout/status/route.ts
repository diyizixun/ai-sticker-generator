import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// 从 cookie 获取当前登录用户 email
function getSessionEmail(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(request: NextRequest) {
  try {
    const email = getSessionEmail(request);
    if (!email) {
      return NextResponse.json({ isPro: false, error: "Not logged in" });
    }

    if (!supabaseAdmin) {
      console.error("Supabase admin client not initialized");
      return NextResponse.json({ isPro: false, error: "DB unavailable" });
    }

    // 同时检查 users 表和 profiles 表，取 OR 结果
    let isPro = false;
    let proSince: string | null = null;

    // 1. 查 users 表（generate / quota API 用这个）
    try {
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("plan, subscription_status")
        .eq("email", email.toLowerCase())
        .single();

      if (userRow?.plan === "pro" && userRow?.subscription_status === "active") {
        isPro = true;
      }
    } catch {
      // users 表可能没有该用户，忽略
    }

    // 2. 查 profiles 表（兼容）
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_pro, pro_since")
        .eq("email", email.toLowerCase())
        .single();

      if (profile?.is_pro) {
        isPro = true;
        proSince = profile.pro_since || proSince;
      }
    } catch {
      // profiles 表可能没有该用户，忽略
    }

    return NextResponse.json({
      isPro,
      proSince: proSince || null,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ isPro: false, error: "Check failed" });
  }
}
