import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

// Temporarily disable Ads components to debug 500 error
// import { GoogleAnalytics, GoogleAdSense } from "@/components/Ads";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Sticker Generator - Create Custom Stickers with AI | Free Online Tool",
  description:
    "Generate unique, print-ready stickers with AI. Create transparent PNG stickers from text or images in seconds. Free online AI sticker maker for Discord, WhatsApp, Telegram & print-on-demand.",
  keywords: [
    "ai sticker generator",
    "ai sticker maker",
    "sticker generator ai",
    "free ai sticker generator",
    "ai sticker creator",
    "custom sticker generator",
    "ai sticker design",
    "print on demand stickers",
    "transparent sticker generator",
    "sticker maker online",
    "ai emoji sticker",
    "discord sticker maker",
    "whatsapp sticker maker",
    "telegram sticker maker",
    "pod sticker generator",
  ],
  authors: [{ name: "AI Sticker Generator" }],
  openGraph: {
    title: "AI Sticker Generator - Create Custom Stickers with AI",
    description:
      "Generate unique, print-ready stickers with AI. Create transparent PNG stickers from text or images in seconds.",
    type: "website",
    locale: "en_US",
    siteName: "AI Sticker Generator",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Sticker Generator - Create Custom Stickers with AI",
    description:
      "Generate unique, print-ready stickers with AI. Create transparent PNG stickers from text or images in seconds.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="canonical" href="https://aisticker.pics" />
        {/* Temporarily disabled for debugging
        <GoogleAnalytics />
        <GoogleAdSense />
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "AI Sticker Generator",
              description:
                "Generate unique, print-ready stickers with AI. Create transparent PNG stickers from text or images in seconds.",
              applicationCategory: "DesignApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
