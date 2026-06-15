// /api/generate - 服务端图片生成
// 优先级: Replicate → Pollinations → OpenAI → HuggingFace

import { NextRequest, NextResponse } from "next/server";
import { getClientId, checkQuota, incrementQuota } from "@/lib/quota";

const STYLE_PROMPTS: Record<string, string> = {
  cute: "cute kawaii chibi style sticker",
  cartoon: "cartoon style sticker with bold outlines",
  pixel: "pixel art style sticker, 16-bit retro game aesthetic",
  realistic: "photorealistic sticker, real photograph style, detailed textures, natural lighting, lifelike shading, 8k resolution",
  minimal: "minimalist flat design sticker, clean simple shapes, limited color palette, geometric",
  vintage: "vintage retro style sticker, aged paper texture, faded colors, distressed look, 1970s aesthetic",
};

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
    return { allowed: false, reason: "moderation_unavailable" };
  }
}

// HuggingFace 免费 Inference API（无需 key，有公共免费额度）
async function generateWithHuggingFace(prompt: string): Promise<string> {
  const hfToken = process.env.HUGGINGFACE_API_TOKEN; // 可选，有 token 更稳定
  
  // 优先 FLUX.1-schnell（质量最好），备用 SD 1.5
  const models = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5",
  ];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8秒，不浪费Vercel配额

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "image/png,image/jpeg,image/*",
      };
      if (hfToken) headers["Authorization"] = `Bearer ${hfToken}`;

      // FLUX 用新 router 端点，其他用旧 api-inference 端点
      const endpoint = model.startsWith("black-forest-labs")
        ? `https://router.huggingface.co/hf-inference/models/${model}/v1/text-to-image`
        : `https://api-inference.huggingface.co/models/${model}`;

      const body = model.startsWith("black-forest-labs")
        ? JSON.stringify({ inputs: prompt, parameters: { num_inference_steps: 4, width: 512, height: 512 } })
        : JSON.stringify({ inputs: prompt, parameters: { width: 512, height: 512 } });

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status === 503) {
        // 模型加载中，尝试下一个
        console.log(`HF model ${model} loading, trying next...`);
        continue;
      }

      if (!response.ok) {
        console.log(`HF model ${model} failed: ${response.status}`);
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("image")) {
        console.log(`HF model ${model} returned non-image: ${contentType}`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 5000) {
        console.log(`HF model ${model} returned too small image`);
        continue;
      }

      const ext = contentType.includes("png") ? "png" : "jpeg";
      return `data:image/${ext};base64,${buffer.toString("base64")}`;
    } catch (e: any) {
      console.log(`HF model error (${model}):`, e.message);
      continue;
    }
  }
  throw new Error("All HuggingFace models failed");
}

// Pollinations AI - 使用 gen.pollinations.ai 新端点 + sk_ 私密密钥
async function generateWithPollinations(prompt: string): Promise<string> {
  const apiKey = process.env.POLLINATIONS_API_KEY || "sk_08ggRC32YTLnHTphGv4SAF3S6N832PCl";
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 100000);
  // 新统一端点：gen.pollinations.ai/image/{prompt}?key=...
  const url = `https://gen.pollinations.ai/image/${encoded}?width=512&height=512&model=flux&seed=${seed}&key=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "Accept": "image/*",
    },
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Pollinations ${response.status}: ${errText.slice(0, 100)}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("image")) {
    const body = await response.text().catch(() => "");
    throw new Error(`Pollinations returned non-image: ${body.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 3000) throw new Error("Image too small");

  const ext = contentType.includes("png") ? "png" : "jpeg";
  return `data:image/${ext};base64,${buffer.toString("base64")}`;
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

  // 免费用户日额度检查
  const clientId = getClientId(req);
  const quota = checkQuota(clientId);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Daily limit reached. You've used all ${quota.limit} free generations today. Come back tomorrow!`,
        quota: { remaining: 0, limit: quota.limit },
      },
      { status: 429 }
    );
  }

  // 内容审核（如有 key）
  const moderation = await moderatePrompt(userPrompt);
  if (!moderation.allowed) {
    const msgs: Record<string, string> = {
      prompt_rejected: "Your prompt was rejected because it violates our content policy.",
      moderation_unavailable: "Content moderation is temporarily unavailable. Please try again.",
    };
    return NextResponse.json(
      { success: false, error: msgs[moderation.reason || ""] || "Content policy violation" },
      { status: 400 }
    );
  }

  const stylePrompt = STYLE_PROMPTS[styleId] || "sticker design";
  const fullPrompt = `${stylePrompt}, ${userPrompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;

  // 1. Replicate（如配置了 token）
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const result = await generateWithReplicate(fullPrompt);
      const remaining = incrementQuota(clientId);
      return NextResponse.json({ success: true, imageUrl: result, source: "replicate", quota: { remaining, limit: quota.limit } });
    } catch (e) {
      console.error("Replicate failed:", e);
    }
  }

  // 2. Pollinations（有可用 key，最快，优先）
  try {
    const result = await generateWithPollinations(fullPrompt);
    const remaining = incrementQuota(clientId);
    return NextResponse.json({ success: true, imageUrl: result, source: "pollinations", quota: { remaining, limit: quota.limit } });
  } catch (e) {
    console.error("Pollinations failed:", e);
  }

  // 3. OpenAI（如配置了 key）
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await generateWithOpenAI(fullPrompt);
      const remaining = incrementQuota(clientId);
      return NextResponse.json({ success: true, imageUrl: result, source: "openai", quota: { remaining, limit: quota.limit } });
    } catch (e) {
      console.error("OpenAI failed:", e);
    }
  }

  // 4. HuggingFace 免费 API
  try {
    const result = await generateWithHuggingFace(fullPrompt);
    const remaining = incrementQuota(clientId);
    return NextResponse.json({ success: true, imageUrl: result, source: "huggingface", quota: { remaining, limit: quota.limit } });
  } catch (e) {
    console.error("HuggingFace failed:", e);
  }

  // 全部失败 — 不扣额度
  return NextResponse.json(
    { success: false, error: "Image generation is temporarily unavailable. Please try again in a moment." },
    { status: 502 }
  );
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
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json", Prefer: "respond-async" },
    body: JSON.stringify({
      version: "black-forest-labs/flux-schnell",
      input: {
        prompt: transparent ? `${prompt}, transparent background, no background, isolated sticker` : prompt,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
        output_quality: 90,
      },
    }),
  });
  if (!response.ok) throw new Error(`Replicate: ${response.status}`);
  const prediction = await response.json();
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
  return url;
}
