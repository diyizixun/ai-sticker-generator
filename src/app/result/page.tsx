import { STYLES } from "@/lib/config";
import ResultClient from "@/components/ResultClient";

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; s?: string; r?: string }>;
}) {
  const params = await searchParams;
  const userPrompt = params.p || "";
  const styleId = params.s || "cute";
  const style = STYLES.find((s) => s.id === styleId);
  const stylePrompt = style?.prompt || "sticker design";
  const fullPrompt = `${stylePrompt}, ${userPrompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;

  return (
    <ResultClient
      userPrompt={userPrompt}
      styleId={styleId}
      styleName={style?.label || "Cute & Kawaii"}
      styleEmoji={style?.emoji || "🐱"}
      fullPrompt={fullPrompt}
    />
  );
}
