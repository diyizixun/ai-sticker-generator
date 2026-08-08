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
// 二进制 magic bytes 判定真图片（不依赖可能被 proxy/CF 篡改的 content-type header）
function sniffImage(bytes: Buffer): { ok: true; ext: "jpeg" | "png" } | { ok: false } {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return { ok: true, ext: "jpeg" };
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ok: true, ext: "png" };
  }
  return { ok: false };
}

async function generateWithPollinations(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);

  // ⚠️ 总预算 < Vercel maxDuration(60s) → 链内 48s，给 rembg/HF 留 12s
  const MIN_KB: Record<string, number> = {
    openai: 22,
    turbo: 15,
    dalle3: 28,
    flux: 12,
  };
  const perAttemptTimeoutMs = 11000;
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
    for (let retry = 0; retry < 2; retry++) {
      if (Date.now() >= overallDeadline) break;
      const trySeed = seed + i * 1013904223 + retry * 2654435761;
      const url =
        `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${trySeed}&nologo=true` +
        (model.qs ? `&${model.qs}` : "");
      console.log(`[Image2Sticker] Attempt ${i + 1} (${model.id}) retry=${retry}`);
      const remaining = overallDeadline - Date.now();
      const thisTimeout = Math.min(perAttemptTimeoutMs, Math.max(3000, remaining));
      if (retry > 0) await new Promise((r) => setTimeout(r, 250));
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
        if (transientFail && retry === 0) continue;
        if (!response.ok) break;
        const buffer = Buffer.from(await response.arrayBuffer());
        const sniff = sniffImage(buffer);
        if (!sniff.ok) {
          if (retry === 0) continue; // 2xx 但不是真图片（CF HTML/反爬）→ 重试
          break;
        }
        const minBytes = MIN_KB[model.id] * 1024;
        console.log(
          `[Image2Sticker] ${model.id} ${sniff.ext} ${(buffer.length / 1024).toFixed(1)}KB ${elapsed}ms`,
        );
        const isLast = i === attempts.length - 1;
        if (buffer.length < minBytes) {
          if (retry === 0) continue;
          if (!isLast) break;
          else if (buffer.length < 8000) break;
        }
        console.log(
          `[Image2Sticker] ✅ SUCCESS ${model.id} — ${(buffer.length / 1024).toFixed(0)}KB ${sniff.ext} · ${elapsed}ms`,
        );
        return `data:image/${sniff.ext};base64,${buffer.toString("base64")}`;
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
