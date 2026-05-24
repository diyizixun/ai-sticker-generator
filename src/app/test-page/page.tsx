import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Sticker Generator - Test Page",
  description: "Testing deployment",
};

// 强制动态渲染避免缓存问题
export const dynamic = "force-dynamic";

export default function TestPage() {
  return (
    <div style={{ padding: "50px", fontFamily: "system-ui" }}>
      <h1>✅ Deployment Test Page</h1>
      <p>If you see this, the basic Next.js setup is working.</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
}
