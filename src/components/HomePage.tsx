import { Sparkles, Download, Shield, Zap, Globe, Printer, Crown, Check } from "lucide-react";
import { PRICING } from "@/lib/config";
import StickerGenerator from "./StickerGenerator";

function AdPlaceholder({ slot }: { slot: string }) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-8291464992255712";
  return (
    <div className="mt-6">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

const features = [
  { icon: Sparkles, title: "AI-Powered Generation", desc: "Create unique stickers from text using state-of-the-art AI models." },
  { icon: Download, title: "Print-Ready PNG", desc: "Download high-quality 300DPI transparent PNG files ready for print-on-demand or digital use." },
  { icon: Shield, title: "Commercial License", desc: "Use generated stickers commercially — sell on Redbubble, Etsy, or your own store." },
  { icon: Zap, title: "Lightning Fast", desc: "Generate stickers in under 10 seconds. No design skills required." },
  { icon: Globe, title: "Multi-Platform Ready", desc: "Stickers sized for Discord, WhatsApp, Telegram, iMessage, and more." },
  { icon: Printer, title: "POD-Ready Export", desc: "Pro plan includes bleed marks and cut lines for print-on-demand platforms." },
];

const steps = [
  { num: "1", title: "Describe", desc: "Type what you want or upload an image" },
  { num: "2", title: "Choose Style", desc: "Pick from cute, cartoon, pixel, and more" },
  { num: "3", title: "Download", desc: "Get your print-ready transparent PNG" },
];

const faqs = [
  { q: "Is it free to generate stickers?", a: "Yes! You can generate unlimited stickers for free. Free users download a standard-quality image with background. Upgrade to Pro for transparent background, HD resolution, and print-ready files." },
  { q: "Why should I upgrade to Pro?", a: "Pro gives you transparent background (die-cut) PNG files — the format required by Redbubble, WhatsApp, Discord, Telegram, and all print-on-demand platforms. Free downloads include the background, which can't be uploaded to most platforms. Pro also includes HD resolution, no ads, and a commercial license." },
  { q: "Can I sell stickers I generate?", a: "Free plan stickers are for personal use only. Pro plan includes a commercial license, allowing you to sell stickers on Redbubble, Etsy, Amazon Merch, and more. You also get print-ready files optimized for each platform." },
  { q: "What's the difference between free and Pro downloads?", a: "Free: standard quality JPG with background. Pro: high-resolution transparent PNG without background (die-cut sticker shape). The transparent PNG is required for uploading to Redbubble, WhatsApp sticker packs, Discord, and any print-on-demand service." },
  { q: "How do I write a good sticker prompt?", a: 'Be specific! Instead of "cat", try "a cute orange cat wearing a tiny space helmet floating among pastel stars". Include details about style, colors, and mood. Our style selector adds artistic direction automatically.' },
  { q: "What platforms are the stickers compatible with?", a: "Pro downloads (transparent PNG) work with Discord, WhatsApp, Telegram, iMessage, LINE, and all major messaging platforms. They're also sized for print-on-demand platforms like Redbubble, Etsy, and Amazon Merch." },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="AI Sticker Generator" className="w-8 h-8" />
            <span className="font-bold text-lg text-gray-900">AI Sticker Generator</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-purple-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-purple-600 transition-colors">How It Works</a>
            <a href="/gallery" className="hover:text-purple-600 transition-colors">Gallery</a>
            <a href="/blog" className="hover:text-purple-600 transition-colors">Blog</a>
            <a href="/pricing" className="hover:text-purple-600 transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm font-medium text-gray-600 hover:text-purple-700 transition-colors">Sign In</a>
            <a href="#generator" className="bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">Get Started</a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero + Generator */}
        <section className="relative overflow-hidden bg-gradient-to-b from-purple-50 via-white to-white">
          <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="w-3 h-3" />
              Free AI-Powered Sticker Maker
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 tracking-tight mb-4">
              Create Custom Stickers
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">with AI in Seconds</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-12">Generate unique, print-ready transparent PNG stickers from text. Perfect for Discord, WhatsApp, Telegram &amp; print-on-demand.</p>
            <div id="generator">
              <StickerGenerator />
            </div>
            <AdPlaceholder slot="home-below-generator" />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need for AI Stickers</h2>
              <p className="text-gray-600 max-w-xl mx-auto">From quick social media stickers to professional print-on-demand products</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((f, i) => (
                <div key={i} className="p-6 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
              <p className="text-gray-600">Three simple steps to your custom sticker</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-8">
              {steps.map((step, i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">{step.num}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple Pricing</h2>
              <p className="text-gray-600">Free forever. Upgrade when you need print-ready files.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
              <div className="p-8 rounded-2xl border border-gray-200 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Free</h3>
                <div className="text-4xl font-bold text-gray-900 mb-6">$0<span className="text-base font-normal text-gray-500">/forever</span></div>
                <ul className="space-y-3 mb-8">
                  {PRICING.features.free.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-gray-400 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                <a href="#generator" className="block w-full py-3 rounded-xl text-center font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors">Start for Free</a>
              </div>
              <div className="p-8 rounded-2xl border-2 border-purple-600 bg-purple-50/50 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1"><Crown className="w-3 h-3" /> Most Popular</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Pro</h3>
                <div className="text-4xl font-bold text-gray-900 mb-1">${PRICING.proPrice}<span className="text-base font-normal text-gray-500">/month</span></div>
                <p className="text-xs text-gray-500 mb-6">or ${PRICING.proYearlyPrice}/year (save 33%)</p>
                <ul className="space-y-3 mb-8">
                  {PRICING.features.pro.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-purple-600 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                <a href="/pricing" className="block w-full py-3 rounded-xl text-center font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 transition-all shadow-lg shadow-purple-200">Upgrade to Pro</a>
              </div>
            </div>
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">💡 <strong className="text-gray-700">Why Pro?</strong> Transparent PNG is required for uploading to Redbubble, WhatsApp, Discord &amp; all print-on-demand platforms. Free downloads include background.</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-16"><h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2></div>
            <AdPlaceholder slot="home-above-faq" />
            <div className="space-y-4 mt-6">
              {faqs.map((faq, i) => (
                <details key={i} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <summary className="flex items-center justify-between p-5 cursor-pointer text-sm font-medium text-gray-900 hover:text-purple-600 transition-colors list-none">
                    {faq.q}
                    <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </summary>
                  <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{faq.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2"><span className="text-xl">🎨</span><span className="font-semibold text-white">AI Sticker Generator</span></div>
            <div className="flex items-center gap-6 text-sm">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="mailto:support@aisticker.pics" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs">© {new Date().getFullYear()} AI Sticker Generator. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
