import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 用一个很小的 jpeg 测试能不能 encode/decode
    const buf = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AVAH/EwDEABQEAoQCFRQCAwMRAAQAEhMRIAQVExBBBSVhcf/aAAgBAgEBPwH5A//9k=",
      "base64"
    );
    const meta = await sharp(buf).metadata();
    const cropped = await sharp(buf)
      .extract({ left: 0, top: 0, width: 10, height: 10 })
      .toBuffer();
    return NextResponse.json({ ok: true, meta, croppedSize: cropped.length });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message, name: e.name, stack: e.stack?.slice(0, 300) },
      { status: 500 }
    );
  }
}
