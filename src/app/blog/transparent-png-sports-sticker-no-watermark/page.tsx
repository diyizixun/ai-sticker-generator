import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transparent Png Sports Sticker No Watermark - AI Powered Sticker Maker",
  description: "Generate sports stickers with AI. Create unique sports sticker designs in seconds. Free online tool, no signup required.",
  keywords: ["transparent png sports sticker no watermark", "ai sports sticker", "sports sticker generator", "sports sticker maker"],
};

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Transparent PNG Sports Sticker No Watermark</h1>
      
      <div className="prose prose-lg max-w-none">
        <p className="text-xl text-gray-600 mb-8">
          Generate sports stickers with AI. Create unique sports sticker designs in seconds. Free online tool, no signup required.
        </p>
        
        <div className="bg-purple-50 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Generate Your Sports Stickers Now</h2>
          <p className="mb-6">Use our AI-powered sticker generator to create unique sports stickers in seconds.</p>
          <a 
            href="/"
            className="inline-block bg-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
          >
            Start Creating Free
          </a>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4">Why Use Our AI Sports Sticker Generator?</h2>
        <ul className="space-y-3 mb-8">
          <li>✅ 100% Free - No credit card required</li>
          <li>✅ Transparent PNG output - Perfect for stickers</li>
          <li>✅ Multiple styles - Cute, Cartoon, Pixel Art, Realistic</li>
          <li>✅ Print-ready 300DPI - Use for POD platforms</li>
          <li>✅ No watermark - Clean output</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mb-4">Popular Sports Sticker Ideas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="border rounded-lg p-4">Cute sports with big eyes</div>
          <div className="border rounded-lg p-4">Cartoon sports doing sports</div>
          <div className="border rounded-lg p-4">Kawaii sports eating food</div>
          <div className="border rounded-lg p-4">Pixel art sports character</div>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4">How to Create Sports Stickers</h2>
        <ol className="space-y-4 mb-8">
          <li><strong>1. Describe your sticker</strong> - Type what you want (e.g., "cute sports with sunglasses")</li>
          <li><strong>2. Choose a style</strong> - Pick from Cute, Cartoon, Pixel Art, or Realistic</li>
          <li><strong>3. Generate</strong> - Our AI creates your sticker in seconds</li>
          <li><strong>4. Download</strong> - Get transparent PNG, ready to use!</li>
        </ol>
      </div>
    </div>
  );
}
