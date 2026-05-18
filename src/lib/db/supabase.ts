// Supabase客户端 - 服务端用（绕过RLS）
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _serverClient: SupabaseClient | null = null;

export function createServerSupabaseClient(): SupabaseClient {
  if (!_serverClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase credentials not configured");
    }
    _serverClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _serverClient;
}

let _browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient(): SupabaseClient {
  if (!_browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Supabase public credentials not configured");
    }
    _browserClient = createClient(url, key);
  }
  return _browserClient;
}
