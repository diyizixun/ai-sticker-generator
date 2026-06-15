export const SITE_CONFIG = {
  name: "AI Sticker Generator",
  domain: "aisticker.pics",
  tagline: "Create Custom Stickers with AI in Seconds",
  description:
    "Generate unique, print-ready stickers with AI. Create transparent PNG stickers from text or images. Free online AI sticker maker.",
};

export const STYLES = [
  { id: "cute", label: "Cute & Kawaii", emoji: "🐱", prompt: "cute kawaii chibi style sticker" },
  { id: "cartoon", label: "Cartoon", emoji: "🎨", prompt: "cartoon style sticker with bold outlines" },
  { id: "pixel", label: "Pixel Art", emoji: "👾", prompt: "pixel art style sticker, 16-bit retro game aesthetic" },
  { id: "realistic", label: "Realistic", emoji: "📷", prompt: "photorealistic sticker, real photograph of a physical sticker, natural lighting, detailed textures, lifelike materials, realistic shadows and highlights, professional product photography, 8k resolution" },
  { id: "minimal", label: "Minimalist", emoji: "✨", prompt: "minimalist flat design sticker, clean simple shapes" },
  { id: "vintage", label: "Vintage", emoji: "🎭", prompt: "vintage retro style sticker, aged paper texture" },
] as const;

export const PRICING = {
  proPrice: 9.9,
  proYearlyPrice: 79,
  features: {
    free: [
      "Unlimited sticker generation",
      "Standard quality (512px)",
      "Preview with background",
      "JPG download",
      "Ad-supported",
      "Personal use only",
    ],
    pro: [
      "Unlimited sticker generation",
      "HD quality (1024px+)",
      "Transparent background (Die-cut PNG)",
      "Print-ready 300DPI PNG",
      "No ads",
      "Commercial license",
      "Upload to Redbubble, WhatsApp, Discord",
      "Priority generation",
    ],
  },
} as const;
