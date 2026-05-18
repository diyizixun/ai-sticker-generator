// 用户数据库操作

import { createServerSupabaseClient } from "./supabase";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan: "free" | "pro";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  daily_generations_used: number;
  daily_generations_reset_at: string;
  total_generations: number;
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  prompt: string;
  style: string;
  mode: "text" | "image";
  image_url: string | null;
  status: "pending" | "completed" | "failed";
  error_message: string | null;
  api_provider: "replicate" | "openai" | "pollinations" | null;
  api_cost_cents: number;
  generation_time_ms: number | null;
  created_at: string;
}

// ===== 用户操作 =====

export async function findUserByEmail(email: string): Promise<User | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();
  return data as User | null;
}

export async function findUserById(id: string): Promise<User | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();
  return data as User | null;
}

export async function findUserByStripeCustomerId(customerId: string): Promise<User | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .single();
  return data as User | null;
}

export async function createUser(params: {
  email: string;
  name?: string;
  avatar_url?: string;
  provider?: string;
  provider_id?: string;
}): Promise<User> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .insert(params)
    .select()
    .single();
  if (error) throw error;
  return data as User;
}

export async function updateUserStripeInfo(
  userId: string,
  params: {
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    subscription_status?: string;
    subscription_current_period_end?: string;
    plan?: "free" | "pro";
  }
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update(params)
    .eq("id", userId);
  if (error) throw error;
}

// ===== 免费额度控制 =====

const FREE_DAILY_LIMIT = 3;

export async function checkGenerationQuota(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  plan: "free" | "pro";
}> {
  const user = await findUserById(userId);
  if (!user) return { allowed: false, remaining: 0, plan: "free" };

  // Pro用户无限制
  if (user.plan === "pro" && user.subscription_status === "active") {
    return { allowed: true, remaining: Infinity, plan: "pro" };
  }

  // 检查是否需要重置日额度
  const resetAt = new Date(user.daily_generations_reset_at);
  const now = new Date();
  const needsReset = now.getTime() - resetAt.getTime() > 24 * 60 * 60 * 1000;

  if (needsReset) {
    const supabase = createServerSupabaseClient();
    await supabase
      .from("users")
      .update({
        daily_generations_used: 0,
        daily_generations_reset_at: now.toISOString(),
      })
      .eq("id", userId);
    return { allowed: true, remaining: FREE_DAILY_LIMIT, plan: "free" };
  }

  const remaining = Math.max(0, FREE_DAILY_LIMIT - user.daily_generations_used);
  return { allowed: remaining > 0, remaining, plan: "free" };
}

export async function incrementGenerationUsage(userId: string): Promise<void> {
  // 简单做法：先读再写（RPC函数可选）
  const user = await findUserById(userId);
  if (!user) return;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update({
      daily_generations_used: user.daily_generations_used + 1,
      total_generations: user.total_generations + 1,
    })
    .eq("id", userId);
  if (error) console.error("Failed to increment usage:", error);
}

// ===== 生成记录操作 =====

export async function createGeneration(params: {
  user_id: string;
  prompt: string;
  style: string;
  mode: "text" | "image";
  api_provider: string;
}): Promise<Generation> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("generations")
    .insert({
      ...params,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Generation;
}

export async function updateGenerationResult(
  generationId: string,
  params: {
    image_url?: string;
    status: "completed" | "failed";
    error_message?: string;
    api_cost_cents?: number;
    generation_time_ms?: number;
  }
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("generations")
    .update(params)
    .eq("id", generationId);
  if (error) throw error;
}

export async function getUserGenerations(
  userId: string,
  limit = 20
): Promise<Generation[]> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Generation[]) || [];
}
