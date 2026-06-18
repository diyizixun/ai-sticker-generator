"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import { STYLES } from "@/lib/config";
import StickerImage from "@/components/StickerImage";
import LoginModal from "@/components/LoginModal";

interface ResultClientProps {
  userPrompt: string;
  styleId: string;
  styleName: string;
  styleEmoji: string;
  fullPrompt: string;
}

export default function ResultClient({
  userPrompt,
  styleId,
  styleName,
  styleEmoji,
  fullPrompt,
}: ResultClientProps) {
  const { session, status } = useSession();
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then((d) => setQuota(d))
      .catch(() => {});
  }, [regenerateKey]);

  const triggerDownload = () => {
    if (!generatedUrl) return;
    const a = document.createElement("a");
    a.href = generatedUrl;
    a.download = `sticker-${userPrompt.slice(0, 20).replace(/\s+/g, "-")}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownload = () => {
    // 已登录：直接下载
    if (session?.email) {
      triggerDownload();
      return;
    }
    // 未登录：弹出登录框
    setLoginOpen(true);
  };

  const handleLoginSuccess = () => {
    setLoginOpen(false);
    // 登录成功后自动下载
    setTimeout(() => triggerDownload(), 300);
  };

  const handleRegenerate = () => {
    setGeneratedUrl(null);
    setRegenerateKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="font-bold text-lg text-gray-900">AI Sticker Generator</span>
          </a>
          <div className="flex items-center gap-3">
            {status === "authenticated" && session?.email ? (
              <span className="text-sm text-gray-600">
                👋 {session.email}
              </span>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                Sign In
              </button>
            )}
            <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Back</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Prompt Info */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <span>{styleEmoji}</span> {styleName} Style
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">&quot;{userPrompt}&quot;</h1>
        </div>

        {/* Sticker Image */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-center p-8 bg-gray-50 min-h-[400px] relative">
            <StickerImage
              key={regenerateKey}
              userPrompt={userPrompt}
              styleId={styleId}
              fullPrompt={fullPrompt}
              alt={`Sticker: ${userPrompt}`}
              className="max-w-[512px] max-h-[512px] w-full h-auto object-contain rounded-lg shadow-md"
              onImageReady={(url) => setGeneratedUrl(url)}
            />
          </div>
        </div>

        {/* Download area */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Free download */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">Standard Download</p>
                <p className="text-xs text-gray-500">
                  512px · With background · {" "}
                  {session?.email ? "Click to download" : "Sign in to download"}
                </p>
              </div>
              {generatedUrl ? (
                <button
                  onClick={handleDownload}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  {session?.email ? "Free Download" : "Sign In to Download"}
                </button>
              ) : (
                <span className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-gray-50 cursor-wait">
                  Generating...
                </span>
              )}
            </div>
          </div>

          {/* Pro download */}
          <div className="p-5 bg-gradient-to-r from-purple-50 to-violet-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm">Transparent PNG</p>
                  <span className="text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">PRO</span>
                </div>
                <p className="text-xs text-gray-500">Die-cut · Print-ready · Upload to Redbubble, WhatsApp, Discord</p>
              </div>
            </div>
            <a
              href="/pricing"
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15V3M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5" />
              </svg>
              Remove Background &amp; Download PNG
            </a>
          </div>
        </div>

        {/* Tip */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800 text-center">
            💡 <strong>Transparent PNG</strong> is required for uploading to Redbubble, WhatsApp, Discord &amp; all print-on-demand platforms.
            <a href="/pricing" className="text-purple-600 font-medium hover:underline ml-1">Pro $9.9/mo →</a>
          </p>
        </div>

        {/* Regenerate */}
        <div className="space-y-2 mt-6">
          <button
            onClick={handleRegenerate}
            disabled={quota !== null && quota.remaining <= 0}
            className={
              `w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-purple-600 to-violet-600 `
              + `hover:from-purple-700 hover:to-violet-700 flex items-center justify-center gap-2 text-center transition-all `
              + (quota !== null && quota.remaining <= 0 ? "opacity-50 cursor-not-allowed" : "")
            }
          >
            🔄 Regenerate with {styleName} Style
          </button>
          {quota !== null && (
            <p className={quota.remaining <= 0 ? "text-xs text-center text-amber-600 font-medium" : "text-xs text-center text-gray-400"}>
              {quota.remaining <= 0
                ? `Daily limit reached (${quota.limit}/${quota.limit}) — resets at midnight`
                : `${quota.remaining} of ${quota.limit} free generations left today`}
            </p>
          )}
        </div>

        {/* Try other styles */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Try Another Style</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {STYLES.filter((s) => s.id !== styleId).map((s) => (
              <a
                key={s.id}
                href={`/result?p=${encodeURIComponent(userPrompt)}&s=${s.id}`}
                className="flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-700 transition-all"
              >
                <span className="text-lg">{s.emoji}</span>
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* New prompt */}
        <div className="mt-8 text-center">
          <a href="/" className="inline-flex items-center gap-2 bg-purple-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors">
            ✨ Create New Sticker
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs">
          © {new Date().getFullYear()} AI Sticker Generator. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
