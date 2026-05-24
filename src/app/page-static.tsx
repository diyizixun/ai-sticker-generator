import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Sticker Generator - Create Custom Stickers with AI",
  description: "Generate unique, print-ready transparent PNG stickers from text. Perfect for Discord, WhatsApp, Telegram & print-on-demand.",
};

// 完全静态的首页 - 不导入任何可能失败的模块
export default function Page() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>🎨 AI Sticker Generator</h1>
        <button style={{ padding: "8px 16px", backgroundColor: "#0070f3", color: "white", border: "none", borderRadius: "4px" }}>
          Sign In
        </button>
      </header>
      
      <main style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2 style={{ fontSize: "48px", marginBottom: "20px" }}>Create Amazing Stickers with AI</h2>
        <p style={{ fontSize: "20px", color: "#666", marginBottom: "40px" }}>
          Generate unique, print-ready transparent PNG stickers in seconds
        </p>
        
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "40px" }}>
          <input 
            type="text" 
            placeholder="Describe your sticker..." 
            style={{ padding: "12px 20px", fontSize: "16px", width: "400px", border: "1px solid #ccc", borderRadius: "8px" }}
          />
          <button style={{ padding: "12px 30px", fontSize: "16px", backgroundColor: "#0070f3", color: "white", border: "none", borderRadius: "8px" }}>
            Generate
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginTop: "60px" }}>
          {["Fast Generation", "Transparent PNG", "Commercial License"].map((feature) => (
            <div key={feature} style={{ padding: "20px", border: "1px solid #eaeaea", borderRadius: "8px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "10px" }}>{feature}</h3>
              <p style={{ color: "#666" }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
