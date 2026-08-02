import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Supabase 不可用时返回基础用户信息
  if (!supabaseAdmin) {
    return NextResponse.json({
      user: {
        id: session,
        email: session,
        name: null,
        plan: "free",
        subscriptionStatus: null,
        totalGenerations: 0,
      },
      quota: {
        allowed: true,
        remaining: 10,
        plan: "free",
      },
      generations: [],
    });
  }

  try {
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", session)
      .single();

    if (userError || !user) {
      // 用户不存在时自动创建
      const { data: newUser, error: insertErr } = await supabaseAdmin
        .from("users")
        .insert({
          email: session,
          plan: "free",
          subscription_status: "free",
          total_generations: 0,
        })
        .select()
        .single();

      if (insertErr || !newUser) {
        return NextResponse.json({
          user: {
            id: session,
            email: session,
            name: null,
            plan: "free",
            subscriptionStatus: null,
            totalGenerations: 0,
          },
          quota: { allowed: true, remaining: 10, plan: "free" },
          generations: [],
        });
      }

      return NextResponse.json({
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name || null,
          plan: newUser.plan || "free",
          subscriptionStatus: newUser.subscription_status || null,
          totalGenerations: newUser.total_generations || 0,
        },
        quota: { allowed: true, remaining: 10, plan: "free" },
        generations: [],
      });
    }

    const { data: generations } = await supabaseAdmin
      .from("generations")
      .select("id, prompt, style, image_url, created_at")
      .eq("user_email", session)
      .order("created_at", { ascending: false })
      .limit(8);

    const today = new Date().toISOString().split("T")[0];
    const { count: todayCount } = await supabaseAdmin
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_email", session)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);

    const isPro = user.plan === "pro" && user.subscription_status === "active";
    const dailyLimit = isPro ? 9999 : 10;
    const remaining = isPro ? 9999 : Math.max(0, dailyLimit - (todayCount || 0));

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
    return NextResponse.json({
      user: {
        id: session,
        email: session,
        name: null,
        plan: "free",
        subscriptionStatus: null,
        totalGenerations: 0,
      },
      quota: { allowed: true, remaining: 10, plan: "free" },
      generations: [],
    });
  }
}
