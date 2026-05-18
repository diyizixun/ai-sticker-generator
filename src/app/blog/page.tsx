import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - AI Sticker Tips, Tutorials & Ideas | AI Sticker Generator",
  description:
    "Learn how to create amazing AI stickers. Tips for writing prompts, using different styles, and selling stickers on Redbubble, Etsy & more.",
};

const POSTS = [
  {
    slug: "ai-sticker-generator-free-transparent-png",
    title: "AI Sticker Generator Free: Create Transparent PNG Stickers Online",
    excerpt: "Generate free AI stickers with transparent PNG background. Perfect for POD sellers, social media, and creative projects. No design skills needed.",
    date: "May 17, 2026",
    category: "Guide",
    readTime: "6 min",
  },
  {
    slug: "best-free-sticker-maker-online-2026",
    title: "Best Free Sticker Maker Online 2026: AI-Powered & No Design Skills Needed",
    excerpt: "Discover the best free sticker maker online in 2026. Create custom stickers with AI — transparent PNG, HD quality, perfect for POD and social media.",
    date: "May 17, 2026",
    category: "Review",
    readTime: "7 min",
  },
  {
    slug: "how-to-make-print-ready-stickers-POD",
    title: "How to Make Print-Ready Stickers for POD: Complete Guide 2026",
    excerpt: "Learn how to create print-ready stickers for Print on Demand. Transparent PNG, 300 DPI, commercial license — everything POD sellers need.",
    date: "May 17, 2026",
    category: "Guide",
    readTime: "8 min",
  },
  {
    slug: "transparent-png-sticker-generator-no-watermark",
    title: "Transparent PNG Sticker Generator No Watermark: Best Tools 2026",
    excerpt: "Find the best transparent PNG sticker generator with no watermark. Perfect for commercial use, POD sellers, and Cricut users.",
    date: "May 17, 2026",
    category: "Guide",
    readTime: "6 min",
  },
  {
    slug: "sticker-business-passive-income-2026",
    title: "Sticker Business Passive Income 2026: Complete Guide",
    excerpt: "Learn how to build a sticker business for passive income in 2026. POD platforms, AI-generated designs, and SEO strategies that work.",
    date: "May 17, 2026",
    category: "Business",
    readTime: "8 min",
  },
  {
    slug: "kawaii-sticker-maker-online-free",
    title: "Kawaii Sticker Maker Online Free: Create Cute Stickers in Seconds",
    excerpt: "Make kawaii stickers online for free. Cute anime-style stickers, transparent PNG available. Perfect for planners, journals, and social media.",
    date: "May 17, 2026",
    category: "Style",
    readTime: "5 min",
  },
  {
    slug: "how-to-write-sticker-prompts",
    title: "How to Write Perfect Sticker Prompts: 10 Tips for Amazing AI Stickers",
    excerpt: "Master the art of writing prompts that produce stunning stickers every time. From being specific to using style keywords, these tips will transform your results.",
    date: "May 13, 2026",
    category: "Tips",
    readTime: "4 min",
  },
  {
    slug: "sell-stickers-on-redbubble",
    title: "How to Sell AI Stickers on Redbubble: Complete Guide for 2026",
    excerpt: "Turn your AI-generated stickers into passive income on Redbubble. Learn about file requirements, popular niches, and optimization strategies.",
    date: "May 13, 2026",
    category: "Monetize",
    readTime: "6 min",
  },
  {
    slug: "sticker-styles-guide",
    title: "6 Sticker Styles Explained: Cute, Cartoon, Pixel Art, Realistic, Minimal & Vintage",
    excerpt: "Not sure which style to choose? This guide breaks down each style with examples and best use cases for messaging apps, merch, and POD.",
    date: "May 13, 2026",
    category: "Guide",
    readTime: "5 min",
  },
  {
    slug: "discord-whatsapp-stickers",
    title: "How to Add Custom Stickers to Discord, WhatsApp & Telegram",
    excerpt: "Step-by-step instructions for uploading your AI stickers to the most popular messaging platforms. Size requirements, formats, and tips.",
    date: "May 13, 2026",
    category: "Tutorial",
    readTime: "5 min",
  },
  {
    slug: "ai-sticker-ideas",
    title: "50 AI Sticker Ideas: Prompts You Can Copy and Use Right Now",
    excerpt: "Stuck for inspiration? Here are 50 ready-to-use sticker prompts across animals, food, nature, fantasy, and more. Just copy, paste, and generate.",
    date: "May 13, 2026",
    category: "Ideas",
    readTime: "3 min",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <a href="/" className="text-purple-600 hover:underline text-sm">← Home</a>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Blog</h1>
          <p className="text-gray-600 mt-2">Tips, tutorials, and ideas for creating and selling AI stickers.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {POSTS.map((post) => (
            <article key={post.slug} className="border-b border-gray-100 pb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">{post.category}</span>
                <span className="text-xs text-gray-500">{post.date}</span>
                <span className="text-xs text-gray-400">· {post.readTime} read</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-purple-600 transition-colors">
                {post.title}
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">{post.excerpt}</p>
              <a href={`/blog/${post.slug}`} className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline mt-3">
                Read more →
              </a>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16 py-12 bg-purple-50 rounded-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Create?</h2>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-purple-600 text-white font-medium px-8 py-3 rounded-xl hover:bg-purple-700 transition-colors"
          >
            🎨 Generate Your Sticker
          </a>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm">© {new Date().getFullYear()} AI Sticker Generator</span>
          <div className="flex items-center gap-6 text-sm">
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/" className="hover:text-white">Home</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
