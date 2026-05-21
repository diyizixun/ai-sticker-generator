#!/usr/bin/env python3
"""
批量提交到所有107个有表单的AI目录
"""

import requests
import time
import json
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urljoin

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

# 所有有表单的目录（从directory-submit-results.json中筛选）
def load_directories_with_forms():
    """加载有表单的目录列表"""
    try:
        with open('/Users/myan/WorkBuddy/2026-05-17-task-1/directory-submit-results.json', 'r') as f:
            results = json.load(f)
        return [(r['name'], r['url'], r['notes']) for r in results if r['status'] == 'has_form']
    except:
        return []

def find_form_and_submit(session, url, tool_data, headers):
    """查找表单并提交"""
    try:
        resp = session.get(url, headers=headers, timeout=15, allow_redirects=True)
        if resp.status_code != 200:
            return {'status': f'http_{resp.status_code}', 'url': url}
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        forms = soup.find_all('form')
        
        if not forms:
            return {'status': 'no_form', 'url': url}
        
        # 找最可能是提交表单的
        best_form = None
        for form in forms:
            inputs = form.find_all(['input', 'textarea', 'select'])
            if len(inputs) >= 3:  # 至少3个字段
                best_form = form
                break
        
        if not best_form:
            best_form = forms[0]
        
        # 构建表单数据
        form_data = {}
        for inp in best_form.find_all(['input', 'textarea', 'select']):
            name = inp.get('name') or inp.get('id')
            if not name:
                continue
            
            input_type = inp.get('type', 'text').lower()
            field_lower = name.lower()
            
            # 跳过按钮和隐藏字段（除非是必需的）
            if input_type in ['submit', 'button', 'reset']:
                continue
            
            # 跳过CSRF令牌等
            if any(k in field_lower for k in ['csrf', 'token', '_wpnonce', 'nonce']):
                continue
            
            # 映射字段
            if any(k in field_lower for k in ['url', 'website', 'link', 'site']):
                form_data[name] = tool_data['url']
            elif any(k in field_lower for k in ['name', 'title', 'product', 'tool']):
                form_data[name] = tool_data['name']
            elif any(k in field_lower for k in ['desc', 'summary', 'about', 'detail', 'content']):
                form_data[name] = tool_data['description']
            elif any(k in field_lower for k in ['email', 'mail']):
                form_data[name] = tool_data['email']
            elif any(k in field_lower for k in ['category', 'cat']):
                form_data[name] = tool_data['category']
            elif any(k in field_lower for k in ['tag', 'keyword']):
                form_data[name] = tool_data['tags']
            elif any(k in field_lower for k in ['price', 'pricing', 'cost']):
                form_data[name] = tool_data['pricing']
            elif input_type == 'text' and not form_data:
                # 默认填充name
                form_data[name] = tool_data['name']
        
        if not form_data:
            return {'status': 'no_matching_fields', 'url': url}
        
        # 获取提交URL
        action = best_form.get('action', '')
        submit_url = url
        if action:
            submit_url = urljoin(url, action)
        
        # 提交表单
        post_headers = headers.copy()
        post_headers['Content-Type'] = 'application/x-www-form-urlencoded'
        
        submit_resp = session.post(submit_url, data=form_data, headers=post_headers, timeout=15, allow_redirects=True)
        
        if submit_resp.status_code in [200, 302, 201, 204]:
            return {
                'status': 'submitted',
                'url': url,
                'submit_url': submit_url,
                'fields_count': len(form_data),
                'response_status': submit_resp.status_code
            }
        else:
            return {
                'status': f'post_failed_{submit_resp.status_code}',
                'url': url,
                'submit_url': submit_url
            }
    
    except Exception as e:
        return {'status': 'error', 'url': url, 'error': str(e)[:100]}

def main():
    print(f"\n{'='*60}")
    print(f"批量提交到所有有表单的AI目录")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    # 加载目录
    directories = load_directories_with_forms()
    print(f"找到 {len(directories)} 个有表单的目录\n")
    
    if not directories:
        print("没有找到可提交的目录，请先运行 batch-submit-directories.py")
        return
    
    session = requests.Session()
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
    
    results = []
    submitted = 0
    failed = 0
    
    for i, (name, url, notes) in enumerate(directories, 1):
        print(f"[{i}/{len(directories)}] {name:30} ({notes:10})", end=' ')
        
        result = find_form_and_submit(session, url, TOOL_DATA, headers)
        result['name'] = name
        result['notes'] = notes
        result['timestamp'] = datetime.now().isoformat()
        results.append(result)
        
        if result['status'] == 'submitted':
            submitted += 1
            print(f"✓ 提交成功 (字段:{result.get('fields_count', 0)})")
        else:
            failed += 1
            print(f"✗ {result['status']}")
        
        # 避免请求过快
        time.sleep(2)
    
    # 统计结果
    print(f"\n{'='*60}")
    print(f"提交完成!")
    print(f"{'='*60}")
    print(f"成功: {submitted} 个")
    print(f"失败: {failed} 个")
    print(f"总计: {len(results)} 个")
    
    # 保存结果
    result_file = '/Users/myan/WorkBuddy/2026-05-17-task-1/batch-submission-results.json'
    with open(result_file, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n详细结果已保存到: {result_file}")
    print(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # 列出成功提交的
    if submitted > 0:
        print(f"\n✅ 成功提交的目录:")
        for r in results:
            if r['status'] == 'submitted':
                print(f"  - {r['name']:30} {r['notes']}")

if __name__ == '__main__':
    main()
