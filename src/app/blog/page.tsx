import type { Metadata } from "next";
import postsData from "./blog-list.json";

export const metadata: Metadata = {
  title: "Blog - AI Sticker Tips, Tutorials & Ideas | AI Sticker Generator",
  description:
    "Learn how to create amazing AI stickers. Tips for writing prompts, using different styles, and selling stickers on Redbubble, Etsy & more.",
};

const MONTHS: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

function parseDate(s: string): number {
  const parts = s.replace(",", "").split(" ");
  if (parts.length >= 3) {
    const m = MONTHS[parts[0]] || 0;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (m > 0 && day > 0 && year > 0) {
      return new Date(year, m - 1, day).getTime();
    }
  }
  return 0;
}

export default function BlogPage() {
  const allPosts = postsData as Array<{
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    category: string;
    readTime: string;
  }>;

  // Sort by date descending (newest first)
  const posts = [...allPosts].sort((a, b) => parseDate(b.date) - parseDate(a.date));

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="AI Sticker Generator" className="w-8 h-8" />
            <span className="font-bold text-lg text-gray-900">AI Sticker Generator</span>
          </a>
          <div className="ml-auto">
            <a href="/" className="text-purple-600 hover:underline text-sm">← Home</a>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
          <p className="text-gray-600 mt-2">Tips, tutorials, and ideas for creating and selling AI stickers.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {posts.map((post) => (
            <article key={post.slug} className="border-b border-gray-100 pb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">{post.category}</span>
                <span className="text-xs text-gray-500">{post.date}</span>
                <span className="text-xs text-gray-400">· {post.readTime} read</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-purple-600 transition-colors">
                <a href={`/blog/${post.slug}`}>{post.title}</a>
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
