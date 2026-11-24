// Supabase客户端 - 服务端用（绕过RLS）
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ⚠️ Inline fallback (Vercel env var 没配时也能正常工作)
// Supabase 2026 新 key 格式: sb_publishable_xxx / sb_secret_xxx
const INLINE_SUPABASE_URL = "https://ghxqnpserqvrspganlqk.supabase.co";
const INLINE_SERVICE_ROLE_KEY = "sb_publishable_MLB2XXObPDlAHIF-hZma7Q_18LWWPZ2"; // TODO: 换成 sb_secret_
const INLINE_ANON_KEY = "sb_publishable_MLB2XXObPDlAHIF-hZma7Q_18LWWPZ2";

let _serverClient: SupabaseClient | null = null;

export function createServerSupabaseClient(): SupabaseClient {
  if (!_serverClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || INLINE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || INLINE_SERVICE_ROLE_KEY;
    _serverClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _serverClient;
}

let _browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient(): SupabaseClient {
  if (!_browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || INLINE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || INLINE_ANON_KEY;
    _browserClient = createClient(url, key);
  }
  return _browserClient;
}
