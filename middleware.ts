import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get("host") || "";

  // 如果是 apex domain (aisticker.pics)，重定向到 www 子域
  if (host === "aisticker.pics") {
    url.host = "www.aisticker.pics";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|logo.svg|og-image.png).*)"],
};
