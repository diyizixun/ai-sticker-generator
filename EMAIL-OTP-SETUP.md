# 邮箱验证码登录 - 部署配置指南

## ✅ 已完成
- [x] **OTP存储模块** (`src/lib/auth/otp.ts`)
- [x] **发送验证码API** (`/api/auth/send-otp`)
- [x] **验证登录API** (`/api/auth/verify-otp`)
- [x] **NextAuth配置更新** (支持Credentials provider)
- [x] **登录页面重写** (添加邮箱验证码登录UI)
- [x] **构建测试通过** ✅

## 🔧 部署前配置

### 1. 注册 Resend 账号（推荐）
1. 访问 https://resend.com
2. 免费注册（能用QQ邮箱注册）
3. 进入 Dashboard → API Keys → Create API Key
4. **复制 API Key** (格式: `re_xxxxx`)

### 2. 添加域名（可选，提升邮件送达率）
- 如果使用 `noreply@aisticker.pics`，需要在域名DNS添加TXT记录验证
- **不配置域名**：可用 `onboarding@resend.dev` 作为发件人（免费用户可用）

### 3. Vercel 环境变量配置

在 Vercel 项目设置 → Environment Variables 添加：

```bash
# 邮箱验证码登录 - Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM=onboarding@resend.dev  # 或 noreply@aisticker.pics

# NextAuth 必须配置（生产环境）
NEXTAUTH_SECRET=your_strong_secret_here  # 生成: openssl rand -base64 32
NEXTAUTH_URL=https://aisticker.pics
```

### 4. Supabase 数据库确认

确保 `users` 表存在且包含以下字段：
- `id` (uuid, primary key)
- `email` (text, unique)
- `name` (text, nullable)
- `provider` (text) - 存储 'email', 'google', 'facebook'
- `provider_id` (text) - 邮箱登录时存邮箱地址
- `plan` (text) - 'free' 或 'pro'

如果没有，运行以下SQL：
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'email',
  provider_id TEXT,
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  subscription_current_period_end TEXT,
  daily_generations_used INTEGER DEFAULT 0,
  daily_generations_reset_at TEXT,
  total_generations INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## 📊 对服务器要求

| 项目 | 要求 | 说明 |
|------|------|------|
| **CPU/内存** | 极低 | Vercel Serverless 完全够用 |
| **邮件服务** | Resend 免费额度 | 1000封/月（足够用） |
| **验证码存储** | 内存即可 | 5分钟有效期，Vercel 内存够用 |
| **数据库** | Supabase 免费版 | 500MB 数据库，足够小型项目 |

**结论：对服务器要求极低，Vercel + Supabase 免费套餐完全够用！**

## 🚀 部署步骤

### 方式1：Vercel 自动部署（推荐）
```bash
# 1. 提交代码
git add -A
git commit -m "feat: add email OTP login"
git push origin main

# 2. Vercel 自动部署（约2分钟）
# 3. 在 Vercel 控制台添加环境变量
# 4. 测试登录：https://aisticker.pics/login
```

### 方式2：本地测试
```bash
# 1. 安装依赖
cd /Users/myan/WorkBuddy/2026-05-17-task-1
npm install

# 2. 配置 .env.local
# 添加：RESEND_API_KEY=re_xxxxx
# 添加：NEXTAUTH_SECRET=test_secret

# 3. 启动开发服务器
npm run dev

# 4. 访问 http://localhost:3000/login
```

## 🧪 测试流程

1. 访问 `/login` 页面
2. 输入邮箱地址（如 `test@example.com`）
3. 点击 "发送验证码"
4. 检查邮箱（开发环境验证码会在浏览器控制台显示）
5. 输入6位验证码
6. 点击 "登录 / 注册"
7. 自动跳转到 `/settings` 页面

## ⚠️ 注意事项

1. **验证码有效期**：5分钟
2. **重发间隔**：60秒（防止频繁发送）
3. **开发环境**：验证码会打印到服务器日志（方便测试）
4. **生产环境**：验证码只在邮件中显示
5. **兜底方案**：如果没有配置 Resend，开发环境会在日志打印验证码（生产环境会报错）

## 📧 备用方案：QQ邮箱SMTP

如果不想用 Resend，可以用 QQ 邮箱 SMTP（完全免费）：

1. 登录 QQ 邮箱 → 设置 → 账户 → 开启 SMTP 服务
2. 获取 **授权码**（不是QQ密码）
3. 配置环境变量：
   ```bash
   QQ_EMAIL_USER=heroinyan@qq.com
   QQ_EMAIL_PASS=your_smtp_auth_code  # 授权码
   ```
4. 修改 `src/app/api/auth/send-otp/route.ts` 使用 nodemailer

## 🎯 下一步

- [ ] 在 Vercel 添加 `RESEND_API_KEY` 环境变量
- [ ] 在 Vercel 添加 `NEXTAUTH_SECRET` 环境变量
- [ ] 验证 Supabase `users` 表结构
- [ ] 部署到生产环境
- [ ] 测试邮箱登录流程
- [ ] 可选：配置自定义域名邮件（提升送达率）

---

**完成时间**: 2026-05-21  
**代码提交**: 待提交  
**构建状态**: ✅ 成功
