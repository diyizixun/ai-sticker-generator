import { NextRequest, NextResponse } from "next/server";
import { resignOtpToken, verifyOtpToken } from "@/lib/otp-token";

const MAX_ATTEMPTS = 5;

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

    // ---------- 成功 ----------
    if (result.valid) {
      const response = NextResponse.json({ success: true, email: normalized });
      response.cookies.set("session", normalized, {
        maxAge: 60 * 60 * 24 * 30, // 30 天
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });
      response.cookies.set("otp_token", "", { maxAge: 0, path: "/" });
      return response;
    }

    // ---------- 锁死 ----------
    if (result.reason === "too_many_attempts") {
      const res = NextResponse.json(
        { error: "尝试次数过多，请重新发送验证码" },
        { status: 429 }
      );
      res.cookies.set("otp_token", "", { maxAge: 0, path: "/" });
      return res;
    }

    // ---------- 验证码错误：attempts+1，重签回写 cookie ----------
    if (result.reason === "code_mismatch") {
      const newAttempts = (result.attempts ?? 0) + 1;

      if (newAttempts >= MAX_ATTEMPTS) {
        const res = NextResponse.json(
          { error: "尝试次数过多，请重新发送验证码" },
          { status: 429 }
        );
        res.cookies.set("otp_token", "", { maxAge: 0, path: "/" });
        return res;
      }

      const newToken = resignOtpToken(token, newAttempts);
      const res = NextResponse.json(
        { error: `验证码错误，还可尝试 ${MAX_ATTEMPTS - newAttempts} 次` },
        { status: 400 }
      );
      if (newToken) {
        res.cookies.set("otp_token", newToken, {
          maxAge: 10 * 60,
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
        });
      } else {
        // 重签失败直接锁死
        res.cookies.set("otp_token", "", { maxAge: 0, path: "/" });
      }
      return res;
    }

    // ---------- 其他不可恢复错误：过期 / 签名无效 / 邮箱不匹配 ----------
    const msgs: Record<string, string> = {
      invalid_token: "验证码无效",
      invalid_signature: "验证码无效",
      invalid_payload: "验证码无效",
      email_mismatch: "邮箱与发送验证码的邮箱不一致",
      expired: "验证码已过期，请重新发送",
      error: "验证失败",
    };
    const finalRes = NextResponse.json(
      { error: msgs[result.reason || "error"] || "验证失败" },
      { status: 400 }
    );
    finalRes.cookies.set("otp_token", "", { maxAge: 0, path: "/" });
    return finalRes;
  } catch (e: any) {
    return NextResponse.json({ error: "验证失败" }, { status: 500 });
  }
}
