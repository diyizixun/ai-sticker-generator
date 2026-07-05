import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us - AI Sticker Generator",
  description:
    "Learn about AI Sticker Generator — the free online tool for creating custom AI-powered stickers, emojis, and PNG images for Discord, WhatsApp, Telegram, and print-on-demand.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-pink-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Link href="/" className="text-white/80 hover:text-white text-sm mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">About AI Sticker Generator</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Empowering creators worldwide with free AI-powered sticker design tools.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* What is AI Sticker Generator */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What is AI Sticker Generator?</h2>
          <div className="prose prose-gray max-w-none text-gray-700 space-y-4">
            <p>
              AI Sticker Generator (aisticker.pics) is a free online creative tool that uses advanced artificial
              intelligence to help anyone — from casual chat app users to professional designers — create
              unique, high-quality stickers in seconds. No design experience is required. Simply type a
              description of the sticker you have in mind, and our AI transforms your words into a
              ready-to-use sticker image.
            </p>
            <p>
              Whether you want a cute cat sticker for WhatsApp, a custom emoji for your Discord server,
              a transparent PNG for your Telegram pack, or a print-ready design for your Redbubble shop,
              our tool makes it effortless. We support multiple art styles including kawaii, cartoon,
              watercolor, gothic, vintage, minimalist, and sketch — so you can match any aesthetic or
              brand identity.
            </p>
          </div>
        </section>

        {/* Our Mission */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-6">
            <p className="text-gray-700 leading-relaxed">
              We believe that creative expression should be accessible to everyone. Traditional sticker
              design requires expensive software, artistic training, and hours of work. We built AI
              Sticker Generator to remove those barriers. Our mission is to give every creator — regardless
              of skill level or budget — the power to bring their ideas to life with the help of AI.
              We are constantly improving our AI models and adding new features based on user feedback.
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: "🎨",
                title: "AI-Powered Generation",
                desc: "State-of-the-art AI models turn your text prompts into high-quality sticker images in seconds. Supports both realistic and artistic styles.",
              },
              {
                icon: "🖼️",
                title: "Transparent PNG Output",
                desc: "Download stickers with transparent backgrounds — perfect for layering on images, messages, and print-on-demand products.",
              },
              {
                icon: "📱",
                title: "Messaging App Ready",
                desc: "Optimized output sizes for Discord, WhatsApp, Telegram, Signal, and iMessage. Export directly to your favorite chat platform.",
              },
              {
                icon: "🖨️",
                title: "Print-Ready Quality",
                desc: "High-resolution output suitable for printing on stickers, t-shirts, mugs, phone cases, and other merchandise via POD platforms.",
              },
              {
                icon: "🎭",
                title: "Multiple Art Styles",
                desc: "Choose from kawaii, cartoon, watercolor, gothic, vintage, sketch, minimalist, aesthetic, and more. New styles added regularly.",
              },
              {
                icon: "💰",
                title: "Free to Use",
                desc: "Generate up to 3 stickers per day for free. No credit card required. Upgrade to Pro for unlimited generations and commercial licensing.",
              },
            ].map((f) => (
              <div key={f.title} className="border border-gray-200 rounded-xl p-5">
                <div className="text-3xl mb-2">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who Is It For */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Who Is It For?</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong className="text-gray-900">Content Creators & Streamers:</strong> Create custom emojis
              and stickers for your Discord server, Twitch overlays, and social media posts. Build a unique
              visual identity that your audience will recognize and love.
            </p>
            <p>
              <strong className="text-gray-900">Print-on-Demand Sellers:</strong> Generate original sticker
              designs to sell on Redbubble, Etsy, Merch by Amazon, and other POD platforms. With a Pro
              plan, you get a commercial license for all generated stickers.
            </p>
            <p>
              <strong className="text-gray-900">Chat App Users:</strong> Make your own personal sticker
              packs for WhatsApp, Telegram, Discord, and iMessage. Express yourself with stickers that
              truly represent your personality and sense of humor.
            </p>
            <p>
              <strong className="text-gray-900">Small Business Owners:</strong> Create branded stickers
              for packaging, promotional materials, and merchandise without hiring a designer. Our AI
              helps you iterate quickly until you find the perfect design.
            </p>
            <p>
              <strong className="text-gray-900">Hobbyists & Crafters:</strong> Design stickers for your
              journal, planner, scrapbook, or DIY projects. Print them at home or send them to a local
              print shop.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>
          <ol className="space-y-6 list-decimal list-inside">
            {[
              {
                step: "Describe Your Idea",
                desc: "Type a text prompt describing the sticker you want. Be as specific or as creative as you like. Example: 'A cute white cat wearing sunglasses and holding a milkshake, kawaii style.'",
              },
              {
                step: "Choose Style & Options",
                desc: "Select an art style, aspect ratio, and whether you want a transparent background. You can also upload a reference image for the AI to use as inspiration.",
              },
              {
                step: "Generate & Preview",
                desc: "Click 'Generate' and watch as our AI creates your sticker in seconds. Preview the result and make adjustments to your prompt if needed.",
              },
              {
                step: "Download & Use",
                desc: "Download your sticker as a PNG file. Use it in your chats, upload it to your sticker pack, or send it to a print shop. Pro users can download in high resolution.",
              },
            ].map((s, i) => (
              <li key={s.step} className="pl-2">
                <strong className="text-gray-900">Step {i + 1}: {s.step}</strong>
                <p className="text-gray-600 mt-1 ml-5">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Commercial Use & Licensing */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Commercial Use & Licensing</h2>
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-3 text-gray-700">
            <p>
              Stickers generated under our <strong>Free plan</strong> are licensed for personal,
              non-commercial use only. You may use them in private chats, personal projects, and
              non-monetized social media posts.
            </p>
            <p>
              Stickers generated under our <strong>Pro plan</strong> include a commercial license.
              Pro subscribers may use generated stickers for commercial purposes, including selling on
              print-on-demand platforms (Redbubble, Etsy, etc.), using them in marketing materials,
              and incorporating them into products for sale.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact & Support</h2>
          <p className="text-gray-700">
            Have questions, feedback, or need help? We'd love to hear from you.
          </p>
          <ul className="mt-3 space-y-2 text-gray-700">
            <li>📧 Email: <a href="mailto:support@aisticker.pics" className="text-purple-600 hover:underline">support@aisticker.pics</a></li>
            <li>🏠 Website: <a href="https://www.aisticker.pics" className="text-purple-600 hover:underline">aisticker.pics</a></li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">
            We typically respond to support emails within 48 hours.
          </p>
        </section>
      </main>
    </div>
  );
}
