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
// 用真实二进制 magic bytes 识别图片，不依赖可能被 proxy/cloudflare 篡改的 content-type header
function sniffImage(bytes: Buffer): { ok: true; ext: "jpeg" | "png" } | { ok: false } {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return { ok: true, ext: "jpeg" };
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ok: true, ext: "png" };
  }
  return { ok: false };
}

async function generateWithPollinations(prompt: string, deadline?: number): Promise<string> {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);

  // 如果外部没传 deadline：默认 30s
  const overallDeadline = deadline || Date.now() + 30000;
  // 预算充裕（>35s）说明可能是"零兜底环境"——前 4 模型多给 1 次重试，不浪费函数时间
  const budgetMs = overallDeadline - Date.now();
  const longBudget = budgetMs >= 35000;

  const MIN_KB: Record<string, number> = {
    openai: 20,
    turbo: 14,
    dalle3: 25,
    flux: 11,
    "stable-diffusion": 16,
    default: 9,
  };
  const R2 = longBudget ? 3 : 2; // 长预算（54s）→ 前 4 模型重试 3 次，短预算 2 次
  const attempts = [
    { id: "openai",            qs: `model=openai`,            timeoutMs: 9000, retries: R2 },
    { id: "turbo",             qs: `model=turbo`,             timeoutMs: 8500, retries: R2 },
    { id: "dalle3",            qs: `model=dalle3`,            timeoutMs: 8500, retries: R2 },
    { id: "flux",              qs: `model=flux`,              timeoutMs: longBudget ? 8000 : 6000, retries: longBudget ? 2 : 1 },
    { id: "stable-diffusion",  qs: `model=stable-diffusion`,  timeoutMs: 7500, retries: longBudget ? 2 : 1 },
    { id: "default",           qs: ``,                        timeoutMs: 6500, retries: longBudget ? 2 : 1 },
  ];

  for (let i = 0; i < attempts.length; i++) {
    if (Date.now() >= overallDeadline) break;
    const model = attempts[i];
    for (let retry = 0; retry < model.retries; retry++) {
      if (Date.now() >= overallDeadline) break;
      const trySeed = seed + i * 1013904223 + retry * 2654435761;
      const url =
        `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${trySeed}&nologo=true` +
        (model.qs ? `&${model.qs}` : "");
      console.log(`[Pollinations] Attempt ${i + 1}/${attempts.length} (${model.id}) retry=${retry}`);
      const remaining = overallDeadline - Date.now();
      const thisTimeout = Math.min(model.timeoutMs, Math.max(3000, remaining));
      if (retry > 0) await new Promise((r) => setTimeout(r, 220));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), thisTimeout);
      try {
        const startTime = Date.now();
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "image/webp,image/avif,image/*;q=0.9,*/*;q=0.8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          },
          redirect: "follow",
        });
        const elapsed = Date.now() - startTime;
        clearTimeout(timeout);
        const status = response.status;
        const transientFail = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
        if (transientFail && retry === 0 && model.retries > 1) continue;
        if (!response.ok) break;
        const buffer = Buffer.from(await response.arrayBuffer());
        const sniff = sniffImage(buffer);
        if (!sniff.ok) {
          if (retry === 0 && model.retries > 1) continue;
          break;
        }
        const minBytes = MIN_KB[model.id] * 1024;
        console.log(
          `[Pollinations] ${model.id} ${sniff.ext} ${(buffer.length / 1024).toFixed(1)}KB in ${elapsed}ms (need >=${MIN_KB[model.id]}KB)`,
        );
        const isLast = i === attempts.length - 1;
        if (buffer.length < minBytes) {
          if (retry === 0 && model.retries > 1) continue;
          if (!isLast) break;
          else if (buffer.length < 6000) break; // 链尾最后硬地板 6KB（接受有图比没图强）
        }
        console.log(
          `[Pollinations] ✅ SUCCESS ${model.id} — ${(buffer.length / 1024).toFixed(0)}KB ${sniff.ext} · ${elapsed}ms`,
        );
        return `data:image/${sniff.ext};base64,${buffer.toString("base64")}`;
      } catch (e: any) {
        clearTimeout(timeout);
        if (retry === 0 && model.retries > 1 && (e.name === "AbortError" || /timeout|abort/i.test(e.message))) continue;
        console.warn(`[Pollinations] ${model.id} error (retry=${retry}): ${e.message}`);
        break;
      }
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
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), model.startsWith("black-forest-labs") ? 14000 : 14000);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "image/png,image/jpeg,image/*;q=0.9,*/*;q=0.8",
          "Cache-Control": "no-cache, no-store",
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        };
        if (hfToken) headers["Authorization"] = `Bearer ${hfToken}`;
        headers["x-wait-for-model"] = "true";
        const endpoint = model.startsWith("black-forest-labs")
          ? `https://router.huggingface.co/hf-inference/models/${model}/v1/text-to-image`
          : `https://api-inference.huggingface.co/models/${model}`;
        const body = model.startsWith("black-forest-labs")
          ? JSON.stringify({ inputs: prompt, parameters: { num_inference_steps: 4, width: 768, height: 768 } })
          : JSON.stringify({ inputs: prompt, parameters: { width: 768, height: 768, num_inference_steps: 20 } });
        const response = await fetch(endpoint, { method: "POST", headers, body, signal: controller.signal });
        clearTimeout(timeout);
        if (response.status === 503) {
          if (attempt === 0) { await new Promise((r) => setTimeout(r, 1500)); continue; }
          await new Promise((r) => setTimeout(r, 2500));
          const retryRes = await fetch(endpoint, { method: "POST", headers, body, signal: AbortSignal.timeout(20000) });
          if (!retryRes.ok) continue;
          const ct2 = retryRes.headers.get("content-type") || "";
          if (!ct2.includes("image")) continue;
          const buf2 = Buffer.from(await retryRes.arrayBuffer());
          const sniff2 = (buf2[0]===0xff&&buf2[1]===0xd8)||(buf2[0]===0x89&&buf2[1]===0x50&&buf2[2]===0x4e&&buf2[3]===0x47);
          if (!sniff2 || buf2.length < 5000) continue;
          const ext2 = ct2.includes("png") ? "png" : "jpeg";
          return `data:image/${ext2};base64,${buf2.toString("base64")}`;
        }
        if (!response.ok) {
          if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
            await new Promise((r) => setTimeout(r, 500)); continue;
          }
          continue;
        }
        const contentType = response.headers.get("content-type") || "";
        const buffer = Buffer.from(await response.arrayBuffer());
        const sniff = (buffer[0]===0xff&&buffer[1]===0xd8)||(buffer[0]===0x89&&buffer[1]===0x50&&buffer[2]===0x4e&&buffer[3]===0x47);
        if (!sniff || buffer.length < 5000) continue;
        const ext = contentType.includes("png") ? "png" : "jpeg";
        return `data:image/${ext};base64,${buffer.toString("base64")}`;
      } catch (e: any) {
        if (attempt === 0) { await new Promise((r) => setTimeout(r, 400)); continue; }
        console.log(`HF model error (${model}):`, e.message);
        continue;
      }
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

  // 依次尝试各生成接口（先快后慢，永远不要先跑长轮询！）
  const funcDeadline = Date.now() + 59000;
  let result: string | null = null;
  let source = "";
  const errors: string[] = [];

  // 兜底 API 可用性检测 → 决定 Pollinations 吃多少预算
  const hasAnyFallback =
    !!process.env.HUGGINGFACE_API_TOKEN || !!process.env.OPENAI_API_KEY || !!process.env.REPLICATE_API_TOKEN;
  // 有兜底：Pollinations 25s → 剩 34s 给 HF/其他；无兜底：Pollinations 直接 54s，函数最后 5s 留做序列化
  const pollBudgetMs = hasAnyFallback ? 25000 : 54000;
  const pollEndAt = Date.now() + pollBudgetMs;

  // 1. Pollinations — openai 第一版用户首选
  {
    try {
      result = await generateWithPollinations(fullPrompt, pollEndAt);
      source = "pollinations";
    } catch (e: any) {
      const m = "Pollinations: " + (e?.message || String(e)).slice(0, 120);
      errors.push(m);
      console.error(m);
    }
  }

  // 2. HuggingFace（免费推理兜底 FLUX.1-schnell / SDXL）— 最坏 30s
  if (!result && Date.now() < funcDeadline - 32000) {
    try {
      result = await generateWithHuggingFace(fullPrompt);
      source = "huggingface";
    } catch (e: any) {
      const m = "HuggingFace: " + (e?.message || String(e)).slice(0, 120);
      errors.push(m);
      console.error(m);
    }
  } else if (!result) {
    errors.push("HuggingFace: skipped — only " + Math.round(funcDeadline - Date.now()) + "ms remaining (need 32s)");
  }

  // 3. OpenAI（如果配置了）— 单次 HTTP 10s
  if (!result && process.env.OPENAI_API_KEY && Date.now() < funcDeadline - 15000) {
    try {
      result = await generateWithOpenAI(fullPrompt);
      source = "openai";
    } catch (e: any) {
      const m = "OpenAI: " + (e?.message || String(e)).slice(0, 120);
      errors.push(m);
      console.error(m);
    }
  } else if (!result && process.env.OPENAI_API_KEY) {
    errors.push("OpenAI: skipped — " + Math.round(funcDeadline - Date.now()) + "ms left (need 15s)");
  }

  // 4. Replicate（如果配置了）— 长轮询最坏 30s，只在剩余 >38s 时启动
  if (!result && process.env.REPLICATE_API_TOKEN && Date.now() < funcDeadline - 38000) {
    try {
      result = await generateWithReplicate(fullPrompt);
      source = "replicate";
    } catch (e: any) {
      const m = "Replicate: " + (e?.message || String(e)).slice(0, 120);
      errors.push(m);
      console.error(m);
    }
  } else if (!result && process.env.REPLICATE_API_TOKEN) {
    errors.push("Replicate: skipped — " + Math.round(funcDeadline - Date.now()) + "ms left (need 38s)");
  }

  if (!result) {
    const debug = {
      elapsed_ms: 59000 - Math.round(funcDeadline - Date.now()),
      poll_budget_ms: pollBudgetMs,
      has_any_fallback: hasAnyFallback,
      env: {
        hasHFToken: !!process.env.HUGGINGFACE_API_TOKEN,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasReplicate: !!process.env.REPLICATE_API_TOKEN,
        hasCreem: !!process.env.CREEM_API_KEY,
        hasSupabase: !!process.env.DATABASE_URL || !!supabaseAdmin,
      },
      errors,
    };
    console.error("[ALL GENERATORS FAILED]", JSON.stringify(debug));
    return NextResponse.json(
      {
        success: false,
        error: "Image generation is temporarily unavailable. Please try again.",
        debug,
      },
      { status: 502 },
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
