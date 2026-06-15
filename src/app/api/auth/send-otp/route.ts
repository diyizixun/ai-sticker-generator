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
    try {
      const { data: recent, error: selectErr } = await supabaseAdmin
        .from("otp_codes")
        .select("created_at")
        .eq("email", normalized)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectErr) {
        return NextResponse.json({ error: "DB查询失败", detail: selectErr.message }, { status: 500 });
      }

      if (recent) {
        const lastSent = new Date(recent.created_at).getTime();
        if (Date.now() - lastSent < 60000) {
          return NextResponse.json({ error: "请 60 秒后再试" }, { status: 429 });
        }
      }
    } catch (e: any) {
      return NextResponse.json({ error: "DB查询异常", detail: e.message }, { status: 500 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP in Supabase
    try {
      const { error: insertError } = await supabaseAdmin
        .from("otp_codes")
        .insert({
          email: normalized,
          code,
          expires_at: expiresAt.toISOString(),
          used: false,
        });

      if (insertError) {
        return NextResponse.json({ error: "OTP写入失败", detail: insertError.message }, { status: 500 });
      }
    } catch (e: any) {
      return NextResponse.json({ error: "OTP写入异常", detail: e.message }, { status: 500 });
    }

    // Send email
    try {
      await sendOTPEmail(email, code);
    } catch (e: any) {
      return NextResponse.json({ error: "邮件发送失败", detail: e.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: "系统异常", detail: e.message }, { status: 500 });
  }
}
