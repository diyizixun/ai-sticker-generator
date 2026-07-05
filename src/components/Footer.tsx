import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Top: columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Column 1: Brand */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">AI Sticker Generator</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Free online AI tool to create custom stickers, emojis, and transparent PNG images
              for Discord, WhatsApp, Telegram, and print-on-demand. No design skills required.
            </p>
          </div>

          {/* Column 2: Pages */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Pages
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-600 hover:text-purple-600 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-gray-600 hover:text-purple-600 transition">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="text-sm text-gray-600 hover:text-purple-600 transition">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-gray-600 hover:text-purple-600 transition">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-gray-600 hover:text-purple-600 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-600 hover:text-purple-600 transition">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom: copyright */}
        <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            © {year} AI Sticker Generator. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">
            Powered by AI · <a href="https://www.aisticker.pics" className="hover:text-purple-600 transition">aisticker.pics</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
