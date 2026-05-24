import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Sticker Generator - Create Custom Stickers with AI",
  description: "Generate unique, print-ready transparent PNG stickers from text. Perfect for Discord, WhatsApp, Telegram & print-on-demand.",
};

// 临时简化版首页 - 调试500错误
export default function Page() {
  return (
    <div style={{ maxWidth: "800px", margin: "50px auto", padding: "20px", fontFamily: "system-ui" }}>
      <h1>AI Sticker Generator</h1>
      <p>Create custom stickers with AI. This is a simplified version for debugging.</p>
      <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
        <h2>Status: ✅ Site is loading</h2>
        <p>If you see this, the basic Next.js setup works.</p>
        <p>Time: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}
