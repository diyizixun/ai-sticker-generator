import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Sticker Generator - Create Custom Stickers with AI",
  description: "Generate unique, print-ready transparent PNG stickers from text. Perfect for Discord, WhatsApp, Telegram & print-on-demand.",
};

// 超简化版首页 - 完全避免任何可能失败的导入
export default function Page() {
  return (
    <html lang="en">
      <head>
        <title>AI Sticker Generator</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "50px", textAlign: "center" }}>
        <h1>🎨 AI Sticker Generator</h1>
        <p>Create amazing stickers with AI</p>
        <div style={{ marginTop: "30px" }}>
          <button style={{ padding: "10px 20px", fontSize: "16px" }}>
            Start Creating
          </button>
        </div>
      </body>
    </html>
  );
}
