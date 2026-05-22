# QQ邮箱SMTP配置指南 - AI Sticker Generator

## ✅ QQ邮箱SMTP优势

- **完全免费**，无发送限制
- **无新账号限制**，能给任何邮箱发邮件
- **无需验证域名**
- **国内速度快**，QQ邮箱送达率高

## 🔧 获取QQ邮箱授权码（5分钟）

### 步骤1：登录QQ邮箱
访问：https://mail.qq.com

### 步骤2：开启SMTP服务
1. 点击顶部 **[设置]** → **[账户]**
2. 滚动到 **"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"**
3. 找到 **"IMAP/SMTP服务"**，点击 **[开启]**
4. 用绑定的手机发送短信验证（按页面提示）
5. **复制显示的授权码**（16位字符，如：`abcdEFGH1234wxyz`）

⚠️ **注意**：授权码不是QQ密码！是QQ邮箱生成的专用密码。

## 🔧 Vercel环境变量配置

进入：Vercel项目 → **Settings** → **Environment Variables** → **Add**

添加以下2个变量：

| Name | Value | Environment |
|------|-------|-------------|
| `QQ_EMAIL_USER` | `heroinyan@qq.com` | Production, Preview, Development |
| `QQ_EMAIL_PASS` | `你的授权码` | Production, Preview, Development |

**可选（备用）**：
| Name | Value | Environment |
|------|-------|-------------|
| `RESEND_API_KEY` | `re_4exQaGdS_AyZaUcASinvHpvG17KTmD95z` | Production, Preview, Development |
| `RESEND_FROM` | `onboarding@resend.dev` | Production, Preview, Development |

## 📧 代码说明

已修改为：**优先使用QQ邮箱SMTP，Resend作为备用**

逻辑顺序：
1. 如果配置了 `QQ_EMAIL_USER` + `QQ_EMAIL_PASS` → 用QQ邮箱发信
2. 如果QQ邮箱失败 + 配置了 `RESEND_API_KEY` → 用Resend发信
3. 如果都失败 + 开发环境 → 打印验证码到控制台

## 🚀 测试流程

### 本地测试
```bash
# 1. 更新 .env.local
QQ_EMAIL_USER=heroinyan@qq.com
QQ_EMAIL_PASS=你的授权码

# 2. 启动开发服务器
npm run dev

# 3. 访问 http://localhost:3000/login
# 4. 输入任意邮箱（如：test@gmail.com）
# 5. 点击"发送验证码"
# 6. 检查邮箱，应该收到验证码邮件
```

### 生产环境测试
1. Vercel添加环境变量后自动部署（约2分钟）
2. 访问 https://aisticker.pics/login
3. 输入邮箱 → 发送验证码 → 查收邮件 → 输入6位码 → 登录成功

## 🐛 常见问题

### Q: 邮件被识别为垃圾邮件？
A: 
- 使用QQ邮箱发送，国内送达率高
- 邮件内容已优化，包含明显的"验证码"提示
- 提醒用户检查**垃圾邮件箱**

### Q: 授权码忘记了？
A: 重新开启SMTP服务，会生成新的授权码（旧的失效）

### Q: 发送失败？
A: 检查：
1. 授权码是否正确（16位）
2. QQ邮箱SMTP服务是否已开启
3. 查看Vercel函数日志（Dashboard → Deployments → 最新部署 → Functions）

## 📊 对服务器要求

| 项目 | 要求 | 说明 |
|------|------|------|
| **CPU/内存** | 极低 | Vercel Serverless 完全够用 |
| **邮件服务** | QQ邮箱免费 | 无限制，国内速度快 |
| **验证码存储** | 内存即可 | 5分钟有效期，Vercel内存够用 |
| **数据库** | Supabase 免费版 | 已有 |

**结论：完全免费，无任何额外成本！**

## ✅ 完成清单

- [x] 安装nodemailer + @types/nodemailer
- [x] 重写 `src/app/api/auth/send-otp/route.ts` 支持QQ SMTP
- [x] 构建测试通过
- [ ] 获取QQ邮箱授权码
- [ ] 在Vercel添加 `QQ_EMAIL_USER` + `QQ_EMAIL_PASS`
- [ ] 测试发送验证码
- [ ] 验证登录流程

---

**代码已准备就绪，就差你添加授权码了！** 🚀
