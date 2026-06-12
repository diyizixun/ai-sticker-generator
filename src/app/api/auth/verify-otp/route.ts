import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/quota";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/auth/verify-otp
export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "邮箱和验证码不能为空" }, { status: 400 });
    }

    const valid = verifyOTP(email, code);
    if (!valid) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 401 });
    }

    // Create or get user in Supabase
    const { data: user, error: dbError } = await supabaseAdmin
      .from("users")
      .upsert({ email: email.toLowerCase(), last_login: new Date().toISOString() }, { onConflict: "email" })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
    }

    // Set session cookie
    const response = NextResponse.json({ success: true, email: email.toLowerCase() });
    response.cookies.set("session", email.toLowerCase(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (e) {
    console.error("verify-otp error:", e);
    return NextResponse.json({ error: "验证失败，请稍后重试" }, { status: 500 });
  }
}
