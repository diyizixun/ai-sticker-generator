// /api/image-to-sticker - 图片转贴纸API
// 优先 Replicate image-to-image，无 token 时降级 Pollinations 文本生成

import { NextRequest, NextResponse } from "next/server";

const STYLE_PROMPTS: Record<string, string> = {
  cute: "cute kawaii chibi style sticker",
  cartoon: "cartoon style sticker with bold outlines",
  pixel: "pixel art style sticker, 16-bit retro game aesthetic",
  realistic: "photorealistic sticker, real photograph style, detailed textures, natural lighting, lifelike shading, 8k resolution",
  minimal: "minimalist flat design sticker, clean simple shapes, limited color palette, geometric",
  vintage: "vintage retro style sticker, aged paper texture, faded colors, distressed look, 1970s aesthetic",
};

// Creem Moderation API 集成
async function moderatePrompt(prompt: string, userId?: string): Promise<{ allowed: boolean; reason?: string }> {
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) {
    return { allowed: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://api.creem.io/v1/moderation/prompt", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        external_id: userId ? `user_${userId}` : undefined,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { allowed: false, reason: "moderation_unavailable" };
    }

    const result = await response.json();
    if (result.decision === "deny" || result.decision === "flag") {
      return { allowed: false, reason: "prompt_rejected" };
    }

    return { allowed: true };
  } catch (e: any) {
    console.warn("Creem moderation unavailable, allowing request");
    return { allowed: true };
  }
}

// Pollinations 文本生成降级（无 Replicate 时使用）
async function generateWithPollinationsFallback(prompt: string): Promise<string> {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  if (!apiKey) throw new Error("POLLINATIONS_API_KEY not set");
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 100000);
  const url = `https://gen.pollinations.ai/image/${encoded}?width=512&height=512&model=flux&seed=${seed}&key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const response = await fetch(url, { signal: controller.signal, headers: { "Accept": "image/*" } });
  clearTimeout(timeout);
  if (!response.ok) throw new Error(`Pollinations ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("image")) throw new Error("Non-image response");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 3000) throw new Error("Image too small");
  const ext = contentType.includes("png") ? "png" : "jpeg";
  return `data:image/${ext};base64,${buffer.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    const style = (formData.get("style") as string) || "cute";
    const prompt = (formData.get("prompt") as string) || "";
    const userId = formData.get("userId") as string | undefined;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // 验证文件大小（最大5MB）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    // 审核提示词
    const moderation = await moderatePrompt(prompt || "image to sticker", userId);
    if (!moderation.allowed) {
      const errorMessages: Record<string, string> = {
        "prompt_rejected": "Content policy violation",
        "moderation_unavailable": "Content moderation unavailable",
      };
      return NextResponse.json(
        { error: errorMessages[moderation.reason || ""] || "Content policy violation" },
        { status: 400 }
      );
    }

    const stylePrompt = STYLE_PROMPTS[style] || "sticker design";
    const fullPrompt = `${stylePrompt}, ${prompt || "sticker"}, transform into sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;

    // ── 优先 Replicate image-to-image ──
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
        // Replicate 失败，降级到 Pollinations
      }
    }

    // ── 降级：Pollinations 文本生成（基于 prompt 生成新贴纸）──
    try {
      const result = await generateWithPollinationsFallback(fullPrompt);
      return NextResponse.json({
        success: true,
        imageUrl: result,
        source: "pollinations-fallback",
        note: "Image transformation unavailable, generated new sticker based on your description."
      });
    } catch (e: any) {
      console.error("Pollinations fallback failed:", e);
      return NextResponse.json(
        { error: "Generation failed. Please try text mode instead." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Image to sticker error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function generateWithReplicate(imageDataUri: string, prompt: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN!;

  // 使用 Flux 模型进行 image-to-image 转换
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Prefer: "respond-async",
    },
    body: JSON.stringify({
      version: "black-forest-labs/flux-schnell",
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
    const errText = await response.text();
    throw new Error(`Replicate: ${response.status} - ${errText}`);
  }

  const prediction = await response.json();

  // 轮询结果
  let result = prediction;
  let attempts = 0;
  while (result.status !== "succeeded" && result.status !== "failed" && attempts < 15) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { Authorization: `Token ${token}` },
    });
    result = await pollRes.json();
    attempts++;
  }

  if (result.status === "succeeded" && result.output?.[0]) {
    return result.output[0];
  }
  throw new Error("Replicate generation failed");
}
