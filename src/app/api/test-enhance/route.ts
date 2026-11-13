import { NextResponse } from "next/server";

export async function GET(req) {
  const p = req.nextUrl.searchParams.get("prompt") || "";
  const lower = p.toLowerCase();
  const TRAITS = [
    ["马斯克", "elon musk lookalike: balding man, square jaw, blue eyes, fair skin, mid-50s"],
    ["elon musk", "elon musk lookalike: balding man, square jaw, blue eyes"],
    ["musk", "elon musk lookalike: balding man, square jaw"],
    ["trump", "trump lookalike: blonde comb-over, orange skin"],
  ];
  for (const [name, t] of TRAITS) {
    if (lower.includes(name)) {
      return NextResponse.json({ matched: name, enhanced: t + ", " + p });
    }
  }
  return NextResponse.json({ matched: null, enhanced: p });
}
