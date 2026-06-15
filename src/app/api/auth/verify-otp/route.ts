import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "邮箱和验证码不能为空" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "系统未配置" }, { status: 500 });
    }

    const normalized = email.toLowerCase().trim();

    const { data, error } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("email", normalized)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "验证码无效或已过期" }, { status: 400 });
    }

    // Mark as used
    await supabaseAdmin
      .from("otp_codes")
      .update({ used: true })
      .eq("id", data.id);

    // Create/update user
    await supabaseAdmin.from("users").upsert(
      { email: normalized, last_login: new Date().toISOString() },
      { onConflict: "email" }
    );

    const response = NextResponse.json({ success: true, email: normalized });
    response.cookies.set("session", normalized, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: "验证失败" }, { status: 500 });
  }
}
