import { NextResponse } from "next/server";
import { STYLES } from "@/lib/config";

const CELEB_TRAITS: [string, string][] = [
  ["马斯克", "elon musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s, stocky build"],
  ["特斯拉", "elon musk lookalike"],
];

function enhancePrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  for (const [name, traits] of CELEB_TRAITS) {
    if (lower.includes(name)) return traits + ", " + prompt;
  }
  return prompt;
}

export async function GET(req) {
  const u = req.nextUrl;
  const p = u.searchParams.get("prompt") || "";
  const s = u.searchParams.get("style") || "default";
  const stylePrompt = STYLES[s]?.prompt || "sticker design";
  const enhanced = enhancePrompt(p);
  const fullPrompt = enhanced + ", " + stylePrompt + ", sticker, white outline, die-cut sticker shape, transparent or clean background, vibrant colors, high quality, detailed";
  return NextResponse.json({
    input: p,
    style: s,
    stylePrompt,
    matched: p.toLowerCase().includes("马斯克") ? "马斯克" : null,
    enhanced,
    fullPrompt,
  });
}
