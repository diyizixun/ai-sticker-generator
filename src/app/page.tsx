import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Sticker Generator - Create Custom Stickers with AI",
  description: "Generate unique, print-ready transparent PNG stickers from text. Perfect for Discord, WhatsApp, Telegram & print-on-demand.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold">🎨 AI Sticker Generator</h1>
        <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Sign In
        </Link>
      </nav>

      <section className="text-center py-20 px-4">
        <h2 className="text-5xl font-bold mb-6">Create Amazing Stickers with AI</h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Generate unique, print-ready transparent PNG stickers in seconds
        </p>

        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            placeholder="Describe your sticker..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
            Generate
          </button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16 grid grid-cols-3 gap-8">
        {[
          { title: "Fast Generation", desc: "Get your stickers in seconds with our AI-powered generator" },
          { title: "Transparent PNG", desc: "Perfect for Discord, WhatsApp, Telegram and print-on-demand" },
          { title: "Commercial License", desc: "Use your stickers for personal and commercial projects" },
        ].map((feature) => (
          <div key={feature.title} className="p-6 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
