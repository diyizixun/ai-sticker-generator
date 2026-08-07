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
// 2026-08 实测（最大输出 768x768 正方形）：
// stable-diffusion  ≈ 1-2s  60-80KB （细节最丰富，最佳质量性价比）
// turbo            ≈ 1-2s  30-40KB （速度快，细节略少）
// default/flux     ≈ 10-45s 30-50KB （慢速，偶尔失败）
async function generateWithPollinations(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 100000);

  // 每个模型的最小文件大小阈值（文件小=压缩率高=细节少）
  const MIN_KB = { "stable-diffusion": 45, turbo: 25, default: 25, flux: 25 };
  const timeouts = [30000, 20000, 40000, 45000]; // sd 30s, turbo 20s, default 40s, flux 45s
  const attempts = [
    { id: "stable-diffusion", qs: `model=stable-diffusion` },
    { id: "turbo", qs: `model=turbo` },
    { id: "default", qs: `` },
    { id: "flux", qs: `model=flux` },
  ];

  for (let i = 0; i < attempts.length; i++) {
    const model = attempts[i];
    // 每个尝试用独立 seed，避免 CDN/服务器缓存返回上一个模型的缓存结果
    const trySeed = seed + i * 31337;
    const url =
      `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${trySeed}&nologo=true` +
      (model.qs ? `&${model.qs}` : "");
    console.log(`[Image2Sticker] Pollinations attempt ${i + 1} (${model.id})`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeouts[i]);
    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "image/*", "Cache-Control": "no-cache" },
      });
      const elapsed = Date.now() - startTime;
      clearTimeout(timeout);
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) continue;
      if (!contentType.includes("image")) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      const minBytes = MIN_KB[model.id] * 1024;
      console.log(
        `[Image2Sticker] ${model.id} returned ${(buffer.length / 1024).toFixed(1)}KB in ${elapsed}ms (need >=${MIN_KB[model.id]}KB)`,
      );
      if (buffer.length < minBytes) {
        const isLast = i === attempts.length - 1;
        if (!isLast) {
          console.warn(`[Image2Sticker] ${model.id} below quality threshold, trying next`);
          continue;
        } else if (buffer.length < 15000) continue;
      }
      const ext = contentType.includes("png") ? "png" : "jpeg";
      console.log(
        `[Image2Sticker] ✅ SUCCESS with ${model.id} — ${(buffer.length / 1024).toFixed(0)}KB · ${elapsed}ms`,
      );
      return `data:image/${ext};base64,${buffer.toString("base64")}`;
    } catch (e: any) {
      clearTimeout(timeout);
      console.warn(`[Image2Sticker] ${model.id} error: ${e.message}`);
      continue;
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
