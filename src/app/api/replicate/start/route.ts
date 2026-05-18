// /api/replicate/start - 启动 Replicate 图片生成，立即返回 prediction ID
// Vercel Hobby 兼容：此接口 <1s 返回，轮询交给客户端

import { NextRequest, NextResponse } from "next/server";

const STYLE_PROMPTS: Record<string, string> = {
  cute: "cute kawaii chibi style sticker",
  cartoon: "cartoon style sticker with bold outlines",
  pixel: "pixel art style sticker, 16-bit retro game aesthetic",
  realistic: "photorealistic sticker, real photograph style, detailed textures, natural lighting, lifelike shading, NOT cartoon, NOT chibi, NOT anime",
  minimal: "minimalist flat design sticker, clean simple shapes, limited color palette, geometric",
  vintage: "vintage retro style sticker, aged paper texture, faded colors, distressed look, 1970s aesthetic",
};

const BLOCKED = ["nude", "nsfw", "porn", "violent", "gore", "hate"];

export async function POST(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Replicate not configured" }, { status: 503 });
  }

  try {
    const { prompt, style } = await req.json();
    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });
    }
    if (prompt.length > 500) {
      return NextResponse.json({ error: "Prompt too long" }, { status: 400 });
    }
    const lower = prompt.toLowerCase();
    for (const w of BLOCKED) {
      if (lower.includes(w)) {
        return NextResponse.json({ error: "Content policy violation" }, { status: 400 });
      }
    }

    const stylePrompt = STYLE_PROMPTS[style] || "sticker design";
    const fullPrompt = `${stylePrompt}, ${prompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;

    // 启动异步预测，Prefer: respond-async 让 API 立即返回
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
          prompt: fullPrompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 90,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Replicate start error:", response.status, errText);
      return NextResponse.json({ error: `Replicate API error: ${response.status}` }, { status: 502 });
    }

    const prediction = await response.json();
    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
    });
  } catch (e: any) {
    console.error("Replicate start exception:", e);
    return NextResponse.json({ error: "Failed to start generation" }, { status: 500 });
  }
}
