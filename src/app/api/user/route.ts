import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  // 1. 读取 session cookie
  const session = req.cookies.get("session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. 检查 Supabase 客户端
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "系统未配置" }, { status: 500 });
  }

  try {
    // 2. 查询用户
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", session)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. 查询最近的生成记录
    const { data: generations, error: genError } = await supabaseAdmin
      .from("generations")
      .select("id, prompt, style, image_url, created_at")
      .eq("user_email", session)
      .order("created_at", { ascending: false })
      .limit(8);

    if (genError) {
      console.error("Error fetching generations:", genError);
    }

    // 4. 计算今日额度
    const today = new Date().toISOString().split("T")[0];
    const { count: todayCount } = await supabaseAdmin
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_email", session)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);

    const isPro = user.plan === "pro" && user.subscription_status === "active";
    const dailyLimit = isPro ? 9999 : 5;
    const remaining = isPro ? 9999 : Math.max(0, dailyLimit - (todayCount || 0));

    // 5. 返回数据（字段名匹配 settings 页面的期望）
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
        plan: user.plan || "free",
        subscriptionStatus: user.subscription_status || null,
        totalGenerations: user.total_generations || 0,
      },
      quota: {
        allowed: remaining > 0 || isPro,
        remaining,
        plan: user.plan || "free",
      },
      generations: (generations || []).map((g) => ({
        id: g.id,
        prompt: g.prompt,
        style: g.style,
        imageUrl: g.image_url,
        createdAt: g.created_at,
      })),
    });
  } catch (e: any) {
    console.error("Error in /api/user:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
