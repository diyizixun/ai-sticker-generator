import { NextRequest, NextResponse } from "next/server";
import { verifyOtpToken } from "@/lib/otp-token";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "邮箱和验证码不能为空" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();
    const token = req.cookies.get("otp_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "验证码已过期，请重新发送" }, { status: 400 });
    }

    const result = verifyOtpToken(token, normalized, code);
    if (!result.valid) {
      const msgs: Record<string, string> = {
        invalid_token: "验证码无效",
        invalid_signature: "验证码无效",
        invalid_payload: "验证码无效",
        email_mismatch: "邮箱与发送验证码的邮箱不一致",
        code_mismatch: "验证码错误",
        expired: "验证码已过期，请重新发送",
        error: "验证失败",
      };
      return NextResponse.json(
        { error: msgs[result.reason || "error"] || "验证失败" },
        { status: 400 }
      );
    }

    // 验证成功，设置登录会话 cookie
    const response = NextResponse.json({ success: true, email: normalized });
    response.cookies.set("session", normalized, {
      maxAge: 60 * 60 * 24 * 30, // 30 天
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    // 清除 OTP token
    response.cookies.set("otp_token", "", {
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: "验证失败" }, { status: 500 });
  }
}
