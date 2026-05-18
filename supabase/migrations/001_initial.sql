-- AI Sticker Generator - Database Schema
-- 执行环境: Supabase SQL Editor
-- 版本: 1.0

-- ============================================
-- 1. 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  
  -- OAuth信息
  provider TEXT,
  provider_id TEXT,
  
  -- 订阅状态
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing', NULL)),
  subscription_current_period_end TIMESTAMPTZ,
  
  -- 免费额度
  daily_generations_used INTEGER NOT NULL DEFAULT 0,
  daily_generations_reset_at TIMESTAMPTZ DEFAULT NOW(),
  total_generations INTEGER NOT NULL DEFAULT 0,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- ============================================
-- 2. 生成记录表
-- ============================================
CREATE TABLE IF NOT EXISTS generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 生成参数
  prompt TEXT NOT NULL,
  style TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'text' CHECK (mode IN ('text', 'image')),
  
  -- 生成结果
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  
  -- API信息
  api_provider TEXT CHECK (api_provider IN ('replicate', 'openai', 'pollinations')),
  api_cost_cents INTEGER DEFAULT 0,  -- 成本（美分）
  generation_time_ms INTEGER,        -- 生成耗时（毫秒）
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);

-- ============================================
-- 3. 支付记录表
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Stripe信息
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_subscription_id TEXT,
  
  -- 支付信息
  amount_cents INTEGER NOT NULL,     -- 金额（美分）
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  description TEXT,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice ON payments(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ============================================
-- 4. 每日统计表（物化视图替代）
-- ============================================
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  
  -- 用户统计
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  
  -- 生成统计
  total_generations INTEGER DEFAULT 0,
  failed_generations INTEGER DEFAULT 0,
  avg_generation_time_ms INTEGER DEFAULT 0,
  
  -- 收入统计
  revenue_cents INTEGER DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  canceled_subscriptions INTEGER DEFAULT 0,
  
  -- API成本
  api_cost_cents INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);

-- ============================================
-- 5. 等待列表（早期用户收集）
-- ============================================
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT,  -- 来源: google, reddit, producthunt, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS（Row Level Security）策略
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- 用户只能看自己的数据
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own generations" ON generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- 管理员策略（通过service_role key绕过）
-- daily_stats和waitlist只通过service_role访问

-- ============================================
-- 自动重置每日免费额度
-- ============================================
CREATE OR REPLACE FUNCTION reset_daily_generations()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET daily_generations_used = 0,
      daily_generations_reset_at = NOW()
  WHERE daily_generations_reset_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 更新updated_at触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
