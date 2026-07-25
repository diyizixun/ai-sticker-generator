import { NextRequest, NextResponse } from "next/server";
import { otpStore } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "邮箱和验证码不能为空" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    const record = otpStore.get(normalized);
    if (!record || record.used || record.expiresAt < Date.now()) {
      return NextResponse.json({ error: "验证码无效或已过期" }, { status: 400 });
    }

    if (record.code !== code) {
      return NextResponse.json({ error: "验证码无效" }, { status: 400 });
    }

    record.used = true;
    otpStore.set(normalized, record);

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
