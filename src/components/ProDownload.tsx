"use client";

import { useState, useCallback } from "react";
import { Download, Lock, Loader2, CheckCircle } from "lucide-react";

interface ProDownloadButtonProps {
  imageUrl: string;
  prompt: string;
}

/**
 * Pro 下载按钮 - 带背景去除
 * 1. 下载原始图片
 * 2. 用 @imgly/background-removal 去除背景
 * 3. 输出透明 PNG 供下载
 */
export default function ProDownloadButton({ imageUrl, prompt }: ProDownloadButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRemoveBackground = useCallback(async () => {
    setStatus("loading");
    setErrorMsg(null);

    try {
      // 1. 下载原始图片
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("Failed to download image");
      const blob = await imgRes.blob();

      // 2. 背景去除
      const { removeBackground } = await import("@imgly/background-removal");
      const resultBlob = await removeBackground(blob, {
        model: "isnet_fp16",
        output: {
          format: "image/png",
          quality: 0.9,
        },
      });

      // 3. 创建下载链接
      const url = URL.createObjectURL(resultBlob);
      setResultUrl(url);
      setStatus("done");
    } catch (e: any) {
      console.error("Background removal failed:", e);
      setErrorMsg(e.message || "Failed to remove background");
      setStatus("error");
    }
  }, [imageUrl]);

  // 下载透明 PNG
  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `sticker-${prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (status === "done" && resultUrl) {
    return (
      <div className="space-y-3">
        {/* 预览透明背景图 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden p-4">
          <div
            className="flex items-center justify-center min-h-[200px] rounded-lg"
            style={{
              backgroundImage: "linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)",
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
            }}
          >
            <img
              src={resultUrl}
              alt="Transparent sticker"
              className="max-w-[300px] max-h-[300px] object-contain"
            />
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <CheckCircle className="w-5 h-5" /> Download Transparent PNG
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <button
        disabled
        className="w-full py-3 rounded-xl font-medium text-purple-600 bg-purple-50 flex items-center justify-center gap-2 cursor-wait"
      >
        <Loader2 className="w-5 h-5 animate-spin" /> Removing background...
      </button>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-red-500 text-center">{errorMsg}</p>
        <button
          onClick={handleRemoveBackground}
          className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 flex items-center justify-center gap-2 transition-all shadow-md"
        >
          🔄 Try Again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleRemoveBackground}
      className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-200"
    >
      <Download className="w-5 h-5" /> Remove Background & Download PNG
    </button>
  );
}

/**
 * 付费墙按钮 - 未登录/免费用户看到
 */
export function ProPaywallButton() {
  return (
    <a
      href="/#pricing"
      className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-200"
    >
      <Lock className="w-4 h-4" /> Unlock with Pro — $9.9/mo
    </a>
  );
}
