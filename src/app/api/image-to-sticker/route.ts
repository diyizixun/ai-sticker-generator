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

// —— 名人面部特征增强（与 /api/generate 对齐）——
const CELEB_TRAITS_I2S: [string, string][] = [
  ["elon musk", "elon musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s, stocky build"],
  ["musk", "musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s"],
  ["elon", "man resembling elon musk: balding short brown hair, square jaw, blue eyes, fair skin, mid-50s"],
  ["zuckerberg", "zuckerberg lookalike: short curly brown hair, pale skin, blue eyes, narrow face, thin lips"],
  ["steve jobs", "steve jobs lookalike: bald head, gray stubble beard, round glasses, gaunt face, fair skin"],
  ["tim cook", "tim cook lookalike: short gray hair, clean shaven, fair skin, blue eyes, slim face"],
  ["bill gates", "bill gates lookalike: balding with glasses, fair skin, blue eyes, round face"],
  ["jack ma", "jack ma lookalike: balding man, small stature, round face, dark eyes, East Asian, glasses"],
  ["donald trump", "trump lookalike: blonde comb-over hairstyle, orange-tinted skin, blue eyes, broad face, pursed lips, late 70s"],
  ["trump", "trump lookalike: blonde comb-over hair, orange skin, blue eyes, broad face, pursed lips"],
  ["joe biden", "biden lookalike: white thinning hair, blue eyes, fair skin, wrinkled elderly face, warm smile"],
  ["biden", "biden lookalike: white thinning hair, blue eyes, fair skin, wrinkled face, elderly"],
  ["barack obama", "obama lookalike: short cropped black hair, dark brown skin, brown eyes, slim face, warm smile"],
  ["obama", "obama lookalike: short cropped black hair, dark brown skin, brown eyes, slim face"],
  ["vladimir putin", "putin lookalike: balding blonde hair, blue eyes, pale skin, stern expression, late 60s"],
  ["putin", "putin lookalike: balding blonde hair, blue eyes, pale skin, stern expression"],
  ["xi jinping", "Chinese man, short black hair, broad face, dark eyes, portly build, stern expression"],
  ["kim jong un", "kim jong un lookalike: short black buzzcut, round flat face, dark eyes, overweight, East Asian"],
  ["modi", "modi lookalike: white hair, gray beard, dark skin, Indian man, elderly"],
  ["macron", "macron lookalike: short dark hair, blue eyes, fair skin, slim face, middle-aged"],
  ["zelensky", "zelensky lookalike: short brown hair, brown eyes, fair skin, stubble beard, middle-aged man"],
  ["kanye west", "kanye west lookalike: bald head, brown skin, brown eyes, full beard"],
  ["kanye", "kanye west lookalike: bald head, brown skin, brown eyes, full beard"],
  ["tom cruise", "tom cruise lookalike: short brown hair, blue eyes, fair skin, square jaw"],
  ["brad pitt", "brad pitt lookalike: long blonde hair, blue eyes, fair skin, strong jaw, goatee"],
  ["leonardo dicaprio", "dicaprio lookalike: slicked back blonde hair, blue eyes, fair skin, round face, goatee"],
  ["leo dicaprio", "dicaprio lookalike: slicked back blonde hair, blue eyes, fair skin, round face"],
  ["michael jordan", "jordan lookalike: bald head, dark brown skin, brown eyes, tall athletic build"],
  ["lebron james", "lebron lookalike: short black hair, dark brown skin, brown eyes, tall muscular build, beard"],
  ["messi", "messi lookalike: short brown hair, brown eyes, fair skin, short beard, compact build"],
  ["lionel messi", "messi lookalike: short brown hair, brown eyes, fair skin, short beard"],
  ["cristiano ronaldo", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build, distinctive jaw"],
  ["ronaldo", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build"],
  ["cr7", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build"],
  ["david beckham", "beckham lookalike: short blonde hair, blue eyes, fair skin, handsome face"],
  ["tiger woods", "tiger woods lookalike: short black hair, brown skin, brown eyes, goatee"],
  ["snoop dogg", "snoop dogg lookalike: tall slim build, long braided black hair, dark brown skin, goatee"],
  ["eminem", "eminem lookalike: short bleached blonde hair, blue eyes, fair skin, slim face"],
  ["drake", "drake lookalike: short black hair, dark beard, brown skin, brown eyes, stocky build"],
  ["taylor swift", "taylor swift lookalike: long blonde straight hair, blue eyes, fair skin, red lips, slim face"],
  ["beyonce", "beyonce lookalike: long blonde wavy hair, light brown skin, brown eyes, curvy build"],
  ["lady gaga", "lady gaga lookalike: long blonde hair, blue eyes, fair skin, bold makeup"],
  ["rihanna", "rihanna lookalike: short dark hair, brown skin, green eyes, full lips"],
  ["adele", "adele lookalike: long red-blonde hair, blue eyes, fair skin, round face"],
  ["kim kardashian", "kim kardashian lookalike: long dark hair, olive skin, brown eyes, full lips, curvy figure"],
  ["emma watson", "emma watson lookalike: short brown hair, brown eyes, fair skin, slim face"],
  ["scarlett johansson", "scarlett johansson lookalike: short blonde hair, blue eyes, fair skin, full lips"],
  ["angelina jolie", "angelina jolie lookalike: long dark hair, blue eyes, fair skin, full lips, distinctive cheekbones"],
  ["megan fox", "megan fox lookalike: long dark hair, blue eyes, fair skin, full lips"],
  ["marilyn monroe", "marilyn monroe lookalike: short blonde curly hair, blue eyes, fair skin, beauty mark, red lips"],
  ["audrey hepburn", "audrey hepburn lookalike: short dark hair, brown eyes, fair skin, slim face, elegant"],
];
const MW = ["\\bman\\b","\\bmen\\b","\\bmale\\b","\\bboy\\b","\\bguy\\b","\\bgentleman\\b","\\bhusband\\b","\\bfather\\b","\\bbrother\\b","\\bson\\b","\\bking\\b","\\bprince\\b","\\bactor\\b","\\bhero\\b"];
const FW = ["\\bwoman\\b","\\bwomen\\b","\\bfemale\\b","\\bgirl\\b","\\blady\\b","\\bgal\\b","\\bwife\\b","\\bmother\\b","\\bmom\\b","\\bsister\\b","\\bdaughter\\b","\\bqueen\\b","\\bprincess\\b","\\bactress\\b","\\bheroine\\b"];

function enhancePrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  for (const [name, traits] of CELEB_TRAITS_I2S) {
    if (lower.includes(name)) return prompt + ", " + traits;
  }
  let m = 0, f = 0;
  for (const w of MW) { try { if (new RegExp(w).test(lower)) m++; } catch {} }
  for (const w of FW) { try { if (new RegExp(w).test(lower)) f++; } catch {} }
  if (m > 0 && m > f) return prompt + ", middle-aged male subject, masculine facial features, handsome man";
  if (f > 0 && f > m) return prompt + ", adult female subject, feminine facial features, beautiful woman";
  return prompt;
}

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

async function generateWithPollinations(prompt: string, deadline?: number): Promise<string> {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);

  // Image2Sticker: 默认给 25s（留出 rembg 8s），如果外部传 deadline 按外部来
  const overallDeadline = deadline || Date.now() + 25000;
  const budgetMs = overallDeadline - Date.now();
  const longBudget = budgetMs >= 35000; // 长预算 = 可能无兜底，多给重试
  const R2 = longBudget ? 3 : 2;

  const MIN_KB: Record<string, number> = {
    openai: 20, turbo: 14, dalle3: 25, sana: 12, dreamshaper: 12, flux: 11, default: 9,
  };
  const attempts = [
    { id: "openai",            qs: `model=openai`,            timeoutMs: 9000, retries: R2 },
    { id: "turbo",             qs: `model=turbo`,             timeoutMs: 8500, retries: R2 },
    { id: "dalle3",            qs: `model=dalle3`,            timeoutMs: 8500, retries: R2 },
    { id: "sana",              qs: `model=sana`,              timeoutMs: 8000, retries: longBudget?2:1 },
    { id: "dreamshaper",       qs: `model=dreamshaper`,       timeoutMs: 8000, retries: longBudget?2:1 },
    { id: "flux",              qs: `model=flux`,              timeoutMs: longBudget?8000:5500, retries: longBudget?2:1 },
    { id: "default",           qs: ``,                        timeoutMs: longBudget?6500:4000, retries: longBudget?2:1 },
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
      const remaining = overallDeadline - Date.now();
      const thisTimeout = Math.min(model.timeoutMs, Math.max(3000, remaining));
      if (retry > 0) await new Promise((r) => setTimeout(r, 220));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), thisTimeout);
      try {
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
        const isLast = i === attempts.length - 1;
        if (buffer.length < minBytes) {
          if (retry === 0 && model.retries > 1) continue;
          if (!isLast) break;
          else if (buffer.length < 6000) break;
        }
        console.log(`[Image2Sticker] ✅ ${model.id} ${(buffer.length/1024).toFixed(0)}KB`);
        return `data:image/${sniff.ext};base64,${buffer.toString("base64")}`;
      } catch (e: any) {
        clearTimeout(timeout);
        if (retry === 0 && model.retries > 1 && (e.name === "AbortError" || /timeout|abort/i.test(e.message))) continue;
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
    const userDescLocked = enhancePrompt(userDesc);
    const fullPrompt = `${stylePrompt}, ${userDescLocked}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;

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
