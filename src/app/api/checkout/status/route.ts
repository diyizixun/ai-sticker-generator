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
      return NextResponse.json({ isPro: false });
    }

    if (!supabaseAdmin) {
      console.error("Supabase admin client not initialized");
      return NextResponse.json({ isPro: false });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("is_pro, pro_since")
      .eq("email", email)
      .single();

    if (error) {
      console.error("Failed to fetch profile:", error);
      return NextResponse.json({ isPro: false });
    }

    return NextResponse.json({
      isPro: profile?.is_pro || false,
      proSince: profile?.pro_since || null,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ isPro: false });
  }
}
