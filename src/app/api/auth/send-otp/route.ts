import { NextRequest, NextResponse } from "next/server";
import { otpStore } from "@/lib/otp-store";
import { RESEND_API_KEY } from "@/lib/config";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendViaResend(to: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AI Sticker <onboarding@resend.dev>",
      to,
      subject: "AI Sticker - Verification Code",
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#0a0a0a;color:#fff;border-radius:16px"><h1 style="font-size:28px;font-weight:700;text-align:center;margin-bottom:8px;background:linear-gradient(135deg,#7c3aed,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent">AI Sticker</h1><p style="text-align:center;color:#888;margin-bottom:32px">Your verification code</p><div style="background:#1a1a1a;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px"><p style="font-size:14px;color:#666;margin:0 0 8px">Verification Code</p><p style="font-size:36px;font-weight:700;letter-spacing:8px;color:#7c3aed;margin:0;font-family:monospace">${code}</p></div><p style="font-size:12px;color:#555;text-align:center">Code expires in 10 minutes.</p></div>`,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    return { ok: false, error: `Resend ${resp.status}: ${body}` };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    const recent = otpStore.get(normalized);
    if (recent && Date.now() - recent.expiresAt < 60000) {
      return NextResponse.json({ error: "请 60 秒后再试" }, { status: 429 });
    }

    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.set(normalized, { code, expiresAt, used: false });

    const result = await sendViaResend(email, code);
    if (!result.ok) {
      console.error("Resend failed:", result.error);
      return NextResponse.json({ error: "邮件发送失败，请稍后重试" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}
