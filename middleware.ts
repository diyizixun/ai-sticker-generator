// 鉴权中间件
// 无Supabase/Auth配置时自动跳过，不影响页面加载
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 仅保护admin和settings路由
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/settings")) {
    return NextResponse.next();
  }

  // 尝试获取auth状态
  try {
    const { auth } = await import("@/lib/auth/config");
    const result = await auth();

    if (!result) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  } catch {
    // Auth未配置，允许通过（降级模式）
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/admin/:path*", "/settings/:path*"],
};
