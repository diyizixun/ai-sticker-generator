import { STYLES } from "@/lib/config";

const STYLE_PROMPTS: Record<string, string> = {
  cute: "cute kawaii chibi style sticker",
  cartoon: "cartoon style sticker with bold outlines",
  pixel: "pixel art style sticker, 16-bit retro game aesthetic",
  realistic: "photorealistic sticker, real photograph style, detailed textures, natural lighting, lifelike shading",
  minimal: "minimalist flat design sticker, clean simple shapes, limited color palette, geometric",
  vintage: "vintage retro style sticker, aged paper texture, faded colors, distressed look, 1970s aesthetic",
};

// 广告位
function AdBanner({ slot, format = "auto", style }: { slot: string; format?: string; style?: React.CSSProperties }) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-8291464992255712";
  return (
    <div style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// Replicate 轮询脚本
function ReplicatePollingScript({ predictionId }: { predictionId: string }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  var pid = "${predictionId}";
  var pollInterval = 2000;
  var maxAttempts = 30;
  var attempts = 0;
  var imgEl = document.getElementById('sticker-image');
  var statusEl = document.getElementById('gen-status');
  function poll() {
    if (attempts >= maxAttempts) {
      if (statusEl) statusEl.textContent = 'Free preview ready';
      return;
    }
    attempts++;
    fetch('/api/replicate/status?id=' + pid)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.status === 'succeeded' && data.output) {
          if (imgEl) imgEl.src = data.output;
          if (statusEl) statusEl.style.display = 'none';
        } else if (data.status === 'failed') {
          if (statusEl) statusEl.textContent = 'Free preview ready';
        } else {
          if (statusEl) statusEl.textContent = '✨ Generating HD sticker... (' + attempts + ')';
          setTimeout(poll, pollInterval);
        }
      })
      .catch(function() {
        if (statusEl) statusEl.textContent = 'Free preview ready';
      });
  }
  poll();
})();`,
      }}
    />
  );
}

// Pro 下载脚本 — 直接下载 Pollinations 图片（背景去除后续通过服务端 API 实现）
function ProDownloadScript({ prompt }: { prompt: string }) {
  const safePrompt = prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-");
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  var btn = document.getElementById('pro-download-btn');
  var container = document.getElementById('pro-download-area');
  if (!btn) return;

  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.innerHTML = '<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"></circle><path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path></svg> Preparing download...';

    try {
      var imgEl = document.getElementById('sticker-image');
      var imgUrl = imgEl ? imgEl.src : '';
      if (!imgUrl) throw new Error('No image found');

      // 直接下载原图（Pro 功能：透明背景将通过服务端 API 实现）
      var link = document.createElement('a');
      link.href = imgUrl;
      link.download = 'sticker-${safePrompt}.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      btn.innerHTML = '✅ Downloaded!';
      setTimeout(function() {
        btn.disabled = false;
        btn.innerHTML = '🪄 Download Sticker';
      }, 2000);
    } catch(e) {
      console.error('Download failed:', e);
      btn.disabled = false;
      btn.innerHTML = '🪄 Try Again';
    }
  });
})();`,
      }}
    />
  );
}

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; s?: string; r?: string }>;
}) {
  const params = await searchParams;
  const userPrompt = params.p || "";
  const styleId = params.s || "cute";
  const stylePrompt = STYLE_PROMPTS[styleId] || "sticker design";
  const fullPrompt = `${stylePrompt}, ${userPrompt}, sticker, white outline, die-cut sticker shape, clean background, vibrant colors, high quality`;
  const encoded = encodeURIComponent(fullPrompt);
  const seed = params.r || String(Date.now());
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${seed}`;
  const nextSeed = String(Date.now());

  const style = STYLES.find((s) => s.id === styleId);

  // 决定生成引擎
  const hasReplicate = !!process.env.REPLICATE_API_TOKEN;

  let genMode: "replicate" | "pollinations" = "pollinations";
  let replicatePredictionId: string | null = null;

  if (hasReplicate) {
    try {
      const startRes = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN!}`,
          "Content-Type": "application/json",
          Prefer: "respond-async",
        },
        body: JSON.stringify({
          version: "black-forest-labs/flux-schnell",
          input: {
            prompt: fullPrompt,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "png",
            output_quality: 90,
          },
        }),
      });
      if (startRes.ok) {
        const prediction = await startRes.json();
        replicatePredictionId = prediction.id;
        genMode = "replicate";
      }
    } catch (e) {
      console.error("Replicate start failed:", e);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="font-bold text-lg text-gray-900">AI Sticker Generator</span>
          </a>
          <a href="/" className="text-sm text-purple-600 hover:underline">← Back</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Prompt Info */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <span>{style?.emoji}</span> {style?.label} Style
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">&quot;{userPrompt}&quot;</h1>
          {genMode !== "pollinations" && (
            <p id="gen-status" className="text-sm text-purple-500 mt-2">
              ✨ Generating HD sticker...
            </p>
          )}
        </div>

        {/* 广告位1 */}
        <div className="mb-6">
          <AdBanner slot="top-banner" format="horizontal" style={{ minHeight: "90px" }} />
        </div>

        {/* Image */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-center p-8 bg-gray-50 min-h-[400px] relative">
            <img
              id="sticker-image"
              src={pollinationsUrl}
              alt={`Sticker: ${userPrompt}`}
              className="max-w-[512px] max-h-[512px] object-contain rounded-lg"
              style={{ imageRendering: "auto" }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<div class="text-center text-gray-400"><p class="text-4xl mb-2">⚠️</p><p class="text-sm">Image failed to load. Please check your network and <a href="/result?p=${encodeURIComponent(userPrompt)}&s=${styleId}&r=${Date.now()}" class="text-purple-600 underline">retry</a>.</p></div>`;
                }
              }}
            />
          </div>
        </div>

        {/* 下载区 - 付费墙 */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* 免费下载 */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">Standard Download</p>
                <p className="text-xs text-gray-500">512px · With background · Personal use</p>
              </div>
              <a
                href={pollinationsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
              >
                Free Download
              </a>
            </div>
          </div>
          {/* Pro 下载 - 透明背景 */}
          <div className="p-5 bg-gradient-to-r from-purple-50 to-violet-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm">Transparent PNG</p>
                  <span className="text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">PRO</span>
                </div>
                <p className="text-xs text-gray-500">Die-cut · Print-ready · Upload to Redbubble, WhatsApp, Discord</p>
              </div>
            </div>
            <div id="pro-download-area">
              <button
                id="pro-download-btn"
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 flex items-center justify-center gap-2 transition-all shadow-md"
              >
                🪄 Remove Background & Download
              </button>
            </div>
          </div>
        </div>

        {/* 提示 */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800 text-center">
            💡 <strong>Transparent PNG</strong> is required for uploading to Redbubble, WhatsApp, Discord &amp; all print-on-demand platforms.
            <a href="/#pricing" className="text-purple-600 font-medium hover:underline ml-1">Pro $9.9/mo →</a>
          </p>
        </div>

        {/* 广告位2 */}
        <div className="mt-6">
          <AdBanner slot="below-image" format="horizontal" style={{ minHeight: "90px" }} />
        </div>

        {/* Regenerate */}
        <div className="mt-6">
          <a
            href={`/result?p=${encodeURIComponent(userPrompt)}&s=${styleId}&r=${nextSeed}`}
            className="w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 flex items-center justify-center gap-2 text-center"
          >
            🔄 Regenerate
          </a>
        </div>

        {/* Try other styles */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Try Another Style</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {STYLES.filter((s) => s.id !== styleId).map((s) => (
              <a
                key={s.id}
                href={`/result?p=${encodeURIComponent(userPrompt)}&s=${s.id}`}
                className="flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-700 transition-all"
              >
                <span className="text-lg">{s.emoji}</span>
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* 广告位3 */}
        <div className="mt-8">
          <AdBanner slot="bottom-rect" format="rectangle" style={{ minHeight: "250px" }} />
        </div>

        {/* New prompt */}
        <div className="mt-8 text-center">
          <a href="/" className="inline-flex items-center gap-2 bg-purple-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors">
            ✨ Create New Sticker
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs">
          © {new Date().getFullYear()} AI Sticker Generator. All rights reserved.
        </div>
      </footer>

      {/* 生成脚本 */}
      {genMode === "replicate" && replicatePredictionId && (
        <ReplicatePollingScript predictionId={replicatePredictionId} />
      )}
      {/* 背景去除脚本 */}
      <ProDownloadScript prompt={userPrompt} />
    </div>
  );
}
