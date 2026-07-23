"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface StickerImageProps {
  userPrompt: string;
  styleId: string;
  fullPrompt: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onImageReady?: (dataUrl: string) => void;
  onQuotaUpdate?: (remaining: number, limit: number) => void;
}

export default function StickerImage({
  userPrompt,
  styleId,
  fullPrompt,
  alt,
  className = "",
  style,
  onImageReady,
  onQuotaUpdate,
}: StickerImageProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const autoRetried = useRef(0); // 改为计数器，最多自动重试 2 次

  // 用 ref 存回调，避免回调变化导致 generate 重建引发无限循环
  const onQuotaUpdateRef = useRef(onQuotaUpdate);
  onQuotaUpdateRef.current = onQuotaUpdate;

  // 调用 /api/generate 生成图片
  // 传 userPrompt（非 fullPrompt），由 API 端拼接 style，避免双重拼接
  const generate = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams({
        prompt: userPrompt,
        style: styleId,
      });
      // 前端 28s 超时，比 Vercel function 30s 短，确保能收到错误而非挂起
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 28000);
      const res = await fetch(`/api/generate?${params.toString()}`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${errText.slice(0, 100)}`);
      }

      const json = await res.json();
      if (json.success && json.imageUrl) {
        setDataUrl(json.imageUrl);
        // 立刻通知父组件更新 quota（不等图片加载）
        if (json.quota && onQuotaUpdateRef.current) {
          onQuotaUpdateRef.current(json.quota.remaining, json.quota.limit);
        }
      } else {
        throw new Error(json.error || "Generation failed");
      }
    } catch (e: any) {
      console.error("StickerImage generate error:", e.message);
      // 最多自动重试 2 次（间隔 2 秒），覆盖偶发超时
      if (autoRetried.current < 2) {
        autoRetried.current += 1;
        setTimeout(() => setRetryCount((c) => c + 1), 2000);
        return;
      }
      setLoadError(true);
      setLoading(false);
    }
  }, [userPrompt, styleId]);

  // 初始生成 + retry 时重新生成
  useEffect(() => {
    generate();
  }, [generate, retryCount]);

  // 图片加载完成 → 转成 dataURL 供下载
  const handleImageReady = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoading(false);
    setLoadError(false);
    try {
      const img = e.currentTarget;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 512;
      canvas.height = img.naturalHeight || 512;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        if (onImageReady) onImageReady(dataUrl);
      }
    } catch {
      if (dataUrl && onImageReady) onImageReady(dataUrl);
    }
  }, [onImageReady, dataUrl]);

  const handleRetry = useCallback(() => {
    setDataUrl(null);
    setLoadError(false);
    setLoading(true);
    setRetryCount((c) => c + 1);
  }, []);

  // 报错界面
  if (loadError) {
    return (
      <div className="text-center py-12 px-6 w-full">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Image Generation Failed</h3>
        <p className="text-sm text-gray-500 mb-1 max-w-sm mx-auto">
          The AI server is busy. Please retry — it usually works on the second attempt.
        </p>
        {retryCount >= 2 && (
          <p className="text-xs text-gray-400 mb-4">
            Tip: Try a simpler description like &quot;cute cat sticker&quot;
          </p>
        )}
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors mt-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full flex items-center justify-center">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-50 rounded-xl">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
            <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-gray-500 animate-pulse">Generating your sticker with AI...</p>
          <p className="text-xs text-gray-400">Usually takes 5–15 seconds</p>
        </div>
      )}
      {dataUrl && (
        <img
          src={dataUrl}
          alt={alt}
          className={`${className} ${loading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
          style={style}
          onLoad={handleImageReady}
          onError={() => setLoadError(true)}
          crossOrigin="anonymous"
        />
      )}
      {!dataUrl && !loading && (
        <button
          onClick={handleRetry}
          className="px-5 py-2.5 bg-purple-600 text-white text-sm rounded-xl"
        >
          Retry Generation
        </button>
      )}
    </div>
  );
}
