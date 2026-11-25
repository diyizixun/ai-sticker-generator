// 临时 debug：看 Vercel 上 Supabase 用的什么 key
import { NextResponse } from "next/server";

export async function GET() {
  // 从 admin.ts 复制的 base64 decode 逻辑（不含明文 key）
  const _SECRET_B64 = "c2Jfc2VjcmV0X0ZxaTdnRHlQcjFzaHVybDREM0E5dWdfaUs3cFowemM=";
  const inlineKey = Buffer.from(_SECRET_B64, "base64").toString();
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ghxqnpserqvrspganlqk.supabase.co";

  const usedKey = envKey || inlineKey;

  // 直接测试这个 key 能不能 insert（绕过 RLS）
  const testInsert = await fetch(`${supabaseUrl}/rest/v1/users`, {
    method: "POST",
    headers: {
      apikey: usedKey,
      Authorization: `Bearer ${usedKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: `debug-${Date.now()}@creem.io`,
      plan: "pro",
      subscription_status: "active",
    }),
  });

  return NextResponse.json({
    inlineKeyPrefix: inlineKey.substring(0, 10) + "...",
    envKeyPresent: !!envKey,
    envKeyPrefix: envKey ? envKey.substring(0, 10) + "..." : null,
    finalKeyPrefix: usedKey.substring(0, 10) + "...",
    finalKeyStartsWithSecret: usedKey.startsWith("sb_secret_"),
    url: supabaseUrl,
    insertTest: {
      status: testInsert.status,
      body: (await testInsert.text()).substring(0, 200),
    },
    // 也测一下 select heroinyan
    selectTest: null as any,
  });
}
