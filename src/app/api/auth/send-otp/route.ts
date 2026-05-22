import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { generateOTP, storeVerificationCode } from "@/lib/auth/otp";

// 邮件HTML模板
function getEmailHTML(code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #7c3aed;">AI Sticker Generator</h1>
      </div>
      <div style="background: #f9fafb; border-radius: 8px; padding: 24px; text-align: center;">
        <p style="color: #374151; font-size: 16px; margin-bottom: 16px;">
          Your verification code is:
        </p>
        <div style="background: #7c3aed; color: white; font-size: 32px; font-weight: bold;
                    padding: 16px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
          This code will expire in 5 minutes.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    </div>
  `;
}

// QQ邮箱SMTP发送
async function sendViaQQSMTP(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const user = process.env.QQ_EMAIL_USER;
  const pass = process.env.QQ_EMAIL_PASS;

  if (!user || !pass) {
    return { success: false, error: "QQ_SMTP_NOT_CONFIGURED" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.qq.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });

    const result = await transporter.sendMail({
      from: `AI Sticker Generator <${user}>`,
      to: email,
      subject: "Your verification code - AI Sticker Generator",
      html: getEmailHTML(code),
    });

    if (result.accepted && result.accepted.length > 0) {
      console.log(`✅ [QQ SMTP] Email sent to ${email}`);
      return { success: true };
    }

    return { success: false, error: "QQ_SMTP_NO_ACCEPTED" };
  } catch (error: any) {
    console.error("[QQ SMTP] Error:", error);
    return { success: false, error: error.message || "QQ_SMTP_ERROR" };
  }
}

// Resend发送（备用）
async function sendViaResend(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    return { success: false, error: "RESEND_NOT_CONFIGURED" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from,
      to: [email],
      subject: "Your verification code - AI Sticker Generator",
      html: getEmailHTML(code),
    });

    if (result.error) {
      console.error("[Resend] Error:", result.error);
      return { success: false, error: JSON.stringify(result.error) };
    }

    console.log(`✅ [Resend] Email sent to ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Resend] Error:", error);
    return { success: false, error: error.message || "RESEND_ERROR" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "请输入有效的邮箱地址" },
        { status: 400 }
      );
    }

    // 生成6位验证码
    const code = generateOTP();

    // 存储验证码（5分钟有效）
    storeVerificationCode(email, code, 5);

    // 发送策略：QQ SMTP 优先 → Resend 备用
    const providers = [
      { name: "QQ SMTP", send: () => sendViaQQSMTP(email, code) },
      { name: "Resend", send: () => sendViaResend(email, code) },
    ];

    let lastError = "";

    for (const provider of providers) {
      console.log(`[Send OTP] Trying ${provider.name}...`);
      const result = await provider.send();

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: "验证码已发送，请查收邮件",
          ...(process.env.NODE_ENV === "development" ? { code, provider: provider.name } : {}),
        });
      }

      lastError = result.error || `${provider.name}_FAILED`;
      console.warn(`[Send OTP] ${provider.name} failed: ${lastError}`);
    }

    // 开发环境兜底：打印到日志
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] 验证码 ${code} 发送给 ${email}（未实际发送）`);
      return NextResponse.json({
        success: true,
        message: "验证码已发送（开发模式）",
        code,
        provider: "DEV_MODE",
      });
    }

    // 所有方式都失败了
    console.error("[Send OTP] All providers failed. Last error:", lastError);
    return NextResponse.json(
      { error: "邮件发送失败，请稍后重试" },
      { status: 500 }
    );

  } catch (error: any) {
    console.error("[Send OTP] Unexpected error:", error);
    return NextResponse.json(
      { error: "发送失败，请稍后重试" },
      { status: 500 }
    );
  }
}
