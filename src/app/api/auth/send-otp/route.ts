import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { generateOTP, storeVerificationCode } from "@/lib/auth/otp";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// 备用：QQ邮箱SMTP（如果没配Resend）
async function sendWithQQSMTP(email: string, code: string): Promise<boolean> {
  // 简化版：如果没配Resend，打印验证码到日志（开发环境）
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] 验证码 ${code} 发送给 ${email}`);
    return true;
  }
  
  // 生产环境必须有Resend
  return false;
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
    
    // 发送邮件
    let sent = false;
    
    if (resend) {
      try {
        const result = await resend.emails.send({
          from: process.env.RESEND_FROM || "AI Sticker <noreply@aisticker.pics>",
          to: [email],
          subject: "Your verification code - AI Sticker Generator",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
          `,
        });
        
        if (result.error) {
          console.error("Resend error:", result.error);
        } else {
          sent = true;
        }
      } catch (error) {
        console.error("Failed to send email via Resend:", error);
      }
    }
    
    // 备用：开发环境打印到日志
    if (!sent) {
      sent = await sendWithQQSMTP(email, code);
    }
    
    if (!sent && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "邮件发送失败，请稍后重试" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "验证码已发送",
      // 开发环境返回验证码（方便测试）
      ...(process.env.NODE_ENV === "development" ? { code } : {}),
    });
    
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "发送失败，请稍后重试" },
      { status: 500 }
    );
  }
}
