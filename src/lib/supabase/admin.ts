import { createClient } from "@supabase/supabase-js";

// ⚠️ Inline fallback credentials (same pattern as Creem API key)
// Vercel env var 没配时也能正常工作
const INLINE_SUPABASE_URL = "https://tzrzefthqqbepoedsuji.supabase.co";
const INLINE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6cnplZnRocXFiZXBvZWRzdWppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDg3Nzc0OSwiZXhwIjoyMTAwNDUzNzQ5fQ.9SHgg7hvMgM_jQt47hZ_c8T0Xd3g1rMuw92mHnuwO6w";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || INLINE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || INLINE_SERVICE_ROLE_KEY;

// 服务端用的 admin 客户端（带 service role key，绕过 RLS）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
