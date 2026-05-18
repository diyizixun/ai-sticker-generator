import { STYLES } from "./config";

export interface GenerateRequest {
  prompt: string;
  style: string;
  mode: "text" | "image";
  imageBase64?: string;
}

export interface GenerateResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export function buildPrompt(userPrompt: string, styleId: string): string {
  const style = STYLES.find((s) => s.id === styleId);
  const stylePrompt = style?.prompt || "sticker design";

  return `${stylePrompt}, ${userPrompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality, vector art style`;
}

export function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: "Please enter a description for your sticker" };
  }
  if (prompt.length > 500) {
    return { valid: false, error: "Description must be under 500 characters" };
  }
  // Block inappropriate content
  const blockedWords = ["nude", "nsfw", "porn", "violent", "gore", "hate"];
  const lower = prompt.toLowerCase();
  for (const word of blockedWords) {
    if (lower.includes(word)) {
      return { valid: false, error: "Content violates our usage policy" };
    }
  }
  return { valid: true };
}
