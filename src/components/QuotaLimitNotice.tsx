"use client";

import { LogIn, Crown, RefreshCw } from "lucide-react";

interface QuotaLimitNoticeProps {
  limit: number;
  isLoggedIn: boolean;
  variant?: "compact" | "full";
}

/**
 * 额度用尽时显示的引导组件。
 * - 未登录：引导「登录」+「升级 Pro」
 * - 已登录：引导「升级 Pro」
 */
export default function QuotaLimitNotice({
  limit,
  isLoggedIn,
  variant = "full",
}: QuotaLimitNoticeProps) {
  if (variant === "compact") {
    return (
      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="text-sm font-medium text-amber-800">
          You&apos;ve used all {limit} free generations today.
        </p>
        <div className="mt-2 flex items-center justify-center gap-3">
          {!isLoggedIn ? (
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
            >
              <LogIn className="h-4 w-4" /> Sign In for More
            </a>
          ) : null}
          <a
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors"
          >
            <Crown className="h-4 w-4" /> Upgrade to Pro
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
        <RefreshCw className="h-6 w-6 text-purple-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">
        You&apos;ve reached today&apos;s free limit
      </h3>
      <p className="mt-1 text-sm text-gray-600">
        You&apos;ve used all {limit} free generations for today. Resets at midnight.
      </p>

      <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {!isLoggedIn ? (
          <a
            href="/login"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors sm:w-auto"
          >
            <LogIn className="h-4 w-4" /> Sign In for More
          </a>
        ) : null}
        <a
          href="/pricing"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:from-amber-500 hover:to-orange-600 transition-all sm:w-auto"
        >
          <Crown className="h-4 w-4" /> Upgrade to Pro — Unlimited
        </a>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Pro members get <strong>unlimited</strong> generations, transparent PNGs &amp; HD quality.
      </p>
    </div>
  );
}
