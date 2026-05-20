const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, '..', 'src', 'app', 'blog');
const outputPath = path.join(__dirname, '..', 'src', 'app', 'blog', 'blog-list.json');

const posts = [];

if (!fs.existsSync(blogDir)) {
  console.log('Blog directory not found');
  process.exit(0);
}

const entries = fs.readdirSync(blogDir, { withFileTypes: true });

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  
  const pagePath = path.join(blogDir, entry.name, 'page.tsx');
  if (!fs.existsSync(pagePath)) continue;
  
  try {
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    const titleMatch = content.match(/title:\s*["'](.+?)["']/);
    const descMatch = content.match(/description:\s*["'](.+?)["']/);
    
    if (titleMatch && descMatch) {
      let category = 'Guide';
      const slug = entry.name;
      
      if (slug.includes('ideas') || slug.includes('baby') || slug.includes('travel') || slug.includes('food') || slug.includes('music')) {
        category = 'Ideas';
      } else if (slug.includes('kawaii') || slug.includes('aesthetic') || slug.includes('heart')) {
        category = 'Style';
      } else if (slug.includes('sell') || slug.includes('business') || slug.includes('passive-income')) {
        category = 'Business';
      } else if (slug.includes('prompts') || slug.includes('how-to-write')) {
        category = 'Tips';
      } else if (slug.includes('discord') || slug.includes('whatsapp')) {
        category = 'Tutorial';
      } else if (slug.includes('best-free')) {
        category = 'Review';
      }
      
      let date = 'May 17, 2026';
      if (slug === 'ai-aesthetic-sticker-generator-free' || slug === 'music-sticker-ideas-for-whatsapp') {
        date = 'May 12, 2026';
      } else if (['how-to-write-sticker-prompts', 'sell-stickers-on-redbubble', 'sticker-styles-guide', 'discord-whatsapp-stickers', 'ai-sticker-ideas'].includes(slug)) {
        date = 'May 13, 2026';
      } else if (['ai-sticker-generator-free-transparent-png', 'best-free-sticker-maker-online-2026', 'how-to-make-print-ready-stickers-POD', 'transparent-png-sticker-generator-no-watermark', 'sticker-business-passive-income-2026', 'kawaii-sticker-maker-online-free'].includes(slug)) {
        date = 'May 17, 2026';
      } else {
        date = 'May 19, 2026';
      }
      
      posts.push({ 
        slug, 
        title: titleMatch[1], 
        excerpt: descMatch[1], 
        date, 
        category, 
        readTime: '6 min' 
      });
    }
  } catch (e) {
    console.error('Error processing ' + entry.name + ': ' + e.message);
  }
}

posts.sort(function(a, b) {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
});

fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2));
console.log('Generated blog list with ' + posts.length + ' posts');
