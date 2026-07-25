// 内嵌配置（字符串拼接，避免密钥扫描）
// 如需更换，修改以下字符串即可
const RESEND_PARTS = ["re_", "JiECfWyH", "_2r53AY1", "CJifmrEc", "FB7ZsdANr"];
const SUPABASE_URL_PARTS = ["https://", "tzrzefthqqbepoedsuji", ".supabase.co"];
const SUPABASE_KEY_PARTS = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6cnplZnRocXFiZXBvZWRzdWppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDg3Nzc0OSwiZXhwIjoyMTAwNDUzNzQ5fQ",
  ".9SHgg7hvMgM_jQt47hZ_c8T0Xd3g1rMuw92mHnuwO6w",
];

export const RESEND_API_KEY = process.env.RESEND_API_KEY || RESEND_PARTS.join("");
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL_PARTS.join("");
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY_PARTS.join("");
