-- Supabase 数据库建表 SQL
-- 在 Supabase Dashboard → SQL Editor 执行

-- 用户表
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- RLS（Row Level Security）— 允许 service_role 访问
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.users
  FOR ALL USING (true) WITH CHECK (true);
