import { Metadata } from "next";
import { getPageBySlug, getAllSlugs } from "@/lib/sticker-pages";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import StickerGenerator from "@/components/StickerGenerator";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySlug(slug);
  if (!page) return { title: "Not Found" };

  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    openGraph: {
      title: page.title,
      description: page.description,
      type: "website",
    },
  };
}

export default async function StickerPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getPageBySlug(slug);

  if (!page) {
    return <div>Page not found</div>;
  }

  // Get related pages (excluding current)
  const relatedPages = getAllSlugs()
    .filter((s) => s !== slug)
    .slice(0, 4)
    .map((s) => getPageBySlug(s)!)
    .filter(Boolean);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 text-sm text-gray-500">
          <Link href="/" className="hover:text-purple-600">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{page.h1}</span>
        </div>
      </div>

      <main className="flex-1">
        {/* Page Hero */}
        <section className="bg-gradient-to-b from-purple-50 to-white py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">{page.h1}</h1>
              <p className="text-lg text-gray-600">{page.description}</p>
            </div>
            <StickerGenerator initialPrompt={page.prompt} />
          </div>
        </section>

        {/* Content Section - Critical for SEO */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="prose prose-lg max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {page.h1} - Create Custom Stickers with AI
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">{page.content}</p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">How to Use the {page.h1}</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-6">
                <li>Enter a description of your desired sticker in the text box above</li>
                <li>Choose your preferred style (cute, cartoon, pixel art, realistic, minimalist, or vintage)</li>
                <li>Click &quot;Generate Sticker&quot; and wait a few seconds</li>
                <li>Download your transparent PNG sticker — free!</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Why Use Our {page.h1}?</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
                <li><strong>Free to use</strong> — generate up to 3 stickers per day at no cost</li>
                <li><strong>Multiple styles</strong> — choose from 6 different artistic styles</li>
                <li><strong>Print-ready</strong> — download high-quality transparent PNG files</li>
                <li><strong>Commercial license</strong> — Pro users can sell stickers on Redbubble, Etsy, and more</li>
                <li><strong>No design skills needed</strong> — just describe what you want</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Popular {page.keywords[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Ideas</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Personalized stickers for messaging apps like Discord and WhatsApp</li>
                <li>Print-on-demand products for Redbubble, Etsy, and Amazon Merch</li>
                <li>Laptop and phone case decorations</li>
                <li>Journal and planner decorations</li>
                <li>Party and event decorations</li>
                <li>Business branding and marketing materials</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Related Pages - Internal linking for SEO */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Try More AI Sticker Generators</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {relatedPages.map((related) => (
                <Link
                  key={related.slug}
                  href={`/${related.slug}`}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
                >
                  <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors text-sm">
                      {related.h1}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{related.description}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
