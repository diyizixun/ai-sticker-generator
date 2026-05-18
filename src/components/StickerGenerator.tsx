"use client";

import { useState, useEffect } from "react";
import { ImageIcon, Sparkles, ChevronDown, Wand2 } from "lucide-react";
import { STYLES, PRICING } from "@/lib/config";
import { clsx } from "clsx";

type Mode = "text" | "image";

const BLOCKED_WORDS = ["nude", "nsfw", "porn", "violent", "gore", "hate"];

interface StickerGeneratorProps {
  initialPrompt?: string;
}

export default function StickerGenerator({ initialPrompt }: StickerGeneratorProps) {
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [selectedStyle, setSelectedStyle] = useState("cute");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  const isBlocked = () => {
    const lower = prompt.toLowerCase();
    return BLOCKED_WORDS.some((w) => lower.includes(w));
  };

  // 生成链接 - 纯URL跳转，不依赖任何JS API调用
  const generateUrl = `/result?p=${encodeURIComponent(prompt.trim())}&s=${selectedStyle}`;
  const canGenerate = prompt.trim().length > 0 && prompt.length <= 500 && !isBlocked();

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Mode Toggle */}
        <div className="flex border-b border-gray-100">
          <button
            type="button"
            onClick={() => setMode("text")}
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
            onClick={() => setMode("image")}
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
              onClick={() => document.getElementById("file-input")?.click()}
            >
              {uploadPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={uploadPreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg" />
                  <p className="text-sm text-gray-500">Click to change</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                  <p className="text-sm text-gray-500">Click to upload</p>
                </div>
              )}
              <input
                id="file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const r = new FileReader();
                    r.onload = (ev) => setUploadPreview(ev.target?.result as string);
                    r.readAsDataURL(f);
                  }
                }}
              />
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

          {/* Generate - 用<a>标签代替<button>，纯链接跳转，零JS依赖 */}
          {canGenerate ? (
            <a
              href={generateUrl}
              className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-200 hover:shadow-purple-300"
            >
              <Wand2 className="w-5 h-5" /> Generate Sticker
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 bg-gray-300 cursor-not-allowed"
            >
              <Wand2 className="w-5 h-5" /> Generate Sticker
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-gray-400">
        Free unlimited generation •{" "}
        <a href="/#pricing" className="text-purple-600 hover:underline">
          Upgrade to Pro
        </a>{" "}
        for transparent PNG &amp; HD quality
      </div>
    </div>
  );
}
