import { NextRequest, NextResponse } from "next/server";
import { RESEND_API_KEY } from "@/lib/config";
import { signOtpToken } from "@/lib/otp-token";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendViaResend(
  to: string,
  code: string,
  fromEmail: string
): Promise<{ ok: boolean; error?: string }> {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `AI Sticker <${fromEmail}>`,
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

    const lastSentCookie = req.cookies.get("otp_last_sent")?.value;
    if (lastSentCookie) {
      const lastSent = parseInt(lastSentCookie, 10);
      if (!isNaN(lastSent) && Date.now() - lastSent < 60000) {
        return NextResponse.json({ error: "请 60 秒后再试" }, { status: 429 });
      }
    }

    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const token = signOtpToken(normalized, code, expiresAt);

    // aisticker.pics 域名未在 Resend 验证，直接用 onboarding@resend.dev
    // 实测 onboarding@resend.dev 可以发给任意邮箱（qq.com, gmail.com 等）
    let emailSent = false;
    let fallbackCode: string | null = null;

    // 先试自定义域名（如果用户之后验证了域名，就自动生效）
    const customResult = await sendViaResend(normalized, code, "noreply@aisticker.pics");
    if (customResult.ok) {
      emailSent = true;
    } else {
      console.warn("[Resend] 自定义域名发件失败:", customResult.error);
    }

    // 不行就试 onboarding（实测可用）
    if (!emailSent) {
      const obResult = await sendViaResend(normalized, code, "onboarding@resend.dev");
      if (obResult.ok) {
        emailSent = true;
      } else {
        console.warn("[Resend] onboarding 也失败:", obResult.error);
      }
    }

    // 双路都挂 — 返回 fallback code（极端情况，比如 Resend 全挂）
    if (!emailSent) {
      fallbackCode = code;
    }

    const response = NextResponse.json(
      emailSent
        ? { success: true }
        : { success: true, fallbackCode, message: "邮件服务暂不可用，请使用下方验证码登录" }
    );
    response.cookies.set("otp_token", token, {
      maxAge: 10 * 60,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    response.cookies.set("otp_last_sent", String(Date.now()), {
      maxAge: 120,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}
