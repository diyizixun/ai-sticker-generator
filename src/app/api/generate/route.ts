import { NextRequest, NextResponse } from "next/server";
import { checkAndIncrementQuota, FREE_DAILY_LIMIT } from "@/lib/quota";

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY!;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const prompt = body.prompt as string | undefined;

  if (!prompt) {
    return NextResponse.json({ error: "请输入描述" }, { status: 400 });
  }

  // Identify user (session email or visitor cookie)
  const sessionEmail = req.cookies.get("session")?.value;
  const visitorId = req.cookies.get("visitor_id")?.value;
  
  let quotaKey: string;
  if (sessionEmail) {
    quotaKey = `user:${sessionEmail}`;
  } else if (visitorId) {
    quotaKey = `visitor:${visitorId}`;
  } else {
    // Fallback: generate and set visitor_id
    const newId = crypto.randomUUID();
    quotaKey = `visitor:${newId}`;
  }

  // Check quota
  const { allowed, remaining } = checkAndIncrementQuota(quotaKey);
  if (!allowed) {
    return NextResponse.json({
      error: `今日免费次数已用完（${FREE_DAILY_LIMIT}次/天），明天再来吧！`,
    }, { status: 429 });
  }

  try {
    // Use Pollinations.ai (fastest, has API key)
    const pollRes = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${POLLINATIONS_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai",
        messages: [
          {
            role: "user",
            content: `Create a cute sticker design: ${prompt}. Sticker style, vibrant colors, clean edges, transparent-friendly background, suitable for messaging apps.`,
          },
        ],
        response_format: "url",
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (pollRes.ok) {
      const data = await pollRes.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        data?: Array<{ url?: string }>;
      };
      const imageUrl =
        data.data?.[0]?.url ||
        data.choices?.[0]?.message?.content?.trim() ||
        null;

      if (imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("/"))) {
        const response = NextResponse.json({
          imageUrl,
          remaining,
          provider: "pollinations",
        });

        // Set visitor_id for non-logged-in users
        if (!sessionEmail && !visitorId) {
          const newId = crypto.randomUUID();
          response.cookies.set("visitor_id", newId, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 365 * 24 * 60 * 60,
            path: "/",
          });
        }

        return response;
      }
    }

    // Fallback: direct image generation via Pollinations
    const imgGenUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(`cute sticker design: ${prompt}, sticker art, vibrant, clean edges`)}?width=512&height=512&nologo=true`;
    const imgRes = await fetch(imgGenUrl, { signal: AbortSignal.timeout(15000) });

    if (imgRes.ok) {
      const buffer = await imgRes.arrayBuffer();
      const response = new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=3600",
          "X-Remaining": String(remaining),
        },
      });

      if (!sessionEmail && !visitorId) {
        const newId = crypto.randomUUID();
        response.cookies.set("visitor_id", newId, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 365 * 24 * 60 * 60,
          path: "/",
        });
      }

      return response;
    }

    return NextResponse.json(
      { error: "生成失败，请稍后重试" },
      { status: 500 }
    );
  } catch (e) {
    console.error("generate error:", e);
    return NextResponse.json(
      { error: "生成超时，请重试" },
      { status: 500 }
    );
  }
}
