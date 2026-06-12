import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Sticker - 免费 AI 贴纸生成器",
  description: "输入描述，AI 免费生成可爱贴纸图！",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
