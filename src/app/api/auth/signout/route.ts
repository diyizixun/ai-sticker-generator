import { NextResponse } from "next/server";

// 支持 GET 和 POST 两种方式，清除 session cookie 后重定向到首页
export async function GET() {
  const response = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "https://www.aisticker.pics"));
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // 立刻过期
    path: "/",
  });
  return response;
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
