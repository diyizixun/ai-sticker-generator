"use client";

import { useState, useEffect } from "react";
import {
  User,
  CreditCard,
  Download,
  Crown,
  LogOut,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";

interface UserData {
  user: {
    id: string;
    email: string;
    name: string | null;
    plan: "free" | "pro";
    subscriptionStatus: string | null;
    totalGenerations: number;
  };
  quota: {
    allowed: boolean;
    remaining: number;
    plan: "free" | "pro";
  };
  generations: Array<{
    id: string;
    prompt: string;
    style: string;
    imageUrl: string | null;
    createdAt: string;
  }>;
}

export default function SettingsPage() {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (priceType: "monthly" | "yearly") => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(`Checkout failed: ${data.error || res.status}`);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("No checkout URL received. Please try again.");
      }
    } catch (e: any) {
      console.error("Checkout error:", e);
      alert(`Failed to start checkout: ${e.message || e}`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your Pro subscription? You'll keep access until the end of your billing period.")) return;
    try {
      await fetch("/api/billing", { method: "DELETE" });
      window.location.reload();
    } catch {
      alert("Failed to cancel. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // 即使请求失败也继续跳转
    }
    // 强制整页刷新跳首页，确保所有状态清空
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to view settings</p>
          <a href="/login" className="text-purple-600 hover:underline font-medium">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const isPro = data.user.plan === "pro" && data.user.subscriptionStatus === "active";

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-purple-600 transition-colors" title="Back to Home">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </a>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>

          {/* Profile */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{data.user.name || data.user.email}</p>
                <p className="text-sm text-gray-500">{data.user.email}</p>
              </div>
              <div className="ml-auto">
                {isPro ? (
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                    <Crown className="w-3 h-3" /> Pro
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                    Free
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quota */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-purple-600" /> Usage & Quota
            </h2>

            {/* 今日额度进度 */}
            {!isPro && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Today's quota</span>
                  <span className="text-gray-900 font-medium">
                    {data.quota.allowed ? `${5 - data.quota.remaining}/5` : "0/5"}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all"
                    style={{ width: `${data.quota.allowed ? ((5 - data.quota.remaining) / 5) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Resets at 00:00 UTC ({
                    data.quota.remaining > 0
                      ? `${data.quota.remaining} remaining today`
                      : "Quota used up, comes back at midnight UTC"
                  })
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{data.user.totalGenerations}</p>
                <p className="text-xs text-gray-500">Total Stickers</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {isPro ? "∞" : data.quota.remaining}
                </p>
                <p className="text-xs text-gray-500">Remaining Today</p>
              </div>
            </div>

            {/* Pro 提示 */}
            {!isPro && data.quota.remaining === 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  🚧 Daily quota used up! <a href="#subscription" className="font-medium underline">Upgrade to Pro</a> for unlimited generations.
                </p>
              </div>
            )}

            <a
              href="/#generator"
              className="mt-4 block w-full py-3 rounded-xl text-center font-medium text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 transition-all"
            >
              ✨ Generate New Sticker
            </a>
          </div>

          {/* Subscription */}
          <div id="subscription" className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" /> Subscription
            </h2>

            {isPro ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Pro Plan - Active</span>
                </div>
                <p className="text-sm text-gray-500">
                  Unlimited sticker generation, 300DPI PNG downloads, commercial license.
                </p>
                <button
                  onClick={handleCancel}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  Cancel subscription
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-500">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Free Plan</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleUpgrade("monthly")}
                    disabled={checkoutLoading}
                    className="py-3 rounded-xl font-medium text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 transition-all"
                  >
                    {checkoutLoading ? "Loading..." : "$9.9/month"}
                  </button>
                  <button
                    onClick={() => handleUpgrade("yearly")}
                    disabled={checkoutLoading}
                    className="py-2.5 rounded-xl font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 transition-colors text-sm"
                  >
                    $79/year (save 33%)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent Generations */}
          {data.generations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Recent Stickers</h2>
              <div className="grid grid-cols-4 gap-3">
                {data.generations.slice(0, 8).map((gen) => (
                  <div
                    key={gen.id}
                    className="aspect-square rounded-lg bg-gray-50 border border-gray-100 overflow-hidden"
                  >
                    {gen.imageUrl && gen.imageUrl !== "base64_stored" && (
                      <img
                        src={gen.imageUrl}
                        alt={gen.prompt}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
