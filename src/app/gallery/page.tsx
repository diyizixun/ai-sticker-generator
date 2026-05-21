import type { Metadata } from "next";
import { STYLES } from "@/lib/config";

export const metadata: Metadata = {
  title: "AI Sticker Gallery - Browse Generated Sticker Examples | AI Sticker Generator",
  description:
    "Browse hundreds of AI-generated sticker examples. See what our AI sticker generator can create across cute, cartoon, pixel art, realistic, minimalist and vintage styles.",
};

const GALLERY_ITEMS = [
  { prompt: "A happy cat wearing a space helmet", style: "cute", emoji: "🐱" },
  { prompt: "Golden retriever with sunglasses", style: "cartoon", emoji: "🐶" },
  { prompt: "Pixel art dragon breathing fire", style: "pixel", emoji: "🐉" },
  { prompt: "Realistic rose with dewdrops", style: "realistic", emoji: "🌹" },
  { prompt: "Minimalist mountain landscape", style: "minimal", emoji: "⛰️" },
  { prompt: "Vintage cassette tape", style: "vintage", emoji: "📼" },
  { prompt: "Kawaii avocado with a smile", style: "cute", emoji: "🥑" },
  { prompt: "Cartoon rocket ship blasting off", style: "cartoon", emoji: "🚀" },
  { prompt: "Pixel art magic sword", style: "pixel", emoji: "⚔️" },
  { prompt: "Realistic butterfly on a flower", style: "realistic", emoji: "🦋" },
  { prompt: "Minimalist coffee cup", style: "minimal", emoji: "☕" },
  { prompt: "Vintage typewriter", style: "vintage", emoji: "⌨️" },
  { prompt: "Cute dinosaur holding a balloon", style: "cute", emoji: "🦕" },
  { prompt: "Cartoon pizza slice with legs", style: "cartoon", emoji: "🍕" },
  { prompt: "Pixel art heart with wings", style: "pixel", emoji: "💖" },
  { prompt: "Realistic galaxy with stars", style: "realistic", emoji: "🌌" },
  { prompt: "Minimalist lightning bolt", style: "minimal", emoji: "⚡" },
  { prompt: "Vintage vinyl record", style: "vintage", emoji: "💿" },
  { prompt: "Kawaii mushroom with freckles", style: "cute", emoji: "🍄" },
  { prompt: "Cartoon UFO abducting a cow", style: "cartoon", emoji: "🛸" },
  { prompt: "Pixel art treasure chest", style: "pixel", emoji: "📦" },
  { prompt: "Realistic ocean wave", style: "realistic", emoji: "🌊" },
  { prompt: "Minimalist sun and moon", style: "minimal", emoji: "🌙" },
  { prompt: "Vintage film camera", style: "vintage", emoji: "📷" },
];

const STYLE_PROMPTS: Record<string, string> = {
  cute: "cute kawaii chibi style sticker",
  cartoon: "cartoon style sticker with bold outlines",
  pixel: "pixel art style sticker, 16-bit retro game aesthetic",
  realistic: "photorealistic sticker, real photograph style, detailed textures, natural lighting, lifelike shading, NOT cartoon, NOT chibi, NOT anime",
  minimal: "minimalist flat design sticker, clean simple shapes, limited color palette, geometric",
  vintage: "vintage retro style sticker, aged paper texture, faded colors, distressed look, 1970s aesthetic",
};

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="AI Sticker Generator" className="w-8 h-8" />
            <span className="font-bold text-lg text-gray-900">AI Sticker Generator</span>
          </a>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <a href="/" className="text-gray-600 hover:text-purple-600">Home</a>
            <a href="/gallery" className="text-purple-600 font-medium">Gallery</a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Sticker Gallery</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Browse examples of AI-generated stickers across all 6 styles. Click any sticker to create your own version.
          </p>
        </div>

        {/* Style filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {STYLES.map((style) => (
            <a
              key={style.id}
              href={`#${style.id}`}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
            >
              <span>{style.emoji}</span> {style.label}
            </a>
          ))}
        </div>

        {/* Gallery grid by style */}
        {STYLES.map((style) => {
          const items = GALLERY_ITEMS.filter((item) => item.style === style.id);
          return (
            <section key={style.id} id={style.id} className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="text-2xl">{style.emoji}</span> {style.label} Stickers
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {items.map((item, i) => {
                  const stylePrompt = STYLE_PROMPTS[item.style];
                  const fullPrompt = `${stylePrompt}, ${item.prompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;
                  const encoded = encodeURIComponent(fullPrompt);
                  const seed = 1000 + i * 7;
                  const imgSrc = `https://image.pollinations.ai/prompt/${encoded}?width=256&height=256&nologo=true&seed=${seed}`;
                  const link = `/result?p=${encodeURIComponent(item.prompt)}&s=${item.style}`;

                  return (
                    <a
                      key={i}
                      href={link}
                      className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-purple-300 hover:shadow-lg transition-all"
                    >
                      <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
                        <img
                          src={imgSrc}
                          alt={item.prompt}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-gray-700 font-medium truncate">{item.emoji} {item.prompt}</p>
                        <p className="text-xs text-purple-600 mt-1">Generate similar →</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* CTA */}
        <div className="text-center mt-16 py-12 bg-purple-50 rounded-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Your Own Sticker</h2>
          <p className="text-gray-600 mb-6">Describe anything and turn it into a sticker in seconds.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-purple-600 text-white font-medium px-8 py-3 rounded-xl hover:bg-purple-700 transition-colors"
          >
            🎨 Start Creating
          </a>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <span className="font-semibold text-white">AI Sticker Generator</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="/" className="hover:text-white transition-colors">Home</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
