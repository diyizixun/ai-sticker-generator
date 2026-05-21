import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@/lib/auth/otp";
import { findUserByEmail, createUser } from "@/lib/db/users";
import { signIn } from "next-auth/react";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();
    
    if (!email || !code) {
      return NextResponse.json(
        { error: "请输入邮箱和验证码" },
        { status: 400 }
      );
    }
    
    // 验证验证码
    const isValid = verifyCode(email, code);
    
    if (!isValid) {
      return NextResponse.json(
        { error: "验证码无效或已过期" },
        { status: 400 }
      );
    }
    
    // 查找或创建用户
    let dbUser = await findUserByEmail(email);
    
    if (!dbUser) {
      dbUser = await createUser({
        email,
        name: email.split('@')[0], // 默认用邮箱前缀作为昵称
        provider: 'email',
        provider_id: email,
      });
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        plan: dbUser.plan,
      },
      // 告诉前端可以调用 next-auth 的 signIn
      callbackUrl: "/settings",
    });
    
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "验证失败，请稍后重试" },
      { status: 500 }
    );
  }
}
