// /api/generate - 服务端图片生成
// 2026-08-08 实测优先级: Replicate → Pollinations(openai 第一版,质量最好成功率66%) → Pollinations(stable-diffusion) → Pollinations(turbo) → Pollinations(dalle3 质量A+但成功率33%) → Pollinations(default) → Pollinations(flux兜底) → HuggingFace
// Pollinations 免费 API 最大输出 768x768 正方形（传更大也会被缩放）
// 各模型成功率: openai 66% 1.5-2s 44-63KB / turbo 66% 1-14s / stable-diffusion ~50% 42s / dalle3 33% 3s+

import { NextRequest, NextResponse } from "next/server";
import { getClientId, checkQuota } from "@/lib/quota";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { STYLES } from "@/lib/config";

// 单一数据源：从 lib/config 的 STYLES 构建，避免前后端提示词不一致
const STYLE_PROMPTS: Record<string, string> = STYLES.reduce(
  (acc, s) => {
    acc[s.id] = s.prompt;
    return acc;
  },
  {} as Record<string, string>,
);

// Creem Moderation API
async function moderatePrompt(prompt: string, userId?: string): Promise<{ allowed: boolean; reason?: string }> {
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) return { allowed: true };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("https://api.creem.io/v1/moderation/prompt", {
      method: "POST",
      headers: { "x-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({ prompt, external_id: userId ? `user_${userId}` : undefined }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return { allowed: false, reason: "moderation_unavailable" };
    const result = await response.json();
    if (result.decision === "deny" || result.decision === "flag") {
      return { allowed: false, reason: "prompt_rejected" };
    }
    return { allowed: true };
  } catch {
    console.warn("Creem moderation unavailable, allowing request");
    return { allowed: true };
  }
}

// Pollinations AI - 免费，无需 API Key
// 2026-08-08 3 prompts × 1 seed 实测（最大输出 768x768 正方形）：
// openai             66%成功率  1.5-2s   44-63KB   用户最怀念的「第一版」高质量效果
// stable-diffusion   ~50%成功率 42s      60-80KB   文件最大细节多，但慢到 Vercel 超时边缘
// turbo              66%成功率  1-14s    27-51KB   速度快，细节略差且波动大
// dalle3             33%成功率  3s+      55-75KB   质量顶级 A+，但成功率低不适合放太前
// default/flux       约 40%     10-45s   30-50KB   慢速兜底
async function generateWithPollinations(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);

  // ⚠️ 总预算必须 < Vercel maxDuration (60s) ，避免函数硬杀返回 502
  // 4 个高优模型 × 统一 12s 超时 → 最坏 48s → 留给前后端/网络/序列化 12s 缓冲
  // 质量阈值：达不到就接下一个，最后一个模型接受任何 ≥12KB 的图
  const MIN_KB: Record<string, number> = {
    openai: 35,
    turbo: 22,
    dalle3: 45,
    flux: 20,
  };
  const perAttemptTimeoutMs = 12000;
  const attempts = [
    { id: "openai", qs: `model=openai` },              // ① 用户最怀念的「第一版」高质量 66% 1.5-2s
    { id: "turbo",  qs: `model=turbo` },               // ② 成功率最高（66%）速度最快 1-3s
    { id: "dalle3", qs: `model=dalle3` },              // ③ A+ 顶级质量，成功直接命中 70KB+
    { id: "flux",   qs: `model=flux` },                // ④ 最后兜底：flux 稳 任何能出图就行
  ];
  const overallDeadline = Date.now() + 50000; // 50s 总预算 (提前 10s 打住避免 Vercel 60s 硬杀)

  for (let i = 0; i < attempts.length; i++) {
    if (Date.now() >= overallDeadline) {
      console.warn(`[Pollinations] Overall deadline reached, aborting remaining attempts`);
      break;
    }
    const model = attempts[i];
    const trySeed = seed + i * 1013904223;
    const url =
      `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${trySeed}&nologo=true` +
      (model.qs ? `&${model.qs}` : "");
    console.log(`[Pollinations] Attempt ${i + 1}/${attempts.length} (${model.id})`);
    const remaining = overallDeadline - Date.now();
    const thisTimeout = Math.min(perAttemptTimeoutMs, Math.max(3000, remaining));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), thisTimeout);
    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "image/*", "Cache-Control": "no-cache" },
      });
      const elapsed = Date.now() - startTime;
      clearTimeout(timeout);
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) {
        console.warn(`[Pollinations] ${model.id} HTTP ${response.status} after ${elapsed}ms`);
        continue;
      }
      if (!contentType.includes("image")) {
        console.warn(`[Pollinations] ${model.id} non-image: ${contentType}`);
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const minBytes = MIN_KB[model.id] * 1024;
      console.log(
        `[Pollinations] ${model.id} returned ${(buffer.length / 1024).toFixed(1)}KB in ${elapsed}ms (need >=${MIN_KB[model.id]}KB)`,
      );
      const isLast = i === attempts.length - 1;
      if (buffer.length < minBytes) {
        // 非最后模型：阈值不够跳过；最后模型：放宽到 12KB 绝对硬地板
        if (!isLast) {
          console.warn(`[Pollinations] ${model.id} below quality threshold, trying next`);
          continue;
        } else if (buffer.length < 12000) {
          console.warn(`[Pollinations] ${model.id} below hard floor (12KB), skipping`);
          continue;
        }
      }
      const ext = contentType.includes("png") ? "png" : "jpeg";
      console.log(
        `[Pollinations] ✅ SUCCESS with ${model.id} — ${(buffer.length / 1024).toFixed(0)}KB · ${elapsed}ms`,
      );
      return `data:image/${ext};base64,${buffer.toString("base64")}`;
    } catch (e: any) {
      clearTimeout(timeout);
      console.warn(`[Pollinations] ${model.id} error: ${e.message}`);
      continue;
    }
  }
  throw new Error("All Pollinations models failed");
}

// HuggingFace 免费推理 API（最后降级）
async function generateWithHuggingFace(prompt: string): Promise<string> {
  const hfToken = process.env.HUGGINGFACE_API_TOKEN;
  const models = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
  ];
  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "image/png,image/jpeg,image/*",
      };
      if (hfToken) headers["Authorization"] = `Bearer ${hfToken}`;
      const endpoint = model.startsWith("black-forest-labs")
        ? `https://router.huggingface.co/hf-inference/models/${model}/v1/text-to-image`
        : `https://api-inference.huggingface.co/models/${model}`;
      const body = model.startsWith("black-forest-labs")
        ? JSON.stringify({ inputs: prompt, parameters: { num_inference_steps: 4, width: 512, height: 512 } })
        : JSON.stringify({ inputs: prompt, parameters: { width: 512, height: 512 } });
      const response = await fetch(endpoint, { method: "POST", headers, body, signal: controller.signal });
      clearTimeout(timeout);
      if (response.status === 503) {
        await new Promise((r) => setTimeout(r, 2000));
        const retryRes = await fetch(endpoint, { method: "POST", headers, body });
        if (!retryRes.ok) continue;
        const ct2 = retryRes.headers.get("content-type") || "";
        if (!ct2.includes("image")) continue;
        const buf2 = Buffer.from(await retryRes.arrayBuffer());
        if (buf2.length < 5000) continue;
        const ext2 = ct2.includes("png") ? "png" : "jpeg";
        return `data:image/${ext2};base64,${buf2.toString("base64")}`;
      }
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("image")) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 5000) continue;
      const ext = contentType.includes("png") ? "png" : "jpeg";
      return `data:image/${ext};base64,${buffer.toString("base64")}`;
    } catch (e: any) {
      console.log(`HF model error (${model}):`, e.message);
      continue;
    }
  }
  throw new Error("All HuggingFace models failed");
}

// GET: 免费生成
export async function GET(req: NextRequest) {
  const userPrompt = req.nextUrl.searchParams.get("prompt");
  const styleId = req.nextUrl.searchParams.get("style") || "cute";

  if (!userPrompt || userPrompt.trim().length === 0) {
    return NextResponse.json({ success: false, error: "Please enter a description" }, { status: 400 });
  }
  if (userPrompt.length > 500) {
    return NextResponse.json({ success: false, error: "Description too long" }, { status: 400 });
  }

  const session = req.cookies.get("session")?.value;
  const isLoggedIn = !!session && !!supabaseAdmin;

  // 额度检查
  let quotaInfo: { allowed: boolean; remaining: number; limit: number; isPro: boolean };
  if (isLoggedIn) {
    const today = new Date().toISOString().split("T")[0];
    const { data: userRow } = await supabaseAdmin!
      .from("users")
      .select("plan, subscription_status")
      .eq("email", session)
      .single();
    const isPro = userRow?.plan === "pro" && userRow?.subscription_status === "active";
    const dailyLimit = isPro ? 9999 : 10;
    const { count } = await supabaseAdmin!
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_email", session)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);
    const used = count || 0;
    const remaining = isPro ? 9999 : Math.max(0, dailyLimit - used);
    quotaInfo = { allowed: remaining > 0 || isPro, remaining, limit: dailyLimit, isPro };
  } else {
    const clientId = getClientId(req);
    const q = checkQuota(clientId);
    quotaInfo = { ...q, isPro: false };
  }

  if (!quotaInfo.allowed) {
    return NextResponse.json(
      { success: false, error: `Daily limit reached (${quotaInfo.limit}/day). Come back tomorrow!`, quota: { remaining: 0, limit: quotaInfo.limit } },
      { status: 429 }
    );
  }

  // 内容审核
  const moderation = await moderatePrompt(userPrompt, isLoggedIn ? session : undefined);
  if (!moderation.allowed) {
    const msgs: Record<string, string> = {
      prompt_rejected: "Your prompt was rejected because it violates our content policy.",
      moderation_unavailable: "Content moderation is temporarily unavailable.",
    };
    return NextResponse.json(
      { success: false, error: msgs[moderation.reason || ""] || "Content policy violation" },
      { status: 400 }
    );
  }

  const stylePrompt = STYLE_PROMPTS[styleId] || "sticker design";
  const fullPrompt = `${stylePrompt}, ${userPrompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;

  // 依次尝试各生成接口
  let result: string | null = null;
  let source = "";

  // 1. Replicate（如果配置了）
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      result = await generateWithReplicate(fullPrompt);
      source = "replicate";
    } catch (e) {
      console.error("Replicate failed:", e);
    }
  }

  // 2. Pollinations（turbo → flux → 默认，自动降级）
  if (!result) {
    try {
      result = await generateWithPollinations(fullPrompt);
      source = "pollinations";
    } catch (e) {
      console.error("Pollinations failed:", e);
    }
  }

  // 3. OpenAI（如果配置了）
  if (!result && process.env.OPENAI_API_KEY) {
    try {
      result = await generateWithOpenAI(fullPrompt);
      source = "openai";
    } catch (e) {
      console.error("OpenAI failed:", e);
    }
  }

  // 4. HuggingFace（最后降级）
  if (!result) {
    try {
      result = await generateWithHuggingFace(fullPrompt);
      source = "huggingface";
    } catch (e) {
      console.error("HuggingFace failed:", e);
    }
  }

  if (!result) {
    return NextResponse.json(
      { success: false, error: "Image generation is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }

  // 生成成功：存 DB + 更新 quota
  let remaining: number;
  if (isLoggedIn) {
    await supabaseAdmin!
      .from("generations")
      .insert({
        user_email: session!,
        prompt: userPrompt,
        style: styleId,
        image_url: result,
        created_at: new Date().toISOString(),
      });
    try {
      const { data: u } = await supabaseAdmin!
        .from("users")
        .select("total_generations")
        .eq("email", session)
        .single();
      const next = (u?.total_generations || 0) + 1;
      await supabaseAdmin!
        .from("users")
        .update({ total_generations: next })
        .eq("email", session);
    } catch (e) {
      console.warn("Failed to increment total_generations:", e);
    }
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabaseAdmin!
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_email", session)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);
    remaining = quotaInfo.isPro ? 9999 : Math.max(0, quotaInfo.limit - (count || 0));
  } else {
    remaining = quotaInfo.remaining;
  }

  return NextResponse.json({
    success: true,
    imageUrl: result,
    source,
    quota: { remaining, limit: quotaInfo.limit },
  });
}

// POST: 付费 Pro 生成（透明背景）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, style, userId } = body;

    const moderation = await moderatePrompt(prompt, userId);
    if (!moderation.allowed) {
      const msgs: Record<string, string> = {
        prompt_rejected: "Your prompt was rejected because it violates our content policy.",
        moderation_unavailable: "Content moderation is temporarily unavailable.",
      };
      return NextResponse.json(
        { success: false, error: msgs[moderation.reason || ""] || "Content policy violation" },
        { status: 400 }
      );
    }

    if (process.env.REPLICATE_API_TOKEN) {
      try {
        const stylePrompt = STYLE_PROMPTS[style] || "sticker design";
        const fullPrompt = `${stylePrompt}, ${prompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;
        const result = await generateWithReplicate(fullPrompt, true);
        if (userId && supabaseAdmin) {
          await supabaseAdmin
            .from("generations")
            .insert({
              user_email: userId,
              prompt,
              style,
              image_url: result,
              created_at: new Date().toISOString(),
            });
        }
        return NextResponse.json({ success: true, imageUrl: result, pro: true });
      } catch (e) {
        console.error("Pro Replicate failed:", e);
      }
    }

    return NextResponse.json({ success: false, error: "Pro generation unavailable" }, { status: 503 });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

async function generateWithReplicate(prompt: string, transparent = false): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN!;
  const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json", Prefer: "respond-async" },
    body: JSON.stringify({
      input: {
        prompt: transparent ? `${prompt}, transparent background, no background, isolated sticker` : prompt,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
        output_quality: 90,
      },
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Replicate: ${response.status} ${errText.slice(0, 200)}`);
  }
  const prediction = await response.json();
  let result = prediction;
  let attempts = 0;
  while (result.status !== "succeeded" && result.status !== "failed" && attempts < 15) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!pollRes.ok) throw new Error(`Replicate poll: ${pollRes.status}`);
    result = await pollRes.json();
    attempts++;
  }
  if (result.status === "succeeded" && result.output?.[0]) return result.output[0];
  throw new Error("Replicate failed");
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024" }),
  });
  if (!response.ok) throw new Error(`OpenAI: ${response.status}`);
  const data = await response.json();
  const url = data.data?.[0]?.url || data.data?.[0]?.b64_json;
  if (!url) throw new Error("No image from OpenAI");
  return url;
}
