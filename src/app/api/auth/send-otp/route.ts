import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendOTPEmail } from "@/lib/mailer";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/auth/send-otp
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    // Rate limiting: check last OTP sent within 60s
    const { data: recent } = await supabaseAdmin
      .from("otp_codes")
      .select("created_at")
      .eq("email", normalized)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      const lastSent = new Date(recent.created_at).getTime();
      if (Date.now() - lastSent < 60000) {
        return NextResponse.json({ error: "请 60 秒后再试" }, { status: 429 });
      }
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Supabase
    const { error: insertError } = await supabaseAdmin
      .from("otp_codes")
      .insert({
        email: normalized,
        code,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (insertError) {
      console.error("Insert OTP error:", insertError);
      return NextResponse.json({ error: "发送验证码失败，请稍后重试" }, { status: 500 });
    }

    // Send email
    await sendOTPEmail(email, code);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("send-otp error:", e);
    return NextResponse.json({ error: "发送验证码失败，请稍后重试" }, { status: 500 });
  }
}
