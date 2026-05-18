// /api/generate - 服务端代理生成图片
// GET: 快速生成（Pollinations免费，9秒内返回base64）
// POST: 付费API（Replicate高质量+透明背景）

import { NextRequest, NextResponse } from "next/server";

const STYLE_PROMPTS: Record<string, string> = {
  cute: "cute kawaii chibi style sticker",
  cartoon: "cartoon style sticker with bold outlines",
  pixel: "pixel art style sticker, 16-bit retro game aesthetic",
  realistic: "photorealistic sticker, real photograph style, detailed textures, natural lighting, lifelike shading, 8k resolution",
  minimal: "minimalist flat design sticker, clean simple shapes, limited color palette, geometric",
  vintage: "vintage retro style sticker, aged paper texture, faded colors, distressed look, 1970s aesthetic",
};

const BLOCKED = ["nude", "nsfw", "porn", "violent", "gore", "hate"];

// GET: 优先Pollinations免费生成，Vercel Hobby 9秒超时
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

  // 优先使用Replicate（如果配置了）
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const result = await generateWithReplicate(fullPrompt);
      return NextResponse.json({ success: true, imageUrl: result, source: "replicate" });
    } catch (e) {
      console.error("Replicate failed, fallback:", e);
    }
  }

  // OpenAI备选
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await generateWithOpenAI(fullPrompt);
      return NextResponse.json({ success: true, imageUrl: result, source: "openai" });
    } catch (e) {
      console.error("OpenAI failed, fallback:", e);
    }
  }

  // Pollinations免费生成（最快，无水印）
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

    return NextResponse.json({ success: true, imageUrl: dataUrl, source: "pollinations" });
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

// POST: 专用付费生成（Replicate高质量+透明背景）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, style } = body;

    let authUser: any = null;
    try {
      const { getCurrentUser } = await import("@/lib/auth/session");
      authUser = await getCurrentUser();
    } catch { /* no auth */ }

    // Pro用户优先用Replicate
    if (authUser?.plan === "pro" && process.env.REPLICATE_API_TOKEN) {
      try {
        const stylePrompt = STYLE_PROMPTS[style] || "sticker design";
        const fullPrompt = `${stylePrompt}, ${prompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;
        const result = await generateWithReplicate(fullPrompt, true); // 透明背景
        return NextResponse.json({ success: true, imageUrl: result, pro: true });
      } catch (e) {
        console.error("Pro generation failed:", e);
      }
    }

    // 免费用户返回生成URL让前端调GET
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

async function generateWithReplicate(prompt: string, transparent: boolean = false): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN!;
  
  // 使用Flux Schnell（快速模型，2-3秒出图）
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json", Prefer: "respond-async" },
    body: JSON.stringify({
      version: "black-forest-labs/flux-schnell",
      input: { 
        prompt: transparent ? `${prompt}, transparent background, no background, isolated sticker on white` : prompt, 
        num_outputs: 1, 
        aspect_ratio: "1:1", 
        output_format: "png", 
        output_quality: 90,
        disable_safety_checker: true,
      },
    }),
  });
  
  if (!response.ok) throw new Error(`Replicate: ${response.status}`);
  
  const prediction = await response.json();
  
  // 轮询状态（最多30秒）
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
