import { CREEM_PRODUCTS } from "@/lib/creem/server";

export const metadata = {
  title: "Pricing - AI Sticker Generator",
  description: "Choose your plan for AI Sticker Generator",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="font-bold text-lg text-gray-900">AI Sticker Generator</span>
          </a>
          <a href="/" className="text-sm text-purple-600 hover:underline">← Back</a>
        </div>
      </header>

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
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-green-500 mt-0.5">✓</span>
                Generate unlimited stickers
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-green-500 mt-0.5">✓</span>
                Standard quality (512px)
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-green-500 mt-0.5">✓</span>
                Ad-supported
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-green-500 mt-0.5">✓</span>
                Personal use
              </li>
            </ul>
            <a
              href="/"
              className="block w-full py-3 rounded-xl text-center font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Start Free
            </a>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-2xl border-2 border-purple-600 p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </div>
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pro</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">$9.9<span className="text-lg text-gray-500">/mo</span></div>
              <p className="text-sm text-gray-500">or $79/year (save 33%)</p>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-purple-600 mt-0.5">✓</span>
                <strong>Transparent PNG</strong> (print-ready)
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-purple-600 mt-0.5">✓</span>
                HD Quality (1024×1024)
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-purple-600 mt-0.5">✓</span>
                No Ads
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-purple-600 mt-0.5">✓</span>
                Commercial license
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-purple-600 mt-0.5">✓</span>
                Priority support
              </li>
            </ul>
            <a
              href={`/api/creem/checkout?product=${CREEM_PRODUCTS.proMonthly}`}
              className="block w-full py-3 rounded-xl text-center font-medium text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 transition-all shadow-md mb-2"
            >
              Get Pro Monthly
            </a>
            <a
              href={`/api/creem/checkout?product=${CREEM_PRODUCTS.proYearly}`}
              className="block w-full py-2.5 rounded-xl text-center font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors text-sm"
            >
              Get Pro Yearly ($79)
            </a>
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
        <div className="max-w-4xl mx-auto px-4 text-center text-xs">
          © {new Date().getFullYear()} AI Sticker Generator. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
