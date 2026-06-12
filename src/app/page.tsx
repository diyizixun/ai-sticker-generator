"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LoginButton } from "@/components/LoginButton";

const STYLES = [
  { id: "cute", label: "可爱卡通风" },
  { id: "meme", label: "搞笑梗图风" },
  { id: "kawaii", label: "日系可爱风" },
  { id: "chinese", label: "国风手绘风" },
  { id: "emoji", label: "Emoji 表情风" },
  { id: "anime", label: "动漫二次元风" },
];

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cute");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(5);
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaLimit] = useState(5);
  const [session, setSession] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);

  const fetchQuota = useCallback(async () => {
    const res = await fetch("/api/quota");
    const d = await res.json();
    setQuotaUsed(d.used);
    setRemaining(d.remaining);
  }, []);

  useEffect(() => {
    fetchQuota();
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(d => setSession(d.email));
  }, [fetchQuota]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("请输入贴纸描述哦～");
      return;
    }
    setLoading(true);
    setError("");
    setImageUrl(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `${prompt} [style: ${style}]` }),
      });

      if (res.status === 429) {
        const d = await res.json();
        setError(d.error || "今日次数已用完");
        setLoading(false);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("image")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        setRemaining(Number(res.headers.get("X-Remaining") || 0));
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        const d = await res.json();
        if (d.imageUrl) {
          setImageUrl(d.imageUrl);
          setRemaining(d.remaining ?? remaining - 1);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        } else {
          setError(d.error || "生成失败，请重试");
        }
      }
    } catch {
      setError("生成超时，请稍后重试");
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `sticker-${Date.now()}.jpg`;
    a.click();
  };

  const progressPercent = Math.min(100, ((quotaLimit - remaining) / quotaLimit) * 100);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            AI Sticker
          </h1>
        </div>
        <LoginButton />
      </nav>

      {/* Main */}
      <div className="max-w-2xl mx-auto px-6 pb-20">
        {/* Input */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 animate-fade-in">
          <div className="flex gap-2 mb-4">
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="描述你想要的贴纸... 比如：一只戴墨镜的柴犬"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={e => e.key === "Enter" && !loading && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? "生成中..." : "生成 ✨"}
            </button>
          </div>

          {/* Style selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition ${
                  style === s.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Quota bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-red-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              免费 {remaining}/{quotaLimit} 次
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">AI 正在画贴纸，请稍候...</p>
          </div>
        )}

        {/* Result */}
        {imageUrl && !loading && (
          <div className="bg-white rounded-2xl shadow-lg p-6 animate-slide-up">
            <div className="relative">
              {/* Confetti */}
              {showConfetti && (
                <div ref={confettiRef} className="absolute inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full animate-pulse"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        background: ["#6366f1", "#ec4899", "#f59e0b", "#10b981"][i % 4],
                        animationDelay: `${Math.random() * 0.5}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              <img
                src={imageUrl}
                alt="Generated sticker"
                className="w-full rounded-xl"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
              >
                ⬇ 下载贴纸
              </button>
              <button
                onClick={() => { setImageUrl(null); setPrompt(""); }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                ✨ 再画一张
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 mt-12">
          AI Sticker &mdash; 免费 AI 贴纸生成器
        </footer>
      </div>
    </main>
  );
}
