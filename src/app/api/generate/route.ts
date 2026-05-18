// /api/generate - 服务端代理生成图片
// GET: 代理生成（Vercel Hobby兼容，9秒内返回base64）
// POST: 额度检查 + 付费API

import { NextRequest, NextResponse } from "next/server";

const STYLE_PROMPTS: Record<string, string> = {
  cute: "cute kawaii chibi style sticker",
  cartoon: "cartoon style sticker with bold outlines",
  pixel: "pixel art style sticker, 16-bit retro game aesthetic",
  realistic: "realistic detailed sticker with shading and highlights",
  minimal: "minimalist flat design sticker, clean simple shapes",
  vintage: "vintage retro style sticker, aged paper texture",
};

const BLOCKED = ["nude", "nsfw", "porn", "violent", "gore", "hate"];

// GET: 代理生成图片，返回base64 data URL
export async function GET(req: NextRequest) {
  const userPrompt = req.nextUrl.searchParams.get("prompt");
  const styleId = req.nextUrl.searchParams.get("style") || "cute";

  if (!userPrompt || userPrompt.trim().length === 0) {
    return NextResponse.json({ success: false, error: "Please enter a description" }, { status: 400 });
  }
  if (userPrompt.length > 500) {
    return NextResponse.json({ success: false, error: "Description too long" }, { status: 400 });
  }
  const lower = userPrompt.toLowerCase();
  for (const w of BLOCKED) {
    if (lower.includes(w)) {
      return NextResponse.json({ success: false, error: "Content violates policy" }, { status: 400 });
    }
  }

  const stylePrompt = STYLE_PROMPTS[styleId] || "sticker design";
  const fullPrompt = `${stylePrompt}, ${userPrompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;

  // 优先使用付费API
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const result = await generateWithReplicate(fullPrompt);
      return NextResponse.json({ success: true, imageUrl: result });
    } catch (e) {
      console.error("Replicate failed, fallback:", e);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await generateWithOpenAI(fullPrompt);
      return NextResponse.json({ success: true, imageUrl: result });
    } catch (e) {
      console.error("OpenAI failed, fallback:", e);
    }
  }

  // Pollinations免费生成
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
      return NextResponse.json(
        { success: false, error: `Generation failed (${response.status}). Please retry.` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("image")) {
      return NextResponse.json(
        { success: false, error: "Generation returned invalid content. Please retry." },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 3000) {
      return NextResponse.json(
        { success: false, error: "Generated image too small. Please retry." },
        { status: 502 }
      );
    }

    const base64 = buffer.toString("base64");
    const dataUrl = `data:${contentType.includes("png") ? "image/png" : "image/jpeg"};base64,${base64}`;

    return NextResponse.json({ success: true, imageUrl: dataUrl });
  } catch (e: any) {
    if (e.name === "AbortError") {
      return NextResponse.json(
        { success: false, error: "Generation timed out (8s). Vercel Hobby plan has 10s limit. Adding a Replicate API key will fix this." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}

// POST: 额度检查（保留给付费功能用）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, style } = body;

    let authUser: any = null;
    try {
      const { getCurrentUser } = await import("@/lib/auth/session");
      authUser = await getCurrentUser();
    } catch { /* no auth */ }

    // 返回生成URL让前端调GET
    const stylePrompt = STYLE_PROMPTS[style] || "sticker design";
    const fullPrompt = `${stylePrompt}, ${prompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;
    const encoded = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 100000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${seed}`;

    return NextResponse.json({
      success: true,
      generateUrl: `/api/generate?prompt=${encodeURIComponent(prompt)}&style=${style}`,
      pollinationsUrl,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

async function generateWithReplicate(prompt: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN!;
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json", Prefer: "respond-async" },
    body: JSON.stringify({
      version: "black-forest-labs/flux-schnell",
      input: { prompt, num_outputs: 1, aspect_ratio: "1:1", output_format: "png", output_quality: 90 },
    }),
  });
  if (!response.ok) throw new Error(`Replicate: ${response.status}`);
  const prediction = await response.json();
  let result = prediction;
  let attempts = 0;
  while (result.status !== "succeeded" && result.status !== "failed" && attempts < 30) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { Authorization: `Token ${token}` },
    });
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
    body: JSON.stringify({ model: "gpt-image-1", prompt, n: 1, size: "1024x1024" }),
  });
  if (!response.ok) throw new Error(`OpenAI: ${response.status}`);
  const data = await response.json();
  const url = data.data?.[0]?.url || data.data?.[0]?.b64_json;
  if (!url) throw new Error("No image from OpenAI");
  return url.startsWith("data:") ? url : url;
}
