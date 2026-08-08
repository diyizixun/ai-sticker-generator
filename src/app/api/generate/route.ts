// /api/generate - 服务端图片生成
// 模型优先级: Pollinations(openai 第一版) → turbo → dalle3 → flux → sd → default → HuggingFace(FLUX.1-schnell) → OpenAI → Replicate
// 零兜底环境自动 54s 长预算 + 3 次重试；有 HF/OAI/Rep token 时 25s 短预算，留 34s 给兜底
// 人物性别锁: musk/trump/biden 等名人 + man/woman/boy/girl 关键词 → 自动注入性别锁词

import { NextRequest, NextResponse } from "next/server";
import { getClientId, checkQuota } from "@/lib/quota";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { STYLES } from "@/lib/config";

// 单一数据源：从 lib/config 的 STYLES 构建，避免前后端提示词不一致
const STYLE_PROMPTS: Record<string, string> = STYLES.reduce(
  (acc, s) => {
    acc[s.id] = s.prompt;
    return acc;
  },
  {} as Record<string, string>,
);

// 名人面部特征数据库 — 开源模型不认识名人名字，
// 必须注入详细五官描述才能生成相似的面孔
// 格式: [匹配关键词, 面部特征描述]
const CELEB_TRAITS: [string, string][] = [
  // 科技圈
  ["elon musk", "elon musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s, slight double chin, confident expression, stocky build"],
  ["musk", "musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s, stocky build"],
  ["elon", "man resembling elon musk: balding short brown hair, square jaw, blue eyes, fair skin, mid-50s"],
  ["mark zuckerberg", "zuckerberg lookalike: short curly brown hair, pale skin, blue eyes, narrow face, thin lips, young man, robotic expression"],
  ["zuckerberg", "zuckerberg lookalike: short curly brown hair, pale skin, blue eyes, narrow face, thin lips"],
  ["zuck", "zuckerberg lookalike: short curly brown hair, pale skin, blue eyes, narrow face"],
  ["steve jobs", "steve jobs lookalike: bald head, gray stubble beard, round glasses, gaunt face, fair skin, middle-aged man"],
  ["tim cook", "tim cook lookalike: short gray hair, clean shaven, fair skin, blue eyes, slim face, middle-aged man"],
  ["bill gates", "bill gates lookalike: balding with glasses, fair skin, blue eyes, round face, middle-aged man"],
  ["jack ma", "jack ma lookalike: balding man, small stature, round face, dark eyes, East Asian, glasses, distinctive smile"],
  ["ma yun", "jack ma lookalike: balding man, small stature, round face, dark eyes, East Asian, glasses"],
  ["ren zhengfei", "elderly Chinese man, balding gray hair, square glasses, weathered face, severe expression"],
  ["zhang yiming", "young Chinese man, short black hair, glasses, slim face, neutral expression"],
  ["lei jun", "middle-aged Chinese man, short black hair, round face, glasses, energetic smile"],
  // 政治圈
  ["donald trump", "trump lookalike: blonde comb-over hairstyle, orange-tinted skin, blue eyes, broad face, pursed lips, heavyset build, late 70s man, distinctive squint"],
  ["trump", "trump lookalike: blonde comb-over hair, orange skin, blue eyes, broad face, pursed lips, late 70s"],
  ["joe biden", "biden lookalike: white thinning hair, blue eyes, fair skin, aviator sunglasses, wrinkled face, elderly man, warm smile"],
  ["biden", "biden lookalike: white thinning hair, blue eyes, fair skin, wrinkled elderly face, warm smile"],
  ["barack obama", "obama lookalike: short cropped black hair, dark brown skin, brown eyes, slim face, warm smile, middle-aged Black man"],
  ["obama", "obama lookalike: short cropped black hair, dark brown skin, brown eyes, slim face, warm smile"],
  ["vladimir putin", "putin lookalike: balding blonde hair, blue eyes, pale skin, stern expression, compact build, late 60s man"],
  ["putin", "putin lookalike: balding blonde hair, blue eyes, pale skin, stern expression, late 60s"],
  ["xi jinping", "Chinese man, short black hair, broad face, dark eyes, portly build, stern expression, middle-aged"],
  ["jinping", "Chinese man, short black hair, broad face, dark eyes, portly build, stern expression"],
  ["kim jong un", "kim jong un lookalike: short black buzzcut, round flat face, dark eyes, overweight, East Asian, distinctive flat-top haircut"],
  ["kim jong", "kim jong un lookalike: short black buzzcut, round face, dark eyes, overweight, East Asian"],
  ["narendra modi", "modi lookalike: white hair, gray beard, dark skin, Indian man, traditional expression, elderly"],
  ["modi", "modi lookalike: white hair, gray beard, dark skin, Indian man, elderly"],
  ["emmanuel macron", "macron lookalike: short dark hair, blue eyes, fair skin, slim face, middle-aged French man"],
  ["macron", "macron lookalike: short dark hair, blue eyes, fair skin, slim face, middle-aged"],
  ["zelensky", "zelensky lookalike: short brown hair, brown eyes, fair skin, stubble beard, olive green t-shirt, middle-aged man"],
  ["zelenskyy", "zelensky lookalike: short brown hair, brown eyes, fair skin, stubble beard, middle-aged man"],
  // 娱乐/体育
  ["kanye west", "kanye west lookalike: bald head, brown skin, brown eyes, full beard, stocky build, confident expression"],
  ["kanye", "kanye west lookalike: bald head, brown skin, brown eyes, full beard"],
  ["tom cruise", "tom cruise lookalike: short brown hair, blue eyes, fair skin, square jaw, distinctive crooked teeth, middle-aged man"],
  ["brad pitt", "brad pitt lookalike: long blonde hair, blue eyes, fair skin, strong jaw, goatee, middle-aged man"],
  ["leonardo dicaprio", "dicaprio lookalike: slicked back blonde hair, blue eyes, fair skin, round face, goatee, middle-aged man"],
  ["leo dicaprio", "dicaprio lookalike: slicked back blonde hair, blue eyes, fair skin, round face, goatee"],
  ["michael jordan", "jordan lookalike: bald head, dark brown skin, brown eyes, tall athletic build, distinctive ear shape, Black man"],
  ["lebron james", "lebron lookalike: short black hair, dark brown skin, brown eyes, tall muscular build, beard, Black man"],
  ["messi", "messi lookalike: short brown hair, brown eyes, fair skin, short beard, compact build, Argentine man"],
  ["lionel messi", "messi lookalike: short brown hair, brown eyes, fair skin, short beard, compact build"],
  ["cristiano ronaldo", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build, distinctive jaw, Portuguese man"],
  ["ronaldo", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build, distinctive jaw"],
  ["cr7", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build, distinctive jaw"],
  ["david beckham", "beckham lookalike: short blonde hair, blue eyes, fair skin, handsome face, tattoos, slim build"],
  ["tiger woods", "tiger woods lookalike: short black hair, brown skin, brown eyes, goatee, athletic build, mixed race man"],
  ["snoop dogg", "snoop dogg lookalike: tall slim build, long braided black hair, dark brown skin, brown eyes, distinctive goatee, sunglasses"],
  ["eminem", "eminem lookalike: short bleached blonde hair, blue eyes, fair skin, slim face, Caucasian man"],
  ["drake", "drake lookalike: short black hair, dark beard, brown skin, brown eyes, stocky build, Black man"],
  // 女性名人
  ["taylor swift", "taylor swift lookalike: long blonde straight hair, blue eyes, fair skin, red lips, slim face, young woman"],
  ["beyonce", "beyonce lookalike: long blonde wavy hair, light brown skin, brown eyes, curvy build, glamorous woman"],
  ["lady gaga", "lady gaga lookalike: long blonde hair, blue eyes, fair skin, bold makeup, theatrical expression, young woman"],
  ["rihanna", "rihanna lookalike: short dark hair, brown skin, green eyes, full lips, Barbadian woman, glamorous"],
  ["adele", "adele lookalike: long red-blonde hair, blue eyes, fair skin, round face, fuller figure, British woman"],
  ["miley cyrus", "miley cyrus lookalike: short blonde hair, blue eyes, fair skin, slim face, young woman"],
  ["katy perry", "katy perry lookalike: long dark hair, blue eyes, fair skin, full lips, young woman"],
  ["shakira", "shakira lookalike: long blonde wavy hair, brown eyes, fair skin, Colombian woman, slim build"],
  ["kim kardashian", "kim kardashian lookalike: long dark hair, olive skin, brown eyes, full lips, curvy figure, glamorous"],
  ["kylie jenner", "kylie jenner lookalike: long dark hair, olive skin, full lips, young woman, glamorous makeup"],
  ["emma watson", "emma watson lookalike: short brown hair, brown eyes, fair skin, slim face, British young woman"],
  ["scarlett johansson", "scarlett johansson lookalike: short blonde hair, blue eyes, fair skin, full lips, curvy figure"],
  ["angelina jolie", "angelina jolie lookalike: long dark hair, blue eyes, fair skin, full lips, distinctive cheekbones"],
  ["megan fox", "megan fox lookalike: long dark hair, blue eyes, fair skin, full lips, distinctive eyebrows"],
  ["marilyn monroe", "marilyn monroe lookalike: short blonde curly hair, blue eyes, fair skin, beauty mark, red lips, 1950s glamour"],
  ["audrey hepburn", "audrey hepburn lookalike: short dark hair, brown eyes, fair skin, slim face, elegant 1950s style"],
];

const MALE_WORDS = [
  "\\bman\\b", "\\bmen\\b", "\\bmale\\b", "\\bboy\\b", "\\bboys\\b",
  "\\bguy\\b", "\\bguys\\b", "\\bgentleman\\b", "\\bgentlemen\\b",
  "\\bhusband\\b", "\\bfather\\b", "\\bbrother\\b", "\\bson\\b",
  "\\buncle\\b", "\\bgrandpa\\b", "\\bking\\b", "\\bprince\\b",
  "\\bactor\\b", "\\bwaiter\\b", "\\bhero\\b",
];
const FEMALE_WORDS = [
  "\\bwoman\\b", "\\bwomen\\b", "\\bfemale\\b", "\\bgirl\\b", "\\bgirls\\b",
  "\\blady\\b", "\\bladies\\b", "\\bgal\\b", "\\bgals\\b",
  "\\bwife\\b", "\\bmother\\b", "\\bmom\\b", "\\bsister\\b", "\\bdaughter\\b",
  "\\baunt\\b", "\\bgrandma\\b", "\\bqueen\\b", "\\bprincess\\b",
  "\\bactress\\b", "\\bwaitress\\b", "\\bheroine\\b",
];

function enhancePrompt(prompt: string): string {
  const lower = prompt.toLowerCase();

  // 1) 名人面部特征增强 — 找到匹配的名人，注入详细五官描述
  for (const [name, traits] of CELEB_TRAITS) {
    if (lower.includes(name)) {
      return prompt + ", " + traits;
    }
  }

  // 2) 没匹配到名人 → 通用性别词增强（保留原有逻辑作为 fallback）
  let addMale = 0;
  let addFemale = 0;
  for (const w of MALE_WORDS) { try { if (new RegExp(w).test(lower)) addMale++; } catch {} }
  for (const w of FEMALE_WORDS) { try { if (new RegExp(w).test(lower)) addFemale++; } catch {} }

  if (addMale > 0 && addMale > addFemale) {
    return prompt + ", middle-aged male subject, masculine facial features, handsome man";
  }
  if (addFemale > 0 && addFemale > addMale) {
    return prompt + ", adult female subject, feminine facial features, beautiful woman";
  }
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
    console.warn("Creem moderation unavailable, allowing request");
    return { allowed: true };
  }
}

// Pollinations AI - 免费，无需 API Key
// 2026-08-08 3 prompts × 1 seed 实测（最大输出 768x768 正方形）：
// openai             66%成功率  1.5-2s   44-63KB   用户最怀念的「第一版」高质量效果
// stable-diffusion   ~50%成功率 42s      60-80KB   文件最大细节多，但慢到 Vercel 超时边缘
// turbo              66%成功率  1-14s    27-51KB   速度快，细节略差且波动大
// dalle3             33%成功率  3s+      55-75KB   质量顶级 A+，但成功率低不适合放太前
// default/flux       约 40%     10-45s   30-50KB   慢速兜底
// 用真实二进制 magic bytes 识别图片，不依赖可能被 proxy/cloudflare 篡改的 content-type header
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

  // 如果外部没传 deadline：默认 30s
  const overallDeadline = deadline || Date.now() + 30000;
  // 预算充裕（>35s）说明可能是"零兜底环境"——前 4 模型多给 1 次重试，不浪费函数时间
  const budgetMs = overallDeadline - Date.now();
  const longBudget = budgetMs >= 35000;

  const MIN_KB: Record<string, number> = {
    openai: 25,
    turbo: 20,
    dalle3: 30,
    sana: 20,
    dreamshaper: 20,
    flux: 18,
    default: 15,
  };
  const R2 = longBudget ? 3 : 2; // 长预算（54s）→ 前 4 模型重试 3 次，短预算 2 次
  const attempts = [
    { id: "openai",            qs: `model=openai`,            timeoutMs: 9000, retries: R2 },
    { id: "turbo",             qs: `model=turbo`,             timeoutMs: 8500, retries: R2 },
    { id: "dalle3",            qs: `model=dalle3`,            timeoutMs: 8500, retries: R2 },
    { id: "sana",              qs: `model=sana`,              timeoutMs: 8000, retries: longBudget ? 2 : 1 },
    { id: "dreamshaper",       qs: `model=dreamshaper`,       timeoutMs: 8000, retries: longBudget ? 2 : 1 },
    { id: "flux",              qs: `model=flux`,              timeoutMs: longBudget ? 8000 : 6000, retries: longBudget ? 2 : 1 },
    { id: "default",           qs: ``,                        timeoutMs: longBudget ? 6500 : 4500, retries: longBudget ? 2 : 1 },
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
      console.log(`[Pollinations] Attempt ${i + 1}/${attempts.length} (${model.id}) retry=${retry}`);
      const remaining = overallDeadline - Date.now();
      const thisTimeout = Math.min(model.timeoutMs, Math.max(3000, remaining));
      if (retry > 0) await new Promise((r) => setTimeout(r, 220));
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
        if (transientFail && retry === 0 && model.retries > 1) continue;
        if (!response.ok) break;
        const buffer = Buffer.from(await response.arrayBuffer());
        const sniff = sniffImage(buffer);
        if (!sniff.ok) {
          if (retry === 0 && model.retries > 1) continue;
          break;
        }
        const minBytes = MIN_KB[model.id] * 1024;
        console.log(
          `[Pollinations] ${model.id} ${sniff.ext} ${(buffer.length / 1024).toFixed(1)}KB in ${elapsed}ms (need >=${MIN_KB[model.id]}KB)`,
        );
        const isLast = i === attempts.length - 1;
        if (buffer.length < minBytes) {
          if (retry === 0 && model.retries > 1) continue;
          if (!isLast) break;
          else if (buffer.length < 6000) break; // 链尾最后硬地板 6KB（接受有图比没图强）
        }
        console.log(
          `[Pollinations] ✅ SUCCESS ${model.id} — ${(buffer.length / 1024).toFixed(0)}KB ${sniff.ext} · ${elapsed}ms`,
        );
        return `data:image/${sniff.ext};base64,${buffer.toString("base64")}`;
      } catch (e: any) {
        clearTimeout(timeout);
        if (retry === 0 && model.retries > 1 && (e.name === "AbortError" || /timeout|abort/i.test(e.message))) continue;
        console.warn(`[Pollinations] ${model.id} error (retry=${retry}): ${e.message}`);
        break;
      }
    }
  }
  throw new Error("All Pollinations models failed");
}

// Pollinations 二次重试（替代已废弃的 HF 兜底）
// HF Inference API 已弃用所有免费文生图模型（410 Gone），fal-ai provider 不支持 FLUX
// 改为用 Pollinations 的不同模型 + 不同尺寸/seed 再试一轮
async function generateWithHuggingFace(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(prompt);
  const MIN_KB_FALLBACK = 8;
  // 用与主链不同的模型顺序 + 不同尺寸，增加命中概率
  const fallbackAttempts = [
    { qs: `model=flux`,        width: 1024, height: 1024 },
    { qs: `model=turbo`,       width: 512,  height: 512  },
    { qs: `model=sana`,        width: 768,  height: 768  },
    { qs: `model=dreamshaper`, width: 768,  height: 768  },
    { qs: ``,                  width: 512,  height: 512  },
  ];
  const errors: string[] = [];
  for (const att of fallbackAttempts) {
    try {
      const seed = Math.floor(Math.random() * 1000000);
      const url =
        `https://image.pollinations.ai/prompt/${encoded}?width=${att.width}&height=${att.height}&seed=${seed}&nologo=true` +
        (att.qs ? `&${att.qs}` : "");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      });
      clearTimeout(timeout);
      if (!response.ok) {
        errors.push(`${att.qs || "default"}: HTTP ${response.status}`);
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const sniff = (buffer[0]===0xff&&buffer[1]===0xd8)||(buffer[0]===0x89&&buffer[1]===0x50&&buffer[2]===0x4e&&buffer[3]===0x47);
      if (!sniff || buffer.length < MIN_KB_FALLBACK * 1024) {
        errors.push(`${att.qs || "default"}: sniff fail ${buffer.length}B`);
        continue;
      }
      const ext = buffer[0] === 0xff ? "jpeg" : "png";
      return `data:image/${ext};base64,${buffer.toString("base64")}`;
    } catch (e: any) {
      errors.push(`${att.qs || "default"}: ${e.name} ${e.message?.slice(0,60)}`);
      continue;
    }
  }
  throw new Error("Pollinations fallback2 all failed [" + errors.join(" | ") + "]");
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

  const session = req.cookies.get("session")?.value;
  const isLoggedIn = !!session && !!supabaseAdmin;

  // 额度检查
  let quotaInfo: { allowed: boolean; remaining: number; limit: number; isPro: boolean };
  if (isLoggedIn) {
    const today = new Date().toISOString().split("T")[0];
    const { data: userRow } = await supabaseAdmin!
      .from("users")
      .select("plan, subscription_status")
      .eq("email", session)
      .single();
    const isPro = userRow?.plan === "pro" && userRow?.subscription_status === "active";
    const dailyLimit = isPro ? 9999 : 10;
    const { count } = await supabaseAdmin!
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_email", session)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);
    const used = count || 0;
    const remaining = isPro ? 9999 : Math.max(0, dailyLimit - used);
    quotaInfo = { allowed: remaining > 0 || isPro, remaining, limit: dailyLimit, isPro };
  } else {
    const clientId = getClientId(req);
    const q = checkQuota(clientId);
    quotaInfo = { ...q, isPro: false };
  }

  if (!quotaInfo.allowed) {
    return NextResponse.json(
      { success: false, error: `Daily limit reached (${quotaInfo.limit}/day). Come back tomorrow!`, quota: { remaining: 0, limit: quotaInfo.limit } },
      { status: 429 }
    );
  }

  // 内容审核
  const moderation = await moderatePrompt(userPrompt, isLoggedIn ? session : undefined);
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

  const stylePrompt = STYLE_PROMPTS[styleId] || "sticker design";
  const userPromptEnhanced = enhancePrompt(userPrompt);
  const fullPrompt = `${stylePrompt}, ${userPromptEnhanced}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;

  // 依次尝试各生成接口（先快后慢，永远不要先跑长轮询！）
  const funcDeadline = Date.now() + 59000;
  let result: string | null = null;
  let source = "";
  const errors: string[] = [];

  // 兜底 API 可用性检测 → 决定 Pollinations 吃多少预算
  const hasAnyFallback =
    !!process.env.HUGGINGFACE_API_TOKEN || !!process.env.OPENAI_API_KEY || !!process.env.REPLICATE_API_TOKEN;
  // 有兜底：Pollinations 25s → 剩 34s 给 HF/其他；无兜底：Pollinations 直接 54s，函数最后 5s 留做序列化
  const pollBudgetMs = hasAnyFallback ? 25000 : 54000;
  const pollEndAt = Date.now() + pollBudgetMs;

  // 1. Pollinations — openai 第一版用户首选
  {
    try {
      result = await generateWithPollinations(fullPrompt, pollEndAt);
      source = "pollinations";
    } catch (e: any) {
      const m = "Pollinations: " + (e?.message || String(e)).slice(0, 120);
      errors.push(m);
      console.error(m);
    }
  }

  // 2. HuggingFace（免费推理兜底 FLUX.1-schnell / SDXL）— 最坏 30s
  if (!result && Date.now() < funcDeadline - 32000) {
    try {
      result = await generateWithHuggingFace(fullPrompt);
      source = "huggingface";
    } catch (e: any) {
      const m = "HuggingFace: " + (e?.message || String(e)).slice(0, 120);
      errors.push(m);
      console.error(m);
    }
  } else if (!result) {
    errors.push("HuggingFace: skipped — only " + Math.round(funcDeadline - Date.now()) + "ms remaining (need 32s)");
  }

  // 3. OpenAI（如果配置了）— 单次 HTTP 10s
  if (!result && process.env.OPENAI_API_KEY && Date.now() < funcDeadline - 15000) {
    try {
      result = await generateWithOpenAI(fullPrompt);
      source = "openai";
    } catch (e: any) {
      const m = "OpenAI: " + (e?.message || String(e)).slice(0, 120);
      errors.push(m);
      console.error(m);
    }
  } else if (!result && process.env.OPENAI_API_KEY) {
    errors.push("OpenAI: skipped — " + Math.round(funcDeadline - Date.now()) + "ms left (need 15s)");
  }

  // 4. Replicate（如果配置了）— 长轮询最坏 30s，只在剩余 >38s 时启动
  if (!result && process.env.REPLICATE_API_TOKEN && Date.now() < funcDeadline - 38000) {
    try {
      result = await generateWithReplicate(fullPrompt);
      source = "replicate";
    } catch (e: any) {
      const m = "Replicate: " + (e?.message || String(e)).slice(0, 120);
      errors.push(m);
      console.error(m);
    }
  } else if (!result && process.env.REPLICATE_API_TOKEN) {
    errors.push("Replicate: skipped — " + Math.round(funcDeadline - Date.now()) + "ms left (need 38s)");
  }

  if (!result) {
    const debug = {
      elapsed_ms: 59000 - Math.round(funcDeadline - Date.now()),
      poll_budget_ms: pollBudgetMs,
      has_any_fallback: hasAnyFallback,
      env: {
        hasHFToken: !!process.env.HUGGINGFACE_API_TOKEN,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasReplicate: !!process.env.REPLICATE_API_TOKEN,
        hasCreem: !!process.env.CREEM_API_KEY,
        hasSupabase: !!process.env.DATABASE_URL || !!supabaseAdmin,
      },
      errors,
    };
    console.error("[ALL GENERATORS FAILED]", JSON.stringify(debug));
    return NextResponse.json(
      {
        success: false,
        error: "Image generation is temporarily unavailable. Please try again.",
        debug,
      },
      { status: 502 },
    );
  }

  // 生成成功：存 DB + 更新 quota
  let remaining: number;
  if (isLoggedIn) {
    await supabaseAdmin!
      .from("generations")
      .insert({
        user_email: session!,
        prompt: userPrompt,
        style: styleId,
        image_url: result,
        created_at: new Date().toISOString(),
      });
    try {
      const { data: u } = await supabaseAdmin!
        .from("users")
        .select("total_generations")
        .eq("email", session)
        .single();
      const next = (u?.total_generations || 0) + 1;
      await supabaseAdmin!
        .from("users")
        .update({ total_generations: next })
        .eq("email", session);
    } catch (e) {
      console.warn("Failed to increment total_generations:", e);
    }
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabaseAdmin!
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_email", session)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);
    remaining = quotaInfo.isPro ? 9999 : Math.max(0, quotaInfo.limit - (count || 0));
  } else {
    remaining = quotaInfo.remaining;
  }

  return NextResponse.json({
    success: true,
    imageUrl: result,
    source,
    quota: { remaining, limit: quotaInfo.limit },
  });
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
        if (userId && supabaseAdmin) {
          await supabaseAdmin
            .from("generations")
            .insert({
              user_email: userId,
              prompt,
              style,
              image_url: result,
              created_at: new Date().toISOString(),
            });
        }
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
  const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json", Prefer: "respond-async" },
    body: JSON.stringify({
      input: {
        prompt: transparent ? `${prompt}, transparent background, no background, isolated sticker` : prompt,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
        output_quality: 90,
      },
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Replicate: ${response.status} ${errText.slice(0, 200)}`);
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
  if (result.status === "succeeded" && result.output?.[0]) return result.output[0];
  throw new Error("Replicate failed");
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024" }),
  });
  if (!response.ok) throw new Error(`OpenAI: ${response.status}`);
  const data = await response.json();
  const url = data.data?.[0]?.url || data.data?.[0]?.b64_json;
  if (!url) throw new Error("No image from OpenAI");
  return url;
}
