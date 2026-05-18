// /api/replicate/status - 查询 Replicate 预测状态
// 客户端轮询调用，<1s 返回

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Replicate not configured" }, { status: 503 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Prediction ID required" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${token}` },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Replicate API error: ${response.status}` }, { status: 502 });
    }

    const result = await response.json();
    return NextResponse.json({
      status: result.status,
      output: result.output?.[0] || null,
      error: result.error || null,
    });
  } catch (e: any) {
    console.error("Replicate status exception:", e);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
