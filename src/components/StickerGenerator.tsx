"use client";

import { useState, useEffect, useRef } from "react";
import { ImageIcon, Sparkles, ChevronDown, Wand2, Loader2 } from "lucide-react";
import { STYLES } from "@/lib/config";
import { clsx } from "clsx";
import { getLocalQuota, incrementLocalQuota } from "@/lib/clientQuota";
import { useSession } from "@/hooks/useSession";

type Mode = "text" | "image";

const BLOCKED_WORDS = ["nude", "nsfw", "porn", "violent", "gore", "hate"];

interface StickerGeneratorProps {
  initialPrompt?: string;
}

/** 仅在浏览器端初始化 visitor_id cookie */
function useVisitorId(): void {
  useEffect(() => {
    const match = document.cookie.match(/visitor_id=([^;]+)/);
    if (match) return;
    const id =
      crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
    document.cookie = `visitor_id=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, []);
}

export default function StickerGenerator({ initialPrompt }: StickerGeneratorProps) {
  useVisitorId();
  const { session, status } = useSession();
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [selectedStyle, setSelectedStyle] = useState("cute");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  // 获取当日配额：登录用户走 API（DB），匿名用户走 localStorage
  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated" && session?.email) {
      // 登录用户：从 DB 读真实 quota
      fetch("/api/quota", { credentials: "include" })
        .then((r) => r.json())
        .then((d: { remaining: number; limit: number }) => setQuota(d))
        .catch(() => {});
    } else {
      // 匿名用户：从 localStorage 读（持久，跨请求不丢）
      setQuota(getLocalQuota());
    }
  }, [status, session]);

  const isBlocked = () => {
    const lower = prompt.toLowerCase();
    return BLOCKED_WORDS.some((w) => lower.includes(w));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setUploadedFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleGenerate = async () => {
    if (mode === "text") {
      // 匿名用户：跳转前先在 localStorage 扣一次 quota，让返回时显示正确
      if (status !== "authenticated") {
        const newQuota = incrementLocalQuota();
        setQuota(newQuota);
      }
      window.location.href = `/result?p=${encodeURIComponent(prompt.trim())}&s=${selectedStyle}`;
      return;
    }

    if (!uploadedFile) return;

    setIsGenerating(true);
    setResultUrl(null);

    try {
      const formData = new FormData();
      formData.append("image", uploadedFile);
      formData.append("style", selectedStyle);
      formData.append("prompt", prompt);

      const response = await fetch("/api/image-to-sticker", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        setResultUrl(data.imageUrl);
      } else {
        alert(data.error || "Generation failed. Please try again.");
      }
    } catch (e) {
      console.error("Generation error:", e);
      alert("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate =
    prompt.trim().length > 0 &&
    prompt.length <= 500 &&
    !isBlocked() &&
    (mode === "text" || uploadedFile !== null);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Mode Toggle */}
        <div className="flex border-b border-gray-100">
          <button
            type="button"
            onClick={() => {
              setMode("text");
              setResultUrl(null);
            }}
            className={clsx(
              "flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
              mode === "text"
                ? "bg-purple-50 text-purple-700 border-b-2 border-purple-600"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <Sparkles className="w-4 h-4" /> Text to Sticker
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("image");
              setResultUrl(null);
            }}
            className={clsx(
              "flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
              mode === "image"
                ? "bg-purple-50 text-purple-700 border-b-2 border-purple-600"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <ImageIcon className="w-4 h-4" /> Image to Sticker
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Image Upload */}
          {mode === "image" && (
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-purple-300 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={uploadPreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg" />
                  <p className="text-sm text-gray-500">Click to change</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                  <p className="text-sm text-gray-500">Click to upload image</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Result Preview for Image Mode */}
          {mode === "image" && resultUrl && (
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <img src={resultUrl} alt="Generated sticker" className="max-w-[300px] max-h-[300px] mx-auto rounded-lg" />
              <a
                href={resultUrl}
                download="sticker.png"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 bg-purple-600 text-white font-medium px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Wand2 className="w-4 h-4" /> Download Sticker
              </a>
            </div>
          )}

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {mode === "text" ? "Describe your sticker" : "Describe how to transform it"}
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === "text"
                    ? "e.g. A happy cat wearing a space helmet floating among stars"
                    : "e.g. Turn this into a cute cartoon sticker"
                }
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400"
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400">{prompt.length}/500</span>
            </div>
          </div>

          {/* Style Selector */}
          <div>
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3"
              onClick={() => document.getElementById("style-grid")?.classList.toggle("hidden")}
            >
              Choose Style <ChevronDown className="w-4 h-4" />
            </button>
            <div id="style-grid" className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {STYLES.map((style) => (
                <button
                  type="button"
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={clsx(
                    "flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium transition-all",
                    selectedStyle === style.id
                      ? "bg-purple-100 text-purple-700 ring-2 ring-purple-500"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <span className="text-lg">{style.emoji}</span>
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating || (quota !== null && quota.remaining <= 0)}
              className={clsx(
                "w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all",
                canGenerate && !isGenerating && (quota === null || quota.remaining > 0)
                  ? "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-200 hover:shadow-purple-300"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              {quota !== null && quota.remaining <= 0 ? (
                "Today's free quota used up — come back tomorrow!"
              ) : isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" /> Generate Sticker
                </>
              )}
            </button>

            {quota !== null && (
              <p className={clsx("text-xs text-center", quota.remaining <= 0 ? "text-amber-600 font-medium" : "text-gray-400")}>
                {quota.remaining <= 0
                  ? `Daily limit reached (${quota.limit}/${quota.limit})`
                  : `${quota.remaining} of ${quota.limit} free generations left today`}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-gray-400">
        Free users: {quota?.limit || 5} generations/day •{" "}
        <a href="/pricing" className="text-purple-600 hover:underline">Upgrade to Pro</a>{" "}
        for unlimited &amp; HD quality
      </div>
    </div>
  );
}
