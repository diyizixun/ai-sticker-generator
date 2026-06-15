// 统计数据操作

import { createServerSupabaseClient } from "./supabase";

export interface DashboardStats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  totalGenerations: number;
  todayGenerations: number;
  monthlyRevenueCents: number;
  conversionRate: number; // free→pro 转化率
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createServerSupabaseClient();

  // 总用户数
  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  // Pro用户数
  const { count: proUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("plan", "pro");

  // 总生成数
  const { data: genStats } = await supabase
    .from("generations")
    .select("id")
    .eq("status", "completed");

  // 今日生成数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todayGens } = await supabase
    .from("generations")
    .select("id")
    .eq("status", "completed")
    .gte("created_at", today.toISOString());

  // 本月收入
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const { data: monthPayments } = await supabase
    .from("payments")
    .select("amount_cents")
    .eq("status", "succeeded")
    .gte("created_at", monthStart.toISOString());

  const monthlyRevenueCents =
    monthPayments?.reduce((sum, p) => sum + p.amount_cents, 0) || 0;

  return {
    totalUsers: totalUsers || 0,
    proUsers: proUsers || 0,
    freeUsers: (totalUsers || 0) - (proUsers || 0),
    totalGenerations: genStats?.length || 0,
    todayGenerations: todayGens?.length || 0,
    monthlyRevenueCents,
    conversionRate: totalUsers ? ((proUsers || 0) / totalUsers) * 100 : 0,
  };
}

export interface DailyStat {
  date: string;
  generations: number;
  newUsers: number;
  revenueCents: number;
}

export async function getDailyStats(days = 30): Promise<DailyStat[]> {
  const supabase = createServerSupabaseClient();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("daily_stats")
    .select("*")
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: true });

  return (
    data?.map((d) => ({
      date: d.date,
      generations: d.total_generations,
      newUsers: d.new_users,
      revenueCents: d.revenue_cents,
    })) || []
  );
}
