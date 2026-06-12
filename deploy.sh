#!/bin/bash
set -e

echo "=== AI Sticker 部署脚本 ==="

# Get Vercel token
if [ -z "$VERCEL_TOKEN" ]; then
  echo "请输入 Vercel Token（去 https://vercel.com/account/tokens 创建）："
  read -r VERCEL_TOKEN
fi

# Install deps
echo "📦 安装依赖..."
npm install

# Deploy to Vercel
echo "🚀 部署到 Vercel..."
npx vercel deploy \
  --token "$VERCEL_TOKEN" \
  --prod \
  --yes \
  --env NEXT_PUBLIC_SUPABASE_URL=https://ghxqnpserqvrspganlqk.supabase.co \
  --env SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoeHFucHNlcnF2cnNwZ2FubHFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA0NzYwNSwiZXhwIjoyMDk0NjIzNjA1fQ.QZm82jlINQqhygGTy8x5P4EG_3GB29YdrhQwUPfmusQ \
  --env SMTP_HOST=smtp.qq.com \
  --env SMTP_PORT=465 \
  --env SMTP_USER=332847952@qq.com \
  --env SMTP_PASS=fvalrtrwemascahe \
  --env SMTP_FROM=332847952@qq.com \
  --env POLLINATIONS_API_KEY=sk_08ggRC32YTLnHTphGv4SAF3S6N832PCl \
  --env NEXT_PUBLIC_APP_URL=https://www.aisticker.pics

echo ""
echo "✅ 部署完成！访问 https://www.aisticker.pics"
