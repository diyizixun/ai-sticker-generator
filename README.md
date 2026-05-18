# AI Sticker Generator

AI驱动的在线贴纸生成器，支持文字/图片生成，多种风格，透明PNG导出。

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 API key

# 开发模式
pnpm dev

# 构建生产版本
pnpm build
```

## 核心功能

- **文字生成贴纸**：输入描述 → AI生成透明PNG贴纸
- **图片生成贴纸**：上传图片 → AI转化为贴纸风格
- **6种风格**：Cute/Cartoon/Pixel/Realistic/Minimal/Vintage
- **15个SEO长尾页面**：覆盖 ai-cat-sticker-generator 等低竞争关键词
- **Freemium变现**：免费3次/天 + Pro $9.9/月

## API 配置

支持两种图片生成API（二选一）：

| API | 模型 | 价格 | 推荐 |
|-----|------|------|------|
| Replicate | Flux Schnell | ~$0.003/张 | ✅ 推荐，性价比最高 |
| OpenAI | GPT-image-1 | ~$0.04/张 | 备选 |

## SEO 策略

- **首页**：主关键词 "ai sticker generator"
- **15个长尾页面**：ai-[cat/dog/anime/cute/food/flower/name/halloween/christmas/emoji/tattoo/car/hello-kitty/letter/birthday]-sticker-generator
- **KGR < 1**：每个长尾页都是低竞争高搜索量关键词
- **sitemap.xml + robots.txt**：自动生成
- **Schema.org 结构化数据**：WebApplication 类型

## 部署

1. 注册域名（推荐 Namecheap/Spaceship，~$10/年）
2. 推送到 GitHub
3. Vercel 一键部署（免费）
4. 域名DNS指向Vercel

## 变现路线

1. **第1个月**：免费上线 → SEO引流 → AdSense变现
2. **第2-3个月**：接入Stripe → Pro订阅
3. **第4个月+**：POD分成 → API售卖 → 复制到下一个产品
