#!/bin/bash
# AI Sticker Generator - 完整诊断与修复脚本
# 使用：bash scripts/fix-and-test.sh

set -e

echo "========================================="
echo "AI Sticker Generator - 诊断与修复"
echo "========================================="

# 1. 清理环境变量
echo ""
echo "[1/6] 清理环境变量..."
unset NODE_OPTIONS
export NODE_OPTIONS=""
echo "  NODE_OPTIONS cleared"

# 2. 清理构建缓存
echo ""
echo "[2/6] 清理构建缓存..."
rm -rf .next
rm -rf node_modules/.cache
echo "  Cache cleaned"

# 3. 检查关键文件
echo ""
echo "[3/6] 检查关键文件..."
files=(
  "src/components/HomePage.tsx"
  "src/components/LoginModal.tsx"
  "src/app/api/image-to-sticker/route.ts"
  "src/app/api/checkout/route.ts"
  "src/app/api/auth/[...nextauth]/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file exists"
  else
    echo "  ✗ $file MISSING!"
  fi
done

# 4. 检查环境变量
echo ""
echo "[4/6] 检查环境变量配置..."
if [ -f ".env.local" ]; then
  echo "  .env.local exists"
  grep -q "NEXTAUTH_SECRET" .env.local && echo "  ✓ NEXTAUTH_SECRET set" || echo "  ✗ NEXTAUTH_SECRET missing"
  grep -q "CREEM_API_KEY" .env.local && echo "  ✓ CREEM_API_KEY set" || echo "  ⚠ CREEM_API_KEY not set (needed for payment)"
  grep -q "REPLICATE_API_TOKEN" .env.local && echo "  ✓ REPLICATE_API_TOKEN set" || echo "  ⚠ REPLICATE_API_TOKEN not set (needed for image gen)"
else
  echo "  ⚠ .env.local missing - copy from .env.example"
fi

# 5. 尝试构建（最多3分钟）
echo ""
echo "[5/6] 尝试构建（最多3分钟）..."
timeout 180 env -u NODE_OPTIONS npm run build > /tmp/aisticker-build.log 2>&1 && {
  echo "  ✓ Build successful!"
  echo "  Build log: /tmp/aisticker-build.log"
} || {
  echo "  ✗ Build failed or timeout"
  echo "  Check /tmp/aisticker-build.log for details"
  tail -30 /tmp/aisticker-build.log
}

# 6. 启动测试服务器
echo ""
echo "[6/6] 启动开发服务器进行测试..."
echo "  Run: env -u NODE_OPTIONS npm run dev"
echo "  Then visit: http://localhost:3000"

echo ""
echo "========================================="
echo "诊断完成！"
echo "========================================="
echo ""
echo "下一步："
echo "1. 如果构建成功，推送代码到 GitHub"
echo "2. 在 Vercel Dashboard 添加环境变量"
echo "3. 等待 Vercel 自动部署"
echo "4. 测试线上功能：访问、生图、登录、支付"
