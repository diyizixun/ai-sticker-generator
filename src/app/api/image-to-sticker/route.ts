// /api/image-to-sticker - 图片转贴纸API
// 优先 Replicate image-to-image，无 token 时用 Pollinations 文本生成（基于用户描述）

import { NextRequest, NextResponse } from "next/server";
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
    return { allowed: true };
  }
}

// Pollinations 文本生成（免费，无需 API Key）
// 2026-08-08 实测（最大输出 768x768 正方形）：
// openai             66%成功率  1.5-2s   44-63KB   用户最怀念的「第一版」高质量效果
// stable-diffusion   ~50%成功率 42s      60-80KB   文件最大细节多，慢到 Vercel 超时边缘
// turbo              66%成功率  1-14s    27-51KB   速度快，细节略差
// dalle3             33%成功率  3s+      55-75KB   A+顶级质量，但成功率低
// default/flux       约 40%     10-45s   30-50KB   慢速兜底
async function generateWithPollinations(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);

  // ⚠️ 总预算 < Vercel maxDuration(60s) → 链内 48s，给 rembg/HF 留 12s
  // 质量阈值降低 + HTTP 429/500/超时自动重试（换 seed），应对今天 Pollinations 服务端抖动
  const MIN_KB: Record<string, number> = {
    openai: 28,
    turbo: 18,
    dalle3: 35,
    flux: 15,
  };
  const perAttemptTimeoutMs = 12000;
  const attempts = [
    { id: "openai", qs: `model=openai` },              // ① 用户最怀念的「第一版」高质量
    { id: "turbo",  qs: `model=turbo` },               // ② 成功率最高（66%）速度快
    { id: "dalle3", qs: `model=dalle3` },              // ③ A+ 顶级质量
    { id: "flux",   qs: `model=flux` },                // ④ 最后兜底（flux 稳）
  ];
  const overallDeadline = Date.now() + 48000;

  for (let i = 0; i < attempts.length; i++) {
    if (Date.now() >= overallDeadline) break;
    const model = attempts[i];
    // 每个模型 2 次尝试：HTTP 429/500/超时/低于阈值 → 换 seed +150ms 再试一次
    for (let retry = 0; retry < 2; retry++) {
      if (Date.now() >= overallDeadline) break;
      const trySeed = seed + i * 1013904223 + retry * 2654435761;
      const url =
        `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${trySeed}&nologo=true` +
        (model.qs ? `&${model.qs}` : "");
      console.log(`[Image2Sticker] Attempt ${i + 1} (${model.id}) retry=${retry}`);
      const remaining = overallDeadline - Date.now();
      const thisTimeout = Math.min(perAttemptTimeoutMs, Math.max(3000, remaining));
      if (retry > 0) await new Promise((r) => setTimeout(r, 150));
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
        if ((response.status === 429 || response.status === 500 || response.status === 502) && retry === 0) {
          continue; // 瞬时限流 → 重试
        }
        if (!response.ok) break;
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("image")) break;
        const buffer = Buffer.from(await response.arrayBuffer());
        const minBytes = MIN_KB[model.id] * 1024;
        console.log(
          `[Image2Sticker] ${model.id} returned ${(buffer.length / 1024).toFixed(1)}KB in ${elapsed}ms (need >=${MIN_KB[model.id]}KB)`,
        );
        const isLast = i === attempts.length - 1;
        if (buffer.length < minBytes) {
          if (retry === 0) continue; // 换 seed 再试一次
          if (!isLast) break;
          else if (buffer.length < 10000) break;
        }
        const ext = contentType.includes("png") ? "png" : "jpeg";
        console.log(
          `[Image2Sticker] ✅ SUCCESS with ${model.id} — ${(buffer.length / 1024).toFixed(0)}KB · ${elapsed}ms`,
        );
        return `data:image/${ext};base64,${buffer.toString("base64")}`;
      } catch (e: any) {
        clearTimeout(timeout);
        if (retry === 0 && (e.name === "AbortError" || /timeout|abort/i.test(e.message))) continue;
        break;
      }
    }
  }
  throw new Error("All Pollinations models failed");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    const style = (formData.get("style") as string) || "cute";
    const prompt = (formData.get("prompt") as string) || "";
    const userId = formData.get("userId") as string | undefined;

    if (!file) {
      return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File too large (max 5MB)" }, { status: 400 });
    }

    // 审核提示词
    const moderation = await moderatePrompt(prompt || "image to sticker", userId);
    if (!moderation.allowed) {
      const msgs: Record<string, string> = {
        prompt_rejected: "Content policy violation",
        moderation_unavailable: "Content moderation unavailable",
      };
      return NextResponse.json(
        { success: false, error: msgs[moderation.reason || ""] || "Content policy violation" },
        { status: 400 }
      );
    }

    const stylePrompt = STYLE_PROMPTS[style] || "sticker design";
    const userDesc = prompt || "sticker design based on uploaded image";
    const fullPrompt = `${stylePrompt}, ${userDesc}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;

    // 优先 Replicate image-to-image
    if (process.env.REPLICATE_API_TOKEN) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString("base64");
        const dataUri = `data:${file.type};base64,${base64Image}`;
        const result = await generateWithReplicate(dataUri, fullPrompt);
        return NextResponse.json({ success: true, imageUrl: result, source: "replicate" });
      } catch (e: any) {
        console.error("Replicate image-to-sticker failed:", e);
      }
    }

    // 降级：用 Pollinations 基于用户描述生成新贴纸
    try {
      const result = await generateWithPollinations(fullPrompt);
      return NextResponse.json({
        success: true,
        imageUrl: result,
        source: "pollinations",
        note: "Generated new sticker based on your description.",
      });
    } catch (e: any) {
      console.error("Pollinations fallback failed:", e);
      return NextResponse.json(
        { success: false, error: "Generation failed. Please try text mode instead." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Image to sticker error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

async function generateWithReplicate(imageDataUri: string, prompt: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN!;
  const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Prefer: "respond-async",
    },
    body: JSON.stringify({
      input: {
        prompt: prompt,
        image: imageDataUri,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
        output_quality: 90,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Replicate: ${response.status} - ${errText.slice(0, 200)}`);
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

  if (result.status === "succeeded" && result.output?.[0]) {
    return result.output[0];
  }
  throw new Error("Replicate generation failed");
}
