import { NextResponse } from "next/server";
import { readdirSync } from "fs";
import path from "path";

// 获取所有博客文章列表
export async function GET() {
  try {
    const blogDir = path.join(process.cwd(), "src/app/blog");
    const dirs = readdirSync(blogDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const posts = dirs.map((slug) => {
      // 从 slug 提取中文标题（简单实现）
      // 例如：ai-sticker-ideas → AI Sticker Ideas
      const title = slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).replace(/-(.)/g, (m) => " " + m[1].toUpperCase()))
        .join(" ");
      return {
        slug,
        title,
      };
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error listing blog posts:", error);
    return NextResponse.json({ error: "Failed to list posts" }, { status: 500 });
  }
}
