import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/auth/verify-otp
export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "邮箱和验证码不能为空" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    // Find valid, unused OTP
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("email", normalized)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !otpRecord) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 401 });
    }

    // Mark OTP as used
    await supabaseAdmin
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // Create or update user in Supabase
    await supabaseAdmin
      .from("users")
      .upsert(
        { email: normalized, last_login: new Date().toISOString() },
        { onConflict: "email" }
      );

    // Set session cookie (30 days)
    const response = NextResponse.json({ success: true, email: normalized });
    response.cookies.set("session", normalized, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (e) {
    console.error("verify-otp error:", e);
    return NextResponse.json({ error: "验证失败，请稍后重试" }, { status: 500 });
  }
}
