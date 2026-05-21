#!/usr/bin/env python3
"""
AI Sticker Generator - 自动博客生成脚本
每天自动生成2-3篇SEO优化博客文章，并提交到GitHub触发Vercel部署
"""

import os
import re
import json
from datetime import datetime
import subprocess

# 配置
BLOG_DIR = "/Users/myan/WorkBuddy/2026-05-17-task-1/src/app/blog"
GIT_DIR = "/Users/myan/WorkBuddy/2026-05-17-task-1"

# 长尾关键词模板（KGR 0.3-0.5）
KEYWORD_TEMPLATES = [
    "{noun} sticker maker online free",
    "ai {noun} sticker generator free",
    "transparent png {noun} sticker no watermark",
    "how to make {noun} stickers for discord",
    "best {noun} sticker app 2026",
    "print ready {noun} stickers POD",
    "{noun} sticker ideas for whatsapp",
    "kawaii {noun} sticker generator ai",
]

# 名词列表（覆盖热门类别）
NOUNS = [
    "cat", "dog", "anime", "cute", "funny", "love", "aesthetic", 
    "gaming", "sports", "food", "travel", "music", "art", "nature",
    "flower", "heart", "star", "baby", "emoji", "meme", "quotes"
]

def generate_slug(keyword):
    """生成URL友好的slug"""
    return keyword.lower().replace(" ", "-").replace("'", "").replace('"', "")

def generate_blog_content(keyword, noun):
    """生成博客文章内容（TSX格式）"""
    title = f"{keyword.title()} - AI Powered Sticker Maker"
    h1 = f"AI {noun.title()} Sticker Generator"
    description = f"Generate {noun} stickers with AI. Create unique {noun} sticker designs in seconds. Free online tool, no signup required."
    
    # TSX组件代码 - 使用 Python f-string 正确替换
    tsx_code = f'''import {{ Metadata }} from "next";

export const metadata: Metadata = {{
  title: "{title}",
  description: "{description}",
  keywords: ["{keyword}", "ai {noun} sticker", "{noun} sticker generator", "{noun} sticker maker"],
}};

export default function Page() {{
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">{h1}</h1>
      
      <div className="prose prose-lg max-w-none">
        <p className="text-xl text-gray-600 mb-8">
          {description}
        </p>
        
        <div className="bg-purple-50 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Generate Your {noun.title()} Stickers Now</h2>
          <p className="mb-6">Use our AI-powered sticker generator to create unique {noun} stickers in seconds.</p>
          <a 
            href="/"
            className="inline-block bg-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
          >
            Start Creating Free
          </a>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4">Why Use Our AI {noun.title()} Sticker Generator?</h2>
        <ul className="space-y-3 mb-8">
          <li>✅ 100% Free - No credit card required</li>
          <li>✅ Transparent PNG output - Perfect for stickers</li>
          <li>✅ Multiple styles - Cute, Cartoon, Pixel Art, Realistic</li>
          <li>✅ Print-ready 300DPI - Use for POD platforms</li>
          <li>✅ No watermark - Clean output</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mb-4">Popular {noun.title()} Sticker Ideas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="border rounded-lg p-4">Cute {noun} with big eyes</div>
          <div className="border rounded-lg p-4">Cartoon {noun} doing sports</div>
          <div className="border rounded-lg p-4">Kawaii {noun} eating food</div>
          <div className="border rounded-lg p-4">Pixel art {noun} character</div>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4">How to Create {noun.title()} Stickers</h2>
        <ol className="space-y-4 mb-8">
          <li><strong>1. Describe your sticker</strong> - Type what you want (e.g., "cute {noun} with sunglasses")</li>
          <li><strong>2. Choose a style</strong> - Pick from Cute, Cartoon, Pixel Art, or Realistic</li>
          <li><strong>3. Generate</strong> - Our AI creates your sticker in seconds</li>
          <li><strong>4. Download</strong> - Get transparent PNG, ready to use!</li>
        </ol>
      </div>
    </div>
  );
}}
'''
    return tsx_code

def generate_blog_post():
    """生成一篇博客文章"""
    import random
    noun = random.choice(NOUNS)
    template = random.choice(KEYWORD_TEMPLATES)
    keyword = template.format(noun=noun)
    
    slug = generate_slug(keyword)
    content = generate_blog_content(keyword, noun)
    
    # 创建目录和文件
    dir_path = os.path.join(BLOG_DIR, slug)
    os.makedirs(dir_path, exist_ok=True)
    
    file_path = os.path.join(dir_path, "page.tsx")
    
    # 检查是否已存在
    if os.path.exists(file_path):
        print(f"Skipping existing: {slug}")
        return None
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"Generated: {slug}")
    return slug

def git_commit_and_push():
    """提交并推送到GitHub"""
    os.chdir(GIT_DIR)
    
    # 添加所有更改
    subprocess.run(["/usr/bin/git", "add", "src/app/blog/"], check=True)
    
    # 检查是否有更改
    result = subprocess.run(["/usr/bin/git", "status", "--short"], capture_output=True, text=True)
    if not result.stdout.strip():
        print("No changes to commit")
        return False
    
    # 提交
    date_str = datetime.now().strftime("%Y-%m-%d")
    commit_msg = f"blog: auto-generate SEO articles {date_str}"
    subprocess.run(["/usr/bin/git", "commit", "-m", commit_msg], check=True)
    
    # 推送（remote URL 已配置 token，直接 push）
    subprocess.run(["/usr/bin/git", "push", "origin", "main"], check=True)
    
    print(f"Successfully pushed to GitHub: {commit_msg}")
    return True

def main():
    """主函数：生成2-3篇博客文章"""
    print(f"=== AI Sticker Blog Auto-Generator {datetime.now()} ===")
    
    generated = []
    for i in range(3):  # 生成3篇
        slug = generate_blog_post()
        if slug:
            generated.append(slug)
    
    if generated:
        print(f"\nGenerated {len(generated)} new articles: {', '.join(generated)}")
        try:
            git_commit_and_push()
        except subprocess.CalledProcessError as e:
            print(f"Git error: {e}")
    else:
        print("No new articles generated (all topics exist)")

if __name__ == "__main__":
    main()
