import { NextResponse } from "next/server";

// 兼容旧 NextAuth 链接：/api/auth/signin?callbackUrl=...
// 重定向到 /login?callbackUrl=...
export async function GET(req: Request) {
  const url = new URL(req.url);
  const callbackUrl = url.searchParams.get("callbackUrl") || "/settings";
  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(loginUrl.toString());
}
