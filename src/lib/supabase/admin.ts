import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 服务端用的 admin 客户端（带 service role key，绕过 RLS）
// 惰性初始化，避免构建时失败
export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase admin client: missing env vars");
}
