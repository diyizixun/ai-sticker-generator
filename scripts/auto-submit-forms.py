#!/usr/bin/env python3
"""
AI Sticker Generator - 真正自动提交到AI目录
自动填充表单并提交，生成提交报告
"""

import requests
import time
from datetime import datetime
import re
from bs4 import BeautifulSoup

# 通用提交数据
TOOL_DATA = {
    'name': 'AI Sticker Generator',
    'url': 'https://aisticker.pics',
    'title': 'AI Sticker Generator - Create Custom Stickers with AI for Free',
    'description': 'Generate unique, print-ready stickers with AI in seconds. Create transparent PNG stickers from text descriptions. 6 artistic styles including cute, cartoon, pixel art & realistic. Free to use, perfect for Discord, WhatsApp, Telegram & print-on-demand.',
    'short_description': 'Create custom stickers with AI. Transparent PNG output, 6 styles, free tier + Pro $9.9/mo.',
    'category': 'AI Image Generation',
    'tags': 'ai sticker generator, ai sticker maker, sticker design tool',
    'pricing': 'Freemium: Free (3/day) + Pro ($9.9/month)',
    'email': 'heroinyan@gmail.com',
}

# 高优先级的目录（DR 50+，且检测到有表单）
HIGH_PRIORITY = [
    ('AppSumo', 'https://appsumo.com/', 'DR 82'),
    ('SoftwareSuggest', 'https://www.softwaresuggest.com/artificial-intelligence-software', 'DR 77'),
    ('Alternative.me', 'https://alternative.me/how-to/submit-software/', 'DR 77'),
    ('SaaSHub', 'https://www.saashub.com/submit', 'DR 68'),
    ('StartupStash', 'https://startupstash.com/add-listing/', 'DR 65'),
    ('Whatsthebigdata', 'https://whatsthebigdata.com/submit-new-ai-tool', 'DR 60'),
    ('Aura++', 'https://auraplusplus.com/', 'DR 62'),
    ('Tekpon', 'https://tekpon.com/get-listed', 'DR 54'),
    ('Launching Next', 'https://www.launchingnext.com/submit/', 'DR 51'),
    ('Tool Directory', 'https://tooldirectory.ai/submit-tool', 'DR 50'),
    ('Getlatka', 'https://getlatka.com/saas-companies', 'DR 71'),
    ('AI Tools Neil Patel', 'https://aitools.neilpatel.com/submit', 'DR 91'),
]

def find_form_fields(html):
    """分析HTML找出表单字段"""
    soup = BeautifulSoup(html, 'html.parser')
    forms = soup.find_all('form')
    
    if not forms:
        return None
    
    # 找到最可能的提交表单（字段最多的）
    best_form = max(forms, key=lambda f: len(f.find_all(['input', 'textarea'])))
    
    fields = {}
    for inp in best_form.find_all(['input', 'textarea', 'select']):
        name = inp.get('name') or inp.get('id')
        if name:
            fields[name] = inp.get('type', 'text')
    
    return fields

def map_tool_data_to_fields(fields):
    """将工具数据映射到表单字段"""
    mapping = {}
    
    for field_name, field_type in fields.items():
        field_lower = field_name.lower()
        
        # URL字段
        if any(k in field_lower for k in ['url', 'website', 'link', 'site']):
            mapping[field_name] = TOOL_DATA['url']
        
        # 名称字段
        elif any(k in field_lower for k in ['name', 'title', 'product']):
            mapping[field_name] = TOOL_DATA['name']
        
        # 描述字段
        elif any(k in field_lower for k in ['desc', 'summary', 'about', 'detail']):
            mapping[field_name] = TOOL_DATA['description']
        
        # 分类字段
        elif any(k in field_lower for k in ['category', 'cat', 'type']):
            mapping[field_name] = TOOL_DATA['category']
        
        # 标签字段
        elif any(k in field_lower for k in ['tag', 'keyword']):
            mapping[field_name] = TOOL_DATA['tags']
        
        # 价格字段
        elif any(k in field_lower for k in ['price', 'pricing', 'cost']):
            mapping[field_name] = TOOL_DATA['pricing']
        
        # 邮箱字段
        elif any(k in field_lower for k in ['email', 'mail']):
            mapping[field_name] = TOOL_DATA['email']
    
    return mapping

def submit_to_directory(session, name, url, notes):
    """尝试提交到单个目录"""
    result = {
        'name': name,
        'url': url,
        'notes': notes,
        'status': 'pending',
        'timestamp': datetime.now().isoformat(),
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Content-Type': 'application/x-www-form-urlencoded',
    }
    
    try:
        # 1. GET页面，分析表单
        print(f"  → 获取页面...", end=' ')
        resp = session.get(url, headers=headers, timeout=15, allow_redirects=True)
        
        if resp.status_code != 200:
            result['status'] = f'http_{resp.status_code}'
            print(result['status'])
            return result
        
        # 检查是否需要登录
        if 'login' in resp.url.lower() or 'signin' in resp.url.lower():
            result['status'] = 'needs_login'
            print(result['status'])
            return result
        
        # 分析表单
        fields = find_form_fields(resp.text)
        if not fields:
            result['status'] = 'no_form_found'
            print(result['status'])
            return result
        
        print(f"找到{len(fields)}个字段...", end=' ')
        
        # 映射数据到字段
        form_data = map_tool_data_to_fields(fields)
        
        if not form_data:
            result['status'] = 'no_matching_fields'
            print(result['status'])
            return result
        
        # 找到表单的action URL
        soup = BeautifulSoup(resp.text, 'html.parser')
        form = soup.find('form')
        action = form.get('action', '')
        
        submit_url = url
        if action:
            if action.startswith('http'):
                submit_url = action
            elif action.startswith('/'):
                from urllib.parse import urljoin
                submit_url = urljoin(url, action)
            else:
                submit_url = urljoin(url, action)
        
        # 2. POST提交表单
        print(f"提交中...", end=' ')
        submit_resp = session.post(submit_url, data=form_data, headers=headers, timeout=15, allow_redirects=True)
        
        # 检查结果
        if submit_resp.status_code in [200, 302, 201]:
            result['status'] = 'submitted'
            result['submit_url'] = submit_url
            result['fields_submitted'] = list(form_data.keys())
            print('✓ 提交成功')
        else:
            result['status'] = f'post_failed_{submit_resp.status_code}'
            print(result['status'])
        
    except Exception as e:
        result['status'] = 'error'
        result['error'] = str(e)[:100]
        print(f'错误: {str(e)[:50]}')
    
    return result

def main():
    print(f"\n{'='*60}")
    print(f"AI Sticker Generator - 自动提交到AI目录")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    session = requests.Session()
    results = []
    
    print(f"优先提交 {len(HIGH_PRIORITY)} 个高DR目录（DR 50+）\n")
    
    for i, (name, url, notes) in enumerate(HIGH_PRIORITY, 1):
        print(f"[{i}/{len(HIGH_PRIORITY)}] {name} ({notes})")
        result = submit_to_directory(session, name, url, notes)
        results.append(result)
        
        # 避免请求过快
        time.sleep(3)
    
    # 统计结果
    print(f"\n{'='*60}")
    print("提交结果统计:")
    print(f"{'='*60}")
    
    status_count = {}
    for r in results:
        status = r['status']
        status_count[status] = status_count.get(status, 0) + 1
    
    for status, count in sorted(status_count.items()):
        print(f"  {status}: {count} 个")
    
    # 保存结果
    result_file = '/Users/myan/WorkBuddy/2026-05-17-task-1/submission-results.json'
    import json
    with open(result_file, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n详细结果已保存到: {result_file}")
    print(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # 输出成功提交的目录
    submitted = [r for r in results if r['status'] == 'submitted']
    if submitted:
        print(f"\n✅ 成功提交 {len(submitted)} 个目录:")
        for r in submitted:
            print(f"  - {r['name']} ({r['notes']})")
    
    return results

if __name__ == '__main__':
    main()
