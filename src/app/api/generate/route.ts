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
// ⚠️ 关键：中文关键词（马斯克/特朗普/拜登/马云...）放最前面，
// 因为大量用户用中文搜名人，而 Pollinations 模型只懂英文五官描述
// 格式: [匹配关键词（小写，中英文）, 面部特征描述（英文，放最前面权重最高）]
const CELEB_TRAITS: [string, string][] = [
  // === 必须优先匹配的中文关键词 ===
  ["马斯克", "elon musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s, stocky build"],
  ["特斯拉", "elon musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s"],
  ["特朗普", "trump lookalike: blonde comb-over hairstyle, orange-tinted skin, blue eyes, broad face, pursed lips, heavyset build, late 70s man"],
  ["川普", "trump lookalike: blonde comb-over hairstyle, orange-tinted skin, blue eyes, broad face, pursed lips, late 70s"],
  ["拜登", "biden lookalike: white thinning hair, blue eyes, fair skin, wrinkled face, elderly man"],
  ["奥巴马", "obama lookalike: short cropped black hair, dark brown skin, brown eyes, slim face, middle-aged Black man"],
  ["普京", "putin lookalike: balding blonde hair, blue eyes, pale skin, stern expression, compact build, late 60s"],
  ["马克龙", "macron lookalike: short dark hair, blue eyes, fair skin, slim face, middle-aged French man"],
  ["泽连斯基", "zelensky lookalike: short brown hair, brown eyes, fair skin, stubble beard, middle-aged man"],
  ["马云", "jack ma lookalike: balding man, small stature, round face, dark eyes, East Asian, glasses, distinctive smile"],
  ["马化腾", "Chinese middle-aged man, short black hair, round face, glasses, East Asian"],
  ["雷军", "middle-aged Chinese man, short black hair, round face, glasses, energetic smile"],
  ["刘强东", "middle-aged Chinese man, short black hair, square face, glasses, East Asian"],
  ["张一鸣", "young Chinese man, short black hair, glasses, slim face, neutral expression"],
  ["任正非", "elderly Chinese man, balding gray hair, square glasses, weathered face, severe expression"],
  ["张艺谋", "elderly Chinese man, gray hair, glasses, weathered face, East Asian"],
  ["梅西", "messi lookalike: short brown hair, brown eyes, fair skin, short beard, compact build, Argentine man"],
  ["c罗", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build, Portuguese man"],
  ["贝克汉姆", "beckham lookalike: short blonde hair, blue eyes, fair skin, handsome face, tattoos, slim build"],
  ["詹姆斯", "lebron lookalike: short black hair, dark brown skin, brown eyes, tall muscular build, beard, Black man"],
  ["乔丹", "jordan lookalike: bald head, dark brown skin, brown eyes, tall athletic build, Black man"],
  ["泰勒斯威夫特", "taylor swift lookalike: long blonde straight hair, blue eyes, fair skin, red lips, slim face, young woman"],
  ["霉霉", "taylor swift lookalike: long blonde straight hair, blue eyes, fair skin, red lips, slim face, young woman"],
  ["碧昂斯", "beyonce lookalike: long blonde wavy hair, light brown skin, brown eyes, curvy build, glamorous woman"],
  ["蕾哈娜", "rihanna lookalike: short dark hair, brown skin, green eyes, full lips, Barbadian woman"],
  ["金卡戴珊", "kim kardashian lookalike: long dark hair, olive skin, brown eyes, full lips, curvy figure"],
  ["艾玛沃森", "emma watson lookalike: short brown hair, brown eyes, fair skin, slim face, British young woman"],
  ["斯嘉丽约翰逊", "scarlett johansson lookalike: short blonde hair, blue eyes, fair skin, full lips, curvy figure"],
  ["安吉丽娜朱莉", "angelina jolie lookalike: long dark hair, blue eyes, fair skin, full lips, distinctive cheekbones"],

  // === 英文关键词 ===
  // 科技圈
  ["elon musk", "elon musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s, stocky build"],
  ["musk", "elon musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s"],
  ["mark zuckerberg", "zuckerberg lookalike: short curly brown hair, pale skin, blue eyes, narrow face, thin lips, young man"],
  ["zuckerberg", "zuckerberg lookalike: short curly brown hair, pale skin, blue eyes, narrow face, thin lips"],
  ["steve jobs", "steve jobs lookalike: bald head, gray stubble beard, round glasses, gaunt face, fair skin, middle-aged"],
  ["tim cook", "tim cook lookalike: short gray hair, clean shaven, fair skin, blue eyes, slim face, middle-aged"],
  ["bill gates", "bill gates lookalike: balding with glasses, fair skin, blue eyes, round face, middle-aged"],
  ["jack ma", "jack ma lookalike: balding man, small stature, round face, dark eyes, East Asian, glasses"],
  ["ren zhengfei", "elderly Chinese man, balding gray hair, square glasses, weathered face, severe expression"],
  ["zhang yiming", "young Chinese man, short black hair, glasses, slim face, neutral expression"],
  ["lei jun", "middle-aged Chinese man, short black hair, round face, glasses, energetic smile"],
  // 政治圈
  ["donald trump", "trump lookalike: blonde comb-over hairstyle, orange-tinted skin, blue eyes, broad face, pursed lips, heavyset build, late 70s man"],
  ["trump", "trump lookalike: blonde comb-over hair, orange skin, blue eyes, broad face, pursed lips, late 70s"],
  ["joe biden", "biden lookalike: white thinning hair, blue eyes, fair skin, wrinkled face, elderly man"],
  ["biden", "biden lookalike: white thinning hair, blue eyes, fair skin, wrinkled elderly face"],
  ["barack obama", "obama lookalike: short cropped black hair, dark brown skin, brown eyes, slim face, warm smile, middle-aged Black man"],
  ["obama", "obama lookalike: short cropped black hair, dark brown skin, brown eyes, slim face"],
  ["vladimir putin", "putin lookalike: balding blonde hair, blue eyes, pale skin, stern expression, compact build, late 60s"],
  ["putin", "putin lookalike: balding blonde hair, blue eyes, pale skin, stern expression, late 60s"],
  ["xi jinping", "Chinese man, short black hair, broad face, dark eyes, portly build, stern expression, middle-aged"],
  ["jinping", "Chinese man, short black hair, broad face, dark eyes, portly build"],
  ["kim jong un", "kim jong un lookalike: short black buzzcut, round flat face, dark eyes, overweight, East Asian"],
  ["kim jong", "kim jong un lookalike: short black buzzcut, round face, dark eyes, overweight"],
  ["narendra modi", "modi lookalike: white hair, gray beard, dark skin, Indian man, elderly"],
  ["modi", "modi lookalike: white hair, gray beard, dark skin, Indian man, elderly"],
  ["emmanuel macron", "macron lookalike: short dark hair, blue eyes, fair skin, slim face, middle-aged French"],
  ["macron", "macron lookalike: short dark hair, blue eyes, fair skin, slim face, middle-aged"],
  ["zelensky", "zelensky lookalike: short brown hair, brown eyes, fair skin, stubble beard, middle-aged"],
  ["zelenskyy", "zelensky lookalike: short brown hair, brown eyes, fair skin, stubble beard"],
  // 娱乐/体育
  ["kanye west", "kanye west lookalike: bald head, brown skin, brown eyes, full beard, stocky build"],
  ["kanye", "kanye west lookalike: bald head, brown skin, brown eyes, full beard"],
  ["tom cruise", "tom cruise lookalike: short brown hair, blue eyes, fair skin, square jaw, middle-aged man"],
  ["brad pitt", "brad pitt lookalike: long blonde hair, blue eyes, fair skin, strong jaw, goatee"],
  ["leonardo dicaprio", "dicaprio lookalike: slicked back blonde hair, blue eyes, fair skin, round face, goatee"],
  ["leo dicaprio", "dicaprio lookalike: slicked back blonde hair, blue eyes, fair skin, round face"],
  ["michael jordan", "jordan lookalike: bald head, dark brown skin, brown eyes, tall athletic build, Black man"],
  ["lebron james", "lebron lookalike: short black hair, dark brown skin, brown eyes, tall muscular build, beard, Black"],
  ["messi", "messi lookalike: short brown hair, brown eyes, fair skin, short beard, compact build, Argentine"],
  ["lionel messi", "messi lookalike: short brown hair, brown eyes, fair skin, short beard"],
  ["cristiano ronaldo", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build, Portuguese"],
  ["ronaldo", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build"],
  ["cr7", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build"],
  ["david beckham", "beckham lookalike: short blonde hair, blue eyes, fair skin, handsome face, tattoos"],
  ["tiger woods", "tiger woods lookalike: short black hair, brown skin, brown eyes, goatee, athletic build"],
  ["snoop dogg", "snoop dogg lookalike: tall slim build, long braided black hair, dark brown skin, goatee, sunglasses"],
  ["eminem", "eminem lookalike: short bleached blonde hair, blue eyes, fair skin, slim face, Caucasian"],
  ["drake", "drake lookalike: short black hair, dark beard, brown skin, brown eyes, stocky build, Black"],
  // 女性名人
  ["taylor swift", "taylor swift lookalike: long blonde straight hair, blue eyes, fair skin, red lips, slim face, young woman"],
  ["beyonce", "beyonce lookalike: long blonde wavy hair, light brown skin, brown eyes, curvy build, glamorous woman"],
  ["lady gaga", "lady gaga lookalike: long blonde hair, blue eyes, fair skin, bold makeup, theatrical expression"],
  ["rihanna", "rihanna lookalike: short dark hair, brown skin, green eyes, full lips, Barbadian woman"],
  ["adele", "adele lookalike: long red-blonde hair, blue eyes, fair skin, round face, fuller figure, British"],
  ["miley cyrus", "miley cyrus lookalike: short blonde hair, blue eyes, fair skin, slim face, young woman"],
  ["katy perry", "katy perry lookalike: long dark hair, blue eyes, fair skin, full lips, young woman"],
  ["shakira", "shakira lookalike: long blonde wavy hair, brown eyes, fair skin, Colombian woman, slim build"],
  ["kim kardashian", "kim kardashian lookalike: long dark hair, olive skin, brown eyes, full lips, curvy figure, glamorous"],
  ["kylie jenner", "kylie jenner lookalike: long dark hair, olive skin, full lips, young woman, glamorous makeup"],
  ["emma watson", "emma watson lookalike: short brown hair, brown eyes, fair skin, slim face, British young woman"],
  ["scarlett johansson", "scarlett johansson lookalike: short blonde hair, blue eyes, fair skin, full lips, curvy figure"],
  ["angelina jolie", "angelina jolie lookalike: long dark hair, blue eyes, fair skin, full lips, distinctive cheekbones"],
  ["megan fox", "megan fox lookalike: long dark hair, blue eyes, fair skin, full lips, distinctive eyebrows"],
  ["marilyn monroe", "marilyn monroe lookalike: short blonde curly hair, blue eyes, fair skin, beauty mark, red lips, 1950s"],
  ["audrey hepburn", "audrey hepburn lookalike: short dark hair, brown eyes, fair skin, slim face, elegant 1950s"],
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

  // 1) 名人面部特征增强 — 找到匹配的名人，**完全替换**用户 prompt 为详细五官描述
  //    不能追加，否则中文/英文名字 + 描述混搭会让模型困惑，生成非目标面孔
  for (const [name, traits] of CELEB_TRAITS) {
    if (lower.includes(name)) {
      return traits + ", " + prompt;
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

// ⚠️ Pollinations 2026-11 起强制加 "pollinations.ai" 水印在右下角
// nologo=true 参数已失效。水印在后端不裁，前端 canvas 裁（见 Gallery 组件）
// ⚠️ Pollinations 严重 prompt hash 缓存：不管 model/host/endpoint，只认 prompt 字符串
// 之前有人用"马斯克贴纸"得到粉发亚洲女人，现在每次请求都返回那个缓存
// 解法：给每个 Pollinations 请求加随机 prompt 后缀打破缓存
function makePollinationsPrompt(basePrompt: string): string {
  // 每次生成随机 4-6 字母短词，让 Pollinations 认为是新 prompt
  const words = ["studio photo", "high detail", "professional", "vibrant", "crisp", "sharp focus", "artistic", "cinematic"];
  const pick1 = words[Math.floor(Math.random() * words.length)];
  const pick2 = words[Math.floor(Math.random() * words.length)];
  const suffix = `, ${pick1}, ${pick2}, seed-${Math.floor(Math.random() * 1000000)}`;
  return basePrompt + suffix;
}

async function generateWithPollinations(prompt: string, deadline?: number): Promise<string> {
  // 加随机后缀打破 Pollinations 的 prompt hash 缓存
  const realPrompt = makePollinationsPrompt(prompt);
  const encoded = encodeURIComponent(realPrompt);
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
    seedream: 20,
    dreamshaper: 20,
    flux: 18,
    default: 15,
  };
  const R2 = longBudget ? 3 : 2;
  // enhance=true + 1024² 对所有模型启用
  // Pollinations enhance 参数会对 prompt 自动做语义补全 → 显著提升人物一致性和质量
  const ENH_QS = `&enhance=true`;
  const SIZE_A = `width=1024&height=1024`;
  const SIZE_B = `width=768&height=768`;
  const attempts = [
    { id: "openai",            qs: `model=openai`,            extra: ENH_QS, size: SIZE_A, timeoutMs: 9000, retries: R2 },
    { id: "turbo",             qs: `model=turbo`,             extra: ENH_QS, size: SIZE_A, timeoutMs: 8500, retries: R2 },
    { id: "dalle3",            qs: `model=dalle3`,            extra: ENH_QS, size: SIZE_A, timeoutMs: 8500, retries: R2 },
    { id: "sana",              qs: `model=sana`,              extra: ENH_QS, size: SIZE_B, timeoutMs: 8000, retries: longBudget ? 2 : 1 },
    { id: "seedream",          qs: `model=seedream`,          extra: ENH_QS, size: SIZE_A, timeoutMs: 8000, retries: longBudget ? 2 : 1 },
    { id: "dreamshaper",       qs: `model=dreamshaper`,       extra: ENH_QS, size: SIZE_B, timeoutMs: 8000, retries: longBudget ? 2 : 1 },
    { id: "flux",              qs: `model=flux`,              extra: ENH_QS, size: SIZE_A, timeoutMs: longBudget ? 8000 : 6000, retries: longBudget ? 2 : 1 },
    { id: "default",           qs: ``,                        extra: ENH_QS, size: SIZE_B, timeoutMs: longBudget ? 6500 : 4500, retries: longBudget ? 2 : 1 },
  ];

  // 双 endpoint 轮询（image.pollinations.ai 429 时换到 gen.pollinations.ai）
  const hosts = ["https://image.pollinations.ai", "https://gen.pollinations.ai"];
  let hostIdx = 0;

  for (let i = 0; i < attempts.length; i++) {
    if (Date.now() >= overallDeadline) break;
    const model = attempts[i];
    for (let retry = 0; retry < model.retries; retry++) {
      if (Date.now() >= overallDeadline) break;
      const trySeed = seed + i * 1013904223 + retry * 2654435761;
      // 每次重试换一个 host，429 命中同一个 IP 限流会分散
      const host = hosts[(hostIdx++) % hosts.length];
      const url =
        `${host}/prompt/${encoded}?${model.size}&seed=${trySeed}&nologo=true` +
        (model.qs ? `&${model.qs}` : "") + (model.extra || "");
      console.log(`[Pollinations] #${i+1} ${model.id} retry=${retry} ${host.replace("https://","")}`);
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
        // Pollinations 2026-11 新限速: 402 FREE_LIMIT — 按 transient 处理
        const transientFail =
          status === 402 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
        if (transientFail && retry === 0 && model.retries > 1) continue;
        if (!response.ok) break;
        const buffer = Buffer.from(await response.arrayBuffer());
        const sniff = sniffImage(buffer);
        if (!sniff.ok) {
          // 402/限速时 Pollinations 返回 JSON（不是图片），所以 sniff 会失败
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
          else if (buffer.length < 6000) break;
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
  // 同样加随机后缀打破缓存
  const realPrompt = makePollinationsPrompt(prompt);
  const encoded = encodeURIComponent(realPrompt);
  const MIN_KB_FALLBACK = 8;
  // 主链不同模型顺序 + 不同尺寸 + 双 host 轮换，再试一轮
  const fbHosts = ["https://gen.pollinations.ai", "https://image.pollinations.ai"];
  let fbH = 0;
  const fallbackAttempts = [
    { qs: `model=seedream`,      width: 1024, height: 1024 }, // 新模型首试
    { qs: `model=flux`,          width: 1024, height: 1024 },
    { qs: `model=sana`,          width: 1024, height: 1024 },
    { qs: `model=dreamshaper`,   width: 768,  height: 768  },
    { qs: `model=dalle3`,        width: 768,  height: 768  },
    { qs: `model=turbo`,         width: 512,  height: 512  },
    { qs: `model=openai`,        width: 512,  height: 512  },
    { qs: ``,                    width: 768,  height: 768  },
  ];
  const errors: string[] = [];
  for (const att of fallbackAttempts) {
    try {
      const seed = Math.floor(Math.random() * 1000000);
      const host = fbHosts[(fbH++) % fbHosts.length];
      const url =
        `${host}/prompt/${encoded}?width=${att.width}&height=${att.height}&seed=${seed}&nologo=true&enhance=true` +
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

  // ⚠️ 关键：名人特征 + 用户原始 prompt 必须放最前面（权重最高）
  // stylePrompt 放中间，通用 sticker 描述放最后
  // Pollinations/FLUX 系列模型对 prompt 顺序非常敏感：最前面的描述主导生成
  const userPromptEnhanced = enhancePrompt(userPrompt);
  const fullPrompt = `${userPromptEnhanced}, ${stylePrompt}, sticker, white outline, die-cut sticker shape, transparent or clean background, vibrant colors, high quality, detailed`;
  console.log("[PROMPT] user=", JSON.stringify(userPrompt), "→ enhanced=", JSON.stringify(userPromptEnhanced), "→ full=", JSON.stringify(fullPrompt));

  // 依次尝试各生成接口（优先无水印的付费 API，最后才 Pollinations 水印兜底）
  const funcDeadline = Date.now() + 59000;
  let result: string | null = null;
  let source = "";
  const errors: string[] = [];

  const hasBing = !!process.env.BING_COOKIE;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasRep = !!process.env.REPLICATE_API_TOKEN;
  const hasGemini = !!process.env.GOOGLE_API_KEY || !!process.env.GEMINI_API_KEY;

  // ⚠️ Pollinations 2026-11 起强制加水印 + 限速 1 张/45s/IP — 降级到最后兜底！
  // 如果用户配了任何付费 API，优先用无水印的
  // 预算分配：Pollinations 留给最后 15s

  // 1. Bing Image Creator (DALL-E 3) — 无水印、免费无限次（需 _U cookie）
  if (!result && hasBing && Date.now() < funcDeadline - 18000) {
    try {
      result = await generateWithBing(fullPrompt);
      source = "bing-dalle3";
    } catch (e: any) { errors.push("Bing: " + (e?.message || "").slice(0, 160)); }
  }

  // 2. OpenAI DALL-E 3 — 无水印
  if (!result && hasOpenAI && Date.now() < funcDeadline - 12000) {
    try {
      result = await generateWithOpenAI(fullPrompt);
      source = "openai-dalle3";
    } catch (e: any) { errors.push("OpenAI: " + (e?.message || "").slice(0, 120)); }
  }

  // 3. Google Gemini Nano Banana 2 — 无水印
  if (!result && hasGemini && Date.now() < funcDeadline - 18000) {
    try {
      result = await generateWithGemini(fullPrompt);
      source = "gemini";
    } catch (e: any) { errors.push("Gemini: " + (e?.message || "").slice(0, 160)); }
  }

  // 4. Replicate FLUX — 无水印
  if (!result && hasRep && Date.now() < funcDeadline - 32000) {
    try {
      result = await generateWithReplicate(fullPrompt);
      source = "replicate";
    } catch (e: any) { errors.push("Replicate: " + (e?.message || "").slice(0, 120)); }
  }

  // 5. Pollinations fallback2（只有其他 API 全没配时才会走到这里）
  if (!result && Date.now() < funcDeadline - 12000) {
    try {
      result = await generateWithHuggingFace(fullPrompt);
      source = "fallback2";
    } catch (e: any) { errors.push("Fallback2: " + (e?.message || "").slice(0, 120)); }
  }

  // 6. Pollinations 主链（最后兜底）
  if (!result && Date.now() < funcDeadline - 12000) {
    try {
      result = await generateWithPollinations(fullPrompt, funcDeadline - 12000);
      source = "pollinations";
    } catch (e: any) { errors.push("Pollinations: " + (e?.message || "").slice(0, 120)); }
  }

  if (!result) {
    const debug = {
      elapsed_ms: 59000 - Math.round(funcDeadline - Date.now()),
      poll_budget_ms: pollBudgetMs,
      has_any_fallback: hasAnyFallback,
      env: {
        hasHFToken: !!process.env.HUGGINGFACE_API_TOKEN,
        hasOpenAI,
        hasReplicate: hasRep,
        hasBingCookie: hasBing,
        hasGemini,
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
        const userPromptEnhanced = enhancePrompt(prompt);
        const fullPrompt = `${userPromptEnhanced}, ${stylePrompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;
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
    body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", response_format: "b64_json" }),
  });
  if (!response.ok) throw new Error(`OpenAI: ${response.status}`);
  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (b64) return `data:image/png;base64,${b64}`;
  const url = data.data?.[0]?.url;
  if (!url) throw new Error("No image from OpenAI");
  const imgResp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!imgResp.ok) throw new Error(`OpenAI img download: ${imgResp.status}`);
  const b = Buffer.from(await imgResp.arrayBuffer());
  const ext = (b[0] === 0x89) ? "png" : "jpeg";
  return `data:image/${ext};base64,${b.toString("base64")}`;
}

// Bing Image Creator → DALL-E 3 免费、无水印、不限次（但需要 Microsoft 账号 _U cookie）
// 流程参考 bing-create npm package: POST create form → extract id → poll async results
async function generateWithBing(prompt: string): Promise<string> {
  const cookie = process.env.BING_COOKIE;
  if (!cookie) throw new Error("BING_COOKIE not configured");
  const errs: string[] = [];
  const encoded = encodeURIComponent(prompt);
  const HEADERS = {
    "Cookie": `_U=${cookie}`,
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Edg/128.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.bing.com/images/create",
  };
  try {
    // Step 1: POST create job (rt=3 → DALL-E 3)
    const createUrl = `https://www.bing.com/images/create?q=${encoded}&rt=3&FORM=GENCRE`;
    const createResp = await fetch(createUrl, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    const createText = await createResp.text().catch(() => "");
    // Find the request ID — Bing returns id=XXXX in redirect URL or in body
    let id = "";
    const loc = createResp.headers.get("location") || "";
    const idMatch1 = loc.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (idMatch1) id = idMatch1[1];
    if (!id) {
      const idMatch2 = createText.match(/id\s*[:=]\s*["']?([A-Za-z0-9_-]{10,})["']?/i);
      if (idMatch2) id = idMatch2[1];
    }
    // If nothing yet, fall back: use IGNORE429 cookie trick (cookie cvid approach is unreliable, skip to poll)
    // Just search body for any /async/results/<id> pattern
    if (!id) {
      const idMatch3 = createText.match(/\/async\/results\/([A-Za-z0-9_-]+)/i);
      if (idMatch3) id = idMatch3[1];
    }
    if (!id) {
      const s = createText.slice(0, 400).replace(/[\r\n]/g, " ");
      if (/sign.?in|login|suspended|blocked|captcha/i.test(createText)) {
        throw new Error("Bing cookie expired/invalid (login needed)");
      }
      throw new Error(`Bing: no id found after job submit HTTP ${createResp.status}. snippet=${s}`);
    }
    // Step 2: poll up to 15s
    const pollStart = Date.now();
    const pollTimeoutMs = 16000;
    while (Date.now() - pollStart < pollTimeoutMs) {
      const pollUrl = `https://www.bing.com/images/create/async/results/${encodeURIComponent(id)}?q=${encoded}`;
      const pollResp = await fetch(pollUrl, {
        headers: { ...HEADERS, "Accept": "*/*" },
        signal: AbortSignal.timeout(15000),
      });
      const text = await pollResp.text().catch(() => "");
      if (!text) { await new Promise(r => setTimeout(r, 1200)); continue; }
      // If Bing says still waiting / processing
      if (/still working|processing|please wait|not be long/i.test(text) && text.length < 3000) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      // Parse JSON if it's a JSON response, otherwise parse mclass="girr_ir" image URLs in HTML
      let urls: string[] = [];
      try {
        const j = JSON.parse(text);
        if (Array.isArray(j?.value)) urls = j.value.map((v: any) => v?.contentUrl || v?.Url || v?.url || "").filter(Boolean);
        else if (Array.isArray(j?.images)) urls = j.images.map((x: any) => x?.contentUrl || x?.url || "").filter(Boolean);
      } catch {
        // HTML format — extract all m=1 bing image URLs
        const re = /src="([^"]*imgt\.fre\.bing\.net[^"]+)"/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
          let u = m[1].replace(/&amp;/g, "&");
          if (!u.startsWith("http")) u = "https:" + u;
          urls.push(u);
        }
        // also try contentUrl
        const re2 = /contentUrl["']?\s*[:=]\s*["']([^"']+)/gi;
        let m2;
        while ((m2 = re2.exec(text)) !== null) urls.push(m2[1]);
      }
      urls = urls.filter(u => typeof u === "string" && /^(https?:)?\/\//i.test(u));
      if (urls.length === 0) {
        if (/no image|0 results|error|failed/i.test(text) && text.length < 4000) {
          errs.push(`Bing poll rejected: ${text.slice(0, 200)}`);
          break;
        }
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      // Pick first URL, download to base64
      const first = urls[0];
      try {
        const imgResp = await fetch(first, { signal: AbortSignal.timeout(15000), headers: { ...HEADERS, "Accept": "image/*" } });
        if (!imgResp.ok) throw new Error(`Bing img download ${imgResp.status}`);
        const b = Buffer.from(await imgResp.arrayBuffer());
        const sniff = (b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47);
        if (!sniff || b.length < 10000) throw new Error(`Bing bad image ${b.length}B`);
        const ext = b[0] === 0x89 ? "png" : "jpeg";
        return `data:image/${ext};base64,${b.toString("base64")}`;
      } catch (ie: any) {
        // Try second URL if first fails
        if (urls[1]) {
          const imgResp2 = await fetch(urls[1], { signal: AbortSignal.timeout(15000), headers: { ...HEADERS, "Accept": "image/*" } });
          if (imgResp2.ok) {
            const b2 = Buffer.from(await imgResp2.arrayBuffer());
            const ok2 = (b2[0] === 0xff && b2[1] === 0xd8) || (b2[0] === 0x89 && b2[1] === 0x50 && b2[2] === 0x4e && b2[3] === 0x47);
            if (ok2 && b2.length >= 10000) {
              const ext2 = b2[0] === 0x89 ? "png" : "jpeg";
              return `data:image/${ext2};base64,${b2.toString("base64")}`;
            }
          }
        }
        throw ie;
      }
    }
    throw new Error("Bing poll timeout 16s — " + (errs[0] || "no results"));
  } catch (e: any) {
    if (errs.length > 0) throw new Error(e.message + " ; " + errs.join(" ; ").slice(0, 120));
    throw e;
  }
}

// Google Gemini Nano Banana 2 (Google AI Studio API key)
// https://ai.google.dev/api/imgen — model gemini-2.5-flash-image-preview
async function generateWithGemini(prompt: string): Promise<string> {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY not configured");
  // Use googleimagen-3.0-generate-002 (Imagen 3) if available, fall back to Gemini image
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-version": "v1beta" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["image"],
        number_of_images: 1,
        image_size: "1024x1024",
        aspect_ratio: "1:1",
      },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    // If image model not available on this endpoint, try the older Imagen 3 GenerateImages endpoint
    if (resp.status === 404 || /not found|model not support/i.test(errText)) {
      return generateWithGeminiImagenFallback(prompt, key);
    }
    throw new Error(`Gemini: HTTP ${resp.status} ${errText.slice(0, 120)}`);
  }
  const j = await resp.json();
  // Walk candidates[].parts[] for inlineData (image/png;base64) or text
  const parts = (j?.candidates?.[0]?.content?.parts || j?.candidates?.[0]?.parts || []) as any[];
  for (const p of parts) {
    if (p?.inlineData?.mimeType?.startsWith("image/") && p?.inlineData?.data) {
      const mime = p.inlineData.mimeType.split("/")[1] || "png";
      return `data:image/${mime};base64,${p.inlineData.data}`;
    }
  }
  throw new Error("Gemini: no inline image in response. first_part_type=" + (parts[0] ? Object.keys(parts[0]).join(",") : "empty"));
}
async function generateWithGeminiImagenFallback(prompt: string, key: string): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Generate a photorealistic sticker image of the following: " + prompt }] }],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error(`Gemini fallback: HTTP ${resp.status} ${(await resp.text().catch(()=>"")).slice(0,120)}`);
  const j = await resp.json();
  const parts = (j?.candidates?.[0]?.content?.parts || j?.candidates?.[0]?.parts || []) as any[];
  for (const p of parts) {
    if (p?.inlineData?.mimeType?.startsWith("image/") && p?.inlineData?.data) {
      const mime = p.inlineData.mimeType.split("/")[1] || "png";
      return `data:image/${mime};base64,${p.inlineData.data}`;
    }
  }
  throw new Error("Gemini fallback: no image inlineData returned");
}
