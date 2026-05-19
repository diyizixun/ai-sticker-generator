"use client";

import { useState } from "react";
import { STYLES } from "@/lib/config";

interface StickerImageProps {
  src: string;
  alt: string;
  styleId: string;
  userPrompt: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function StickerImage({
  src,
  alt,
  styleId,
  userPrompt,
  className = "",
  style,
}: StickerImageProps) {
  const [imgError, setImgError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setImgError(false);
    // 强制重新加载图片
    const img = new window.Image();
    img.src = src + (src.includes("?") ? "&" : "?") + "retry=" + Date.now();
    img.onload = () => {
      setRetrying(false);
      // 重新加载页面以显示新图片
      window.location.reload();
    };
    img.onerror = () => {
      setRetrying(false);
      setImgError(true);
    };
  };

  if (imgError) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Image Failed to Load
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Network issue or the image server is temporarily unavailable.
        </p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {retrying ? "Retrying..." : "Retry Generation"}
        </button>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setImgError(true)}
    />
  );
}
