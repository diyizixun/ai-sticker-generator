import { NextResponse } from "next/server";

export async function GET() {
  // 临时调试：显示环境变量是否已配置（不暴露真实值）
  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      REPLICATE_API_TOKEN: !!process.env.REPLICATE_API_TOKEN,
      CREEM_API_KEY: !!process.env.CREEM_API_KEY,
      HUGGINGFACE_API_TOKEN: !!process.env.HUGGINGFACE_API_TOKEN,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    },
  });
}
