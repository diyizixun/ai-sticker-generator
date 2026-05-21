// /api/image-to-sticker - 图片转贴纸API
// 接收上传的图片，调用AI服务转换为贴纸风格

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
    if (e.name === "AbortError") {
      console.error("Moderation API timeout");
    }
    return { allowed: false, reason: "moderation_unavailable" };
  }
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

    // 读取图片文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64Image}`;

    const stylePrompt = STYLE_PROMPTS[style] || "sticker design";
    const fullPrompt = `${stylePrompt}, ${prompt}, transform into sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;

    // 优先使用Replicate（如果配置了）
    if (process.env.REPLICATE_API_TOKEN) {
      try {
        const result = await generateWithReplicate(dataUri, fullPrompt);
        return NextResponse.json({ success: true, imageUrl: result, source: "replicate" });
      } catch (e) {
        console.error("Replicate failed:", e);
      }
    }

    // Pollinations备选（免费，但image-to-image支持有限）
    try {
      const encoded = encodeURIComponent(fullPrompt);
      const seed = Math.floor(Math.random() * 100000);
      const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${seed}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "AI-Sticker-Generator/1.0" },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json({ error: "Generation failed" }, { status: 502 });
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("image")) {
        return NextResponse.json({ error: "Generation failed" }, { status: 502 });
      }

      const resultBuffer = Buffer.from(await response.arrayBuffer());
      const resultBase64 = resultBuffer.toString("base64");
      const dataUrl = `data:${contentType.includes("png") ? "image/png" : "image/jpeg"};base64,${resultBase64}`;

      return NextResponse.json({ success: true, imageUrl: dataUrl, source: "pollinations" });
    } catch (e: any) {
      if (e.name === "AbortError") {
        return NextResponse.json({ error: "Generation timeout" }, { status: 504 });
      }
      return NextResponse.json({ error: "Generation failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("Image to sticker error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function generateWithReplicate(imageDataUri: string, prompt: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN!;
  
  // 使用Flux模型进行image-to-image转换
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
