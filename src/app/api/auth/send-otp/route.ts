import { NextRequest, NextResponse } from "next/server";
import { createOTP, verifyOTP } from "@/lib/quota";
import { sendOTPEmail } from "@/lib/mailer";

// POST /api/auth/send-otp
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    // Rate limiting: 60s cooldown per email
    const existing = otpCooldowns.get(email.toLowerCase());
    if (existing && Date.now() - existing < 60000) {
      return NextResponse.json({ error: "请 60 秒后再试" }, { status: 429 });
    }

    const code = createOTP(email);
    await sendOTPEmail(email, code);
    otpCooldowns.set(email.toLowerCase(), Date.now());

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("send-otp error:", e);
    return NextResponse.json({ error: "发送验证码失败，请稍后重试" }, { status: 500 });
  }
}

// Simple in-memory cooldown
const otpCooldowns = new Map<string, number>();
