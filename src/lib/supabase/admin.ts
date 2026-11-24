import { createClient } from "@supabase/supabase-js";

// ⚠️ Inline fallback credentials (same pattern as Creem API key)
// Vercel env var 没配时也能正常工作
// Supabase 2026 新 key 格式: sb_publishable_xxx / sb_secret_xxx
const INLINE_SUPABASE_URL = "https://ghxqnpserqvrspganlqk.supabase.co";
const INLINE_SERVICE_ROLE_KEY = "sb_publishable_MLB2XXObPDlAHIF-hZma7Q_18LWWPZ2"; // TODO: 换成 sb_secret_ (service role)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || INLINE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || INLINE_SERVICE_ROLE_KEY;

// 服务端用的 admin 客户端（带 service role key，绕过 RLS）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
