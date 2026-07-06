"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function PricingPage() {
  const [checkoutLoading, setCheckoutLoading] = useState<"monthly" | "yearly" | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "verifying" | "success" | "failed">("idle");
  const [isAlreadyPro, setIsAlreadyPro] = useState(false);

  const monthlyProductId = process.env.NEXT_PUBLIC_CREEM_PRO_MONTHLY_PRODUCT_ID || "prod_7OurPpIwMMeub80vPOxl6F";
  const yearlyProductId = process.env.NEXT_PUBLIC_CREEM_PRO_YEARLY_PRODUCT_ID || "prod_3cy26xwgYp3NTUwgQEyeVa";

  // 检测支付完成回跳 + 轮询 Pro 状态
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPaid = params.get("paid") === "1";

    if (!isPaid) return;

    // 清理 URL 参数（避免刷新时重复轮询）
    const url = new URL(window.location.href);
    url.searchParams.delete("paid");
    url.searchParams.delete("email");
    window.history.replaceState({}, "", url.toString());

    setPaymentStatus("verifying");

    let attempts = 0;
    const maxAttempts = 20;
    const intervalMs = 2000;

    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch("/api/checkout/status", { credentials: "include" });
        const data = await res.json();

        if (data.isPro) {
          clearInterval(poll);
          setPaymentStatus("success");
          setIsAlreadyPro(true);
          console.log("[Pricing] ✅ Payment verified — Pro activated!");
          return;
        }
      } catch {
        // 继续轮询
      }

      if (attempts >= maxAttempts) {
        clearInterval(poll);
        setPaymentStatus("failed");
        console.log("[Pricing] ⚠️ Payment verification timed out — webhook may be delayed");
      }
    }, intervalMs);

    return () => clearInterval(poll);
  }, []);

  const handleUpgrade = async (priceType: "monthly" | "yearly") => {
    setCheckoutLoading(priceType);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || `Checkout failed: ${res.status}`);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("No checkout URL received. Please try again.");
      }
    } catch {
      alert("Failed to start checkout. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="AI Sticker Generator" className="w-8 h-8" />
            <span className="font-bold text-lg text-gray-900">AI Sticker Generator</span>
          </a>
          <a href="/" className="text-sm text-purple-600 hover:underline">← Back</a>
        </div>
      </header>

      {/* 支付状态提示横幅 */}
      {paymentStatus === "verifying" && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-amber-600 animate-spin" />
            <div>
              <p className="text-sm font-medium text-amber-800">Verifying your payment...</p>
              <p className="text-xs text-amber-600">This usually takes a few seconds. Please don't close this page.</p>
            </div>
          </div>
        </div>
      )}
      {paymentStatus === "success" && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">✅ Payment successful! You're now a Pro member.</p>
              <p className="text-xs text-green-600">
                <a href="/" className="underline hover:no-underline">Go to home →</a> to start creating unlimited stickers with transparent PNGs.
              </p>
            </div>
          </div>
        </div>
      )}
      {paymentStatus === "failed" && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Payment verification is taking longer than expected.</p>
              <p className="text-xs text-red-600">
                If you completed payment, your Pro access may already be active.{' '}
                <a href="/" className="underline hover:no-underline">Go to home →</a> to check. Contact support if the issue persists.
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-lg text-gray-600">Choose the plan that fits your creative needs</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Free</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">$0</div>
              <p className="text-sm text-gray-500">Forever</p>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-gray-600">
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>5 free generations per day (guest)</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>10 free generations per day (signed in)</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Standard quality (512px)</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Ad-supported</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Personal use</li>
            </ul>
            <a href="/" className="block w-full py-3 rounded-xl text-center font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Start Free</a>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-2xl border-2 border-purple-600 p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pro</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">$9.9<span className="text-lg text-gray-500">/mo</span></div>
              <p className="text-sm text-gray-500">or $79/year (save 33%)</p>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-gray-600">
              <li className="flex items-start gap-2"><span className="text-purple-600 mt-0.5">✓</span><strong>Unlimited</strong> sticker generation</li>
              <li className="flex items-start gap-2"><span className="text-purple-600 mt-0.5">✓</span><strong>Transparent PNG</strong> (print-ready)</li>
              <li className="flex items-start gap-2"><span className="text-purple-600 mt-0.5">✓</span>HD Quality (1024×1024)</li>
              <li className="flex items-start gap-2"><span className="text-purple-600 mt-0.5">✓</span>No Ads</li>
              <li className="flex items-start gap-2"><span className="text-purple-600 mt-0.5">✓</span>Commercial license</li>
              <li className="flex items-start gap-2"><span className="text-purple-600 mt-0.5">✓</span>Priority support</li>
            </ul>
            <button
              onClick={() => handleUpgrade("monthly")}
              disabled={checkoutLoading !== null}
              className="w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 transition-all shadow-md mb-2 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checkoutLoading === "monthly" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                "Get Pro Monthly"
              )}
            </button>
            <button
              onClick={() => handleUpgrade("yearly")}
              disabled={checkoutLoading !== null}
              className="w-full py-2.5 rounded-xl font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checkoutLoading === "yearly" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                "Get Pro Yearly ($79)"
              )}
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="bg-white rounded-xl border border-gray-200 p-5">
              <summary className="font-medium text-gray-900 cursor-pointer">What's the difference between Free and Pro?</summary>
              <p className="mt-3 text-sm text-gray-600">Free users can generate stickers with ads and standard quality. Pro users get transparent PNGs (print-ready), HD quality, no ads, and commercial license.</p>
            </details>
            <details className="bg-white rounded-xl border border-gray-200 p-5">
              <summary className="font-medium text-gray-900 cursor-pointer">Can I cancel anytime?</summary>
              <p className="mt-3 text-sm text-gray-600">Yes, you can cancel your Pro subscription anytime. You'll continue to have Pro access until the end of your billing period.</p>
            </details>
            <details className="bg-white rounded-xl border border-gray-200 p-5">
              <summary className="font-medium text-gray-900 cursor-pointer">What can I do with transparent PNGs?</summary>
              <p className="mt-3 text-sm text-gray-600">Transparent PNGs are perfect for uploading to Redbubble, WhatsApp, Discord, Etsy, Printful, and all print-on-demand platforms. They have no background and are die-cut ready.</p>
            </details>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs">© {new Date().getFullYear()} AI Sticker Generator. All rights reserved.</div>
      </footer>
    </div>
  );
}
