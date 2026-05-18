// /api/admin/stats - 管理后台统计接口

import { NextResponse } from "next/server";
import { getDashboardStats, getDailyStats } from "@/lib/db/stats";
import { auth } from "@/lib/auth/config";

// 简单的管理员验证（生产环境用RBAC）
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",");

function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30");

    const [stats, dailyStats] = await Promise.all([
      getDashboardStats(),
      getDailyStats(days),
    ]);

    return NextResponse.json({
      stats,
      dailyStats,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
