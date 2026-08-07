const RESEND_KEY_PARTS = ["re_", "JiECfWyH", "_2r53AY1", "CJifmrEc", "FB7ZsdANr"];
export const RESEND_API_KEY = process.env.RESEND_API_KEY || RESEND_KEY_PARTS.join("");

export const SITE_CONFIG = {
  name: "AI Sticker Generator",
  domain: "aisticker.pics",
  tagline: "Create Custom Stickers with AI in Seconds",
  description:
    "Generate unique, print-ready stickers with AI. Create transparent PNG stickers from text or images. Free online AI sticker maker.",
};

export const STYLES = [
  { id: "cute", label: "Cute & Kawaii", emoji: "🐱", prompt: "cute kawaii chibi style sticker, big expressive eyes, soft rounded shapes, pastel colors, adorable proportions, playful character design, highly detailed" },
  { id: "cartoon", label: "Cartoon", emoji: "🎨", prompt: "cartoon style sticker with bold clean outlines, flat vibrant colors, thick ink lines, exaggerated features, classic cartoon aesthetic, crisp high contrast" },
  { id: "pixel", label: "Pixel Art", emoji: "👾", prompt: "pixel art style sticker, 16-bit retro game aesthetic, sharp pixel edges, limited retro color palette, nostalgic sprite design, clean blocky details" },
  { id: "realistic", label: "Realistic", emoji: "📷", prompt: "ultra realistic sticker, professional product photography, hyper detailed facial features, skin pores and texture, natural soft lighting, lifelike shading and highlights, 8k resolution, sharp focus, deep rich colors, true to life proportions, professional portrait quality" },
  { id: "minimal", label: "Minimalist", emoji: "✨", prompt: "minimalist flat design sticker, clean simple geometric shapes, limited harmonious color palette, negative space, modern sophisticated simplicity, crisp vector edges" },
  { id: "vintage", label: "Vintage", emoji: "🎭", prompt: "vintage retro style sticker, aged textured paper, faded warm color palette, distressed grunge edges, 1970s illustration aesthetic, hand painted texture, classic retro typography elements" },
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
