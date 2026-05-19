import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Add Custom Stickers to Discord, WhatsApp & Telegram",
  description:
    "Step-by-step instructions for uploading your AI stickers to Discord, WhatsApp, and Telegram. Size requirements, file formats, and tips for each platform.",
};

export default function DiscordWhatsappPost() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <a href="/blog" className="text-purple-600 hover:underline text-sm">← Blog</a>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">Tutorial</span>
            <span className="text-xs text-gray-500">May 13, 2026 · 5 min read</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            How to Add Custom Stickers to Discord, WhatsApp &amp; Telegram
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-gray">
        <p className="lead">You&apos;ve generated awesome AI stickers — now put them where people actually use them. Here&apos;s how to upload custom stickers to the three most popular messaging platforms.</p>

        <h2>Discord 🎮</h2>
        <p>Discord has the most generous sticker system. Server owners and members with &quot;Manage Emoji and Stickers&quot; permission can upload stickers.</p>

        <h3>Requirements</h3>
        <table>
          <thead><tr><th>Spec</th><th>Requirement</th></tr></thead>
          <tbody>
            <tr><td>File format</td><td>PNG, APNG, or LOTTIE (JSON)</td></tr>
            <tr><td>Max file size</td><td>512 KB</td></tr>
            <tr><td>Dimensions</td><td>320 × 320 px (exactly)</td></tr>
            <tr><td>Sticker limit</td><td>5 (free servers), up to 60 (boosted)</td></tr>
            <tr><td>Related emoji</td><td>Required — pick one that matches the sticker vibe</td></tr>
          </tbody>
        </table>

        <h3>Step-by-Step</h3>
        <ol>
          <li>Open your Discord server settings → <strong>Stickers</strong></li>
          <li>Click <strong>&quot;Upload Sticker&quot;</strong></li>
          <li>Upload your PNG file (resize to 320×320 first)</li>
          <li>Add a name (2-30 characters) and choose a related emoji</li>
          <li>Click <strong>&quot;Upload&quot;</strong> — done!</li>
        </ol>
        <p><strong>Pro tip:</strong> Resize your AI sticker to exactly 320×320 px and compress it under 512 KB using TinyPNG or similar tools. Transparent PNGs work best.</p>

        <h2>WhatsApp 💬</h2>
        <p>WhatsApp requires sticker packs. Each pack needs 3-30 stickers. You&apos;ll need a third-party app to create and publish sticker packs.</p>

        <h3>Requirements</h3>
        <table>
          <thead><tr><th>Spec</th><th>Requirement</th></tr></thead>
          <tbody>
            <tr><td>File format</td><td>PNG or WebP</td></tr>
            <tr><td>Dimensions</td><td>512 × 512 px (exactly)</td></tr>
            <tr><td>Max file size</td><td>100 KB per sticker</td></tr>
            <tr><td>Per pack</td><td>3-30 stickers + a tray icon (96×96 px)</td></tr>
            <tr><td>Background</td><td>Transparent</td></tr>
          </tbody>
        </table>

        <h3>Step-by-Step (using Sticker Maker app)</h3>
        <ol>
          <li>Download <strong>&quot;Sticker Maker&quot;</strong> from the App Store or Play Store</li>
          <li>Create a new sticker pack — give it a name and author</li>
          <li>Add 3-30 stickers (512×512 px, under 100 KB each)</li>
          <li>Add a tray icon (96×96 px) — this appears as the pack thumbnail</li>
          <li>Tap <strong>&quot;Add to WhatsApp&quot;</strong> — confirmed!</li>
        </ol>
        <p><strong>Pro tip:</strong> The 100 KB limit is strict. Use WebP format for better compression. Remove any unnecessary detail from the image to keep file size down.</p>

        <h2>Telegram ✈️</h2>
        <p>Telegram has the most flexible sticker system. Upload via @Stickers bot — no size limits on packs, and stickers support animations.</p>

        <h3>Requirements</h3>
        <table>
          <thead><tr><th>Spec</th><th>Requirement</th></tr></thead>
          <tbody>
            <tr><td>File format</td><td>PNG (static), TGS (animated), WEBM (video)</td></tr>
            <tr><td>Static dimensions</td><td>512 × 512 px (one side must be 512)</td></tr>
            <tr><td>Max file size</td><td>512 KB (static), 64 KB (animated TGS)</td></tr>
            <tr><td>Per pack</td><td>No limit</td></tr>
            <tr><td>Background</td><td>Transparent</td></tr>
          </tbody>
        </table>

        <h3>Step-by-Step</h3>
        <ol>
          <li>Open Telegram and search for <strong>@Stickers</strong> bot</li>
          <li>Send <code>/newpack</code> to create a new sticker pack</li>
          <li>Send the pack name when prompted</li>
          <li>Upload your first sticker image (512×512 px PNG)</li>
          <li>Send the emoji that corresponds to the sticker</li>
          <li>Repeat for each sticker, then send <code>/publish</code></li>
        </ol>
        <p><strong>Pro tip:</strong> Telegram stickers can be 512×N or N×512 (where the other dimension is smaller). Square 512×512 works universally best.</p>

        <h2>Quick Comparison</h2>
        <table>
          <thead><tr><th>Platform</th><th>Size</th><th>Format</th><th>Max Size</th><th>Per Pack</th></tr></thead>
          <tbody>
            <tr><td>Discord</td><td>320×320</td><td>PNG/APNG</td><td>512 KB</td><td>5-60</td></tr>
            <tr><td>WhatsApp</td><td>512×512</td><td>PNG/WebP</td><td>100 KB</td><td>3-30</td></tr>
            <tr><td>Telegram</td><td>512×512</td><td>PNG/TGS</td><td>512 KB</td><td>Unlimited</td></tr>
          </tbody>
        </table>

        <h2>Preparing Your AI Stickers</h2>
        <p>After generating stickers on our site, follow this workflow:</p>
        <ol>
          <li><strong>Download</strong> the generated sticker image</li>
          <li><strong>Remove background</strong> if not already transparent (use remove.bg or similar)</li>
          <li><strong>Resize</strong> to the target platform&apos;s dimensions</li>
          <li><strong>Compress</strong> to meet file size limits (TinyPNG, Squoosh)</li>
          <li><strong>Upload</strong> to your platform of choice</li>
        </ol>

        <h2>Start Creating Stickers</h2>
        <p>Generate stickers optimized for messaging apps — use the Cute or Cartoon style for best results:</p>
        <p>
          <a href="/" className="inline-flex items-center gap-2 bg-purple-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors no-underline">
            🎨 Generate Chat Stickers
          </a>
        </p>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm">© {new Date().getFullYear()} AI Sticker Generator</span>
          <div className="flex items-center gap-6 text-sm">
            <a href="/blog" className="hover:text-white">Blog</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/" className="hover:text-white">Home</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
