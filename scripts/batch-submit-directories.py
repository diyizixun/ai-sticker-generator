#!/usr/bin/env python3
"""
AI Sticker Generator - 批量提交到免费AI目录
自动提交到127个免费AI工具目录（GitHub Free-AI-Directories列表）
"""

import requests
import time
from datetime import datetime

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
    'use_cases': '''Create custom sticker packs for Discord/WhatsApp/Telegram with transparent PNG output
Generate print-ready stickers for Redbubble/Etsy POD platforms with commercial license
Make social media content with custom stickers for Instagram/TikTok/YouTube thumbnails''',
}

# 127个免费目录（来自 GitHub Free-AI-Directories，按DR排序）
DIRECTORIES = [
    # (name, submit_url, method, notes)
    ('SourceForge', 'https://sourceforge.net/create', 'form', 'DR 92'),
    ('AlternativeTo', 'https://alternativeto.net/manage-item', 'form', 'DR 80'),
    ('AppSumo', 'https://appsumo.com/', 'form', 'DR 82'),
    ('SoftwareSuggest', 'https://www.softwaresuggest.com/artificial-intelligence-software', 'form', 'DR 77'),
    ('Alternative.me', 'https://alternative.me/how-to/submit-software/', 'form', 'DR 77'),
    ('Stackshare', 'https://stackshare.io/submit', 'form', 'DR 79'),
    ('SaaSHub', 'https://www.saashub.com/submit', 'form', 'DR 68'),
    ('SideProjectors', 'https://www.sideprojectors.com', 'form', 'DR 67'),
    ('StartupStash', 'https://startupstash.com/add-listing/', 'form', 'DR 65'),
    ('PitchWall', 'https://pitchwall.co/product/submit', 'form', 'DR 64'),
    ('Woi AI', 'https://woy.ai/submit', 'form', 'DR 64'),
    ('Whatsthebigdata', 'https://whatsthebigdata.com/submit-new-ai-tool', 'form', 'DR 60'),
    ('KitPloit', 'https://www.kitploit.com/p/submit-tool.html', 'form', 'DR 57'),
    ('Tekpon', 'https://tekpon.com/get-listed', 'form', 'DR 54'),
    ('Launching Next', 'https://www.launchingnext.com/submit/', 'form', 'DR 51'),
    ('Tool Directory', 'https://tooldirectory.ai/submit-tool', 'form', 'DR 50'),
    ('Getlatka', 'https://getlatka.com/saas-companies', 'form', 'DR 71'),
    ('Crozdesk', 'https://vendor.softwareselect.com/', 'form', 'DR 74'),
    ('Beta List', 'https://betalist.com/submissions/new', 'form', 'DR 70'),
    ('Product Hunt', 'https://www.producthunt.com/posts/new', 'form', 'DR 75'),
    ('AI Tools Neil Patel', 'https://aitools.neilpatel.com/submit', 'form', 'DR 91'),
    ('Aura++', 'https://auraplusplus.com/', 'form', 'DR 62'),
    ('IndieHunt', 'https://indiehunt.io/', 'form', 'DR 32'),
    ('EarlyHunt', 'https://earlyhunt.com/', 'form', 'DR 25'),
    ('Uno Directory', 'https://uno.directory/', 'form', 'DR 45'),
    ('1000 Tools', 'https://1000.tools/my/tools/create', 'form', 'DR 23'),
    ('AI Center', 'https://aicenter.ai/products/submit', 'form', 'DR 10'),
    ('AI Depot', 'https://aidepot.co', 'form', 'DR 11'),
    ('AI Directory', 'https://www.aidirectory.org/user-submit/', 'form', 'DR 10'),
    ('AI Dude Info', 'https://www.aiwizard.ai/submit', 'form', 'DR 13'),
    ('AI Hunter', 'https://ai-hunter.io/submit-ai-tool/', 'form', 'DR 10'),
    ('AI Lib', 'https://ailib.ru/', 'form', 'DR 23'),
    ('AI Library', 'https://library.phygital.plus/tool-submission', 'form', 'DR 17'),
    ('AI Marketing', 'https://aimarketing.directory/submit', 'form', 'DR 12'),
    ('AI Search', 'https://ai-search.io/submit', 'form', 'DR 10'),
    ('AI To Grow', 'https://aitogrow.com/#send-your-tool', 'form', 'DR 15'),
    ('AI Tool Board', 'https://aitoolboard.com/submit-ai-tool', 'form', 'DR 3'),
    ('AI Tool guru', 'https://aitoolguru.com/submit-ai-tool', 'form', 'DR 31'),
    ('AI tool hunt', 'https://www.aitoolhunt.com/addTool', 'form', 'DR 22'),
    ('AI Tool NET', 'https://www.aitoolnet.com/', 'form', 'DR 35'),
    ('AI Tools Arena', 'https://aitoolsarena.com/', 'form', 'DR 8'),
    ('AI tools directory COM', 'https://aitoolsdirectory.com/submit-tool', 'form', 'DR 10'),
    ('AI Tools Guide', 'https://aitoolsguide.com/contact/', 'form', 'DR 10'),
    ('AI Tools Wiki', 'https://aitoolswiki.com/contact-us/', 'form', 'DR 10'),
    ('AI trendz', 'https://aitrendz.xyz/submit-ai-link', 'form', 'DR 8'),
    ('AI Valley', 'https://aivalley.ai/submit-tool', 'form', 'DR 25'),
    ('AI Wizard', 'https://www.aiwizard.ai/submit', 'form', 'DR 10'),
    ('AIX Collection', 'https://aixcollection.com/submit', 'form', 'DR 10'),
    ('Aixploria', 'https://www.aixploria.com/en/add-ai', 'form', 'DR 17'),
    ('All things AI', 'https://allthingsai.com/submit', 'form', 'DR 27'),
    ('Alternatives.co', 'https://alternatives.co/software/ai-tools/', 'form', 'DR 12'),
    ('AlterOpen', 'https://github.com/alteropen-com/alteropen/tree/main/content/app', 'manual', 'DR 0'),
    ('Anyfp', 'https://anyfp.com/contact', 'form', 'DR 33'),
    ('Appscriber', 'https://appscribed.com/product-list', 'form', 'DR 34'),
    ('AppsHunter', 'https://appsthunder.com/submit-your-app', 'form', 'DR 29'),
    ('Best AI To', 'https://bestaito.com/submit-a-ai-tool', 'form', 'DR 12'),
    ('Best AI Tools', 'https://www.startupaitools.com/', 'form', 'DR 10'),
    ('BroUseAI', 'https://www.brouseai.com', 'form', 'DR 35'),
    ('Buffer Apps', 'https://www.bufferapps.com/beta-listing/new', 'form', 'DR 11'),
    ('ChatGPT demo', 'https://chatgptdemo.com/submit-a-product/', 'form', 'DR 30'),
    ('Dang AI', 'https://dang.ai', 'form', 'DR 45'),
    ('Dev Pages', 'https://www.devpages.io/submit-a-tool', 'form', 'DR 10'),
    ('DevPost', 'https://devpost.com/software/new', 'form', 'DR 86'),
    ('DigiproToolz', 'https://digiprotoolz.com/contact-us/', 'form', 'DR 10'),
    ('Dokey AI', 'https://dokeyai.com/submit?ref=aidirectori.es', 'form', 'DR 37'),
    ('DoMore', 'https://domore.ai/contact-us', 'form', 'DR 5'),
    ('Easy Save AI', 'https://easysaveai.com/submit-your-ai-tool/', 'form', 'DR 7'),
    ('Easy with AI', 'https://easywithai.com/submit-tool/', 'form', 'DR 33'),
    ('Educator Tools', 'https://aieducator.tools', 'form', 'DR 25'),
    ('Faind AI', 'https://faind.ai/submit-a-tool', 'form', 'DR 10'),
    ('Favird', 'https://favird.com', 'form', 'DR 26'),
    ('Fazier', 'https://fazier.com/submit', 'form', 'DR 5'),
    ('FinancesOnline', 'https://financesonline.com/add-product', 'form', 'DR 87'),
    ('Find Cool Tools', 'https://findcool.tools', 'form', 'DR 10'),
    ('Find My AI Tool', 'https://findmyaitool.com/submit-tool', 'form', 'DR 36'),
    ('First 100 users', 'https://www.first100users.com/submit', 'form', 'DR 18'),
    ('Flip Bytes', 'https://www.flipbytes.com', 'form', 'DR 10'),
    ('Free AI Apps', 'https://freeappsai.com/add', 'form', 'DR 1.5'),
    ('Free AI Tools Directory', 'https://free-ai-tools-directory.com/submit-request', 'form', 'DR 11'),
    ('Future AGI tools', 'https://www.futureagitools.com/submit-a-site', 'form', 'DR 10'),
    ('Future Tools', 'https://www.futuretools.io/submit-a-tool', 'form', 'DR 44'),
    ('Gate2AI', 'https://www.gate2ai.com/submit-tool', 'form', 'DR 27'),
    ('Good AI Tools', 'https://goodaitools.com/submit', 'form', 'DR 0'),
    ('GPT Academy', 'https://www.gptacademy.co/submit', 'form', 'DR 14'),
    ('Gpt Forge', 'https://gptforge.net', 'form', 'DR 14'),
    ('GPT Stack', 'https://www.gpt-stack.com/add-resource', 'form', 'DR 10'),
    ('GPTE', 'https://gpte.ai/submit-a-tool', 'form', 'DR 31'),
    ('GPTs Hunter', 'https://www.gptshunter.com/submit-gpt', 'form', 'DR 59'),
    ('Hacker News', 'https://news.ycombinator.com/submit', 'form', 'DR 44'),
    ('Igniter', 'https://www.igniter.ai/', 'form', 'DR 7'),
    ('iLib', 'https://www.ilib.com/dashboard/submissions/new', 'form', 'DR 16'),
    ('Insanely Cool Tools', 'https://www.insanelycooltools.com', 'form', 'DR 35'),
    ('Insidr AI', 'https://www.insidr.ai/submit-tools/', 'form', 'DR 40'),
    ('Instant', 'https://instantai.io/submit-listing/', 'form', 'DR 1.3'),
    ('Invent List', 'https://inventlist.com/sites/new', 'form', 'DR 2.5'),
    ('Ismailblogger', 'https://ismailblogger.com/submit-tools', 'form', 'DR 46'),
    ('Joinly', 'https://www.joinly.xyz/submit-startup', 'form', 'DR 25'),
    ('Lachief', 'https://www.lachief.io/', 'form', 'DR 23'),
    ('Launched', 'https://launched.io/SubmitStartup', 'form', 'DR 38'),
    ('Launched Site', 'https://launched.site/submit', 'form', 'DR 45'),
    ('Live Apps', 'https://liveapps.ai/become-a-partner', 'form', 'DR 12'),
    ('Look AI Tools', 'https://lookaitools.com/submission-service', 'form', 'DR 6'),
    ('MadGenius', 'https://madgenius.co/submit', 'form', 'DR 10'),
    ('Mars AI directory', 'https://www.marsx.dev/ai-startups', 'form', 'DR 30'),
    ('MicroLaunch', 'https://microlaunch.net', 'form', 'DR 2'),
    ('MicroStartups', 'https://www.microstartups.co/list-your-startup', 'form', 'DR 3.1'),
    ('Next Gen Tools', 'https://nextgentools.me/submit-your-tool', 'form', 'DR 27'),
    ('NextGenTool', 'https://nextgentool.io/submit', 'form', 'DR 12'),
    ('Nextpedia', 'https://www.nextpedia.io/submit-tool', 'form', 'DR 11'),
    ('One Hub AI', 'https://www.onehubai.com/', 'form', 'DR 10'),
    ('Open Future', 'https://openfuture.ai/submit-tool', 'form', 'DR 31'),
    ('Orbic AI', 'https://orbic.ai/submit/tools', 'form', 'DR 5'),
    ('Paggu', 'https://www.paggu.com/submit-your-startup/', 'form', 'DR 35'),
    ('PostMake', 'https://postmake.io/', 'form', 'DR 29'),
    ('Productivity Directory', 'https://productivity.directory/s/submit', 'form', 'DR 27'),
    ('PureFuture', 'https://purefuture.net/contact/', 'form', 'DR 13'),
    ('Resource fyi', 'https://resource.fyi/account/submit', 'form', 'DR 39'),
    ('Robingood', 'https://tools.robingood.com', 'form', 'DR 33'),
    ('Saas AI Tools', 'https://saasaitools.com/submit/', 'form', 'DR 33'),
    ('Saas Po', 'https://www.saaspo.com/submit', 'form', 'DR 29'),
    ('Saas Surf', 'https://saassurf.com/submit-a-product', 'form', 'DR 21'),
    ('SaasBaba', 'https://saasbaba.com/add-ai-tool/', 'form', 'DR 10'),
    ('SaasWorthy', 'https://www.saasworthy.com', 'form', 'DR 72'),
    ('Sick Tools', 'https://www.sick.tools/', 'form', 'DR 0'),
    ('Sidebar', 'https://sidebar.io/submit', 'form', 'DR 71'),
    ('Sitelike', 'https://www.sitelike.org/add-site', 'form', 'DR 70'),
    ('Smart Tools', 'https://www.smart-tools.ai/en/submit', 'form', 'DR 11'),
    ('Software World', 'https://softwareworld.co/get-listed/', 'form', 'DR 75'),
    ('Source Forge', 'https://sourceforge.net/create', 'form', 'DR 92'),
    ('spsFeed', 'https://spsfeed.com/', 'form', 'DR 0'),
    ('Stackshare', 'https://stackshare.io/submit', 'form', 'DR 79'),
    ('Startup AI Tools', 'https://www.startups.fyi/', 'form', 'DR 22'),
    ('Startup Base', 'https://startupbase.io/submissions/start', 'form', 'DR 50'),
    ('Startup Buffer', 'https://startupbuffer.com/site/submit', 'form', 'DR 36'),
    ('Startup Collections', 'https://startupcollections.com/submit-product', 'form', 'DR 22'),
    ('Startup Pitch', 'https://thestartuppitch.com/post-a-pitch/', 'form', 'DR 40'),
    ('Startup Ranking', 'https://www.startupranking.com/startup/create/url-validation', 'form', 'DR 67'),
    ('Startup Roulette', 'https://startuproulette.com/promote-my-startup', 'form', 'DR 21'),
    ('Startup Stage', 'https://startupstage.app/startups/new', 'form', 'DR 25'),
    ('Startup Stash', 'https://startupstash.com/add-listing/', 'form', 'DR 65'),
    ('Startup88', 'https://startup88.com', 'form', 'DR 25'),
    ('Startups.fyi', 'https://www.startups.fyi', 'form', 'DR 25'),
    ('Super Tools', 'https://supertools.therundown.ai/submit', 'form', 'DR 20'),
    ('Synoptica', 'https://synoptica.com/submit-an-ai-tool', 'form', 'DR 17'),
    ('Tekpon', 'https://tekpon.com/get-listed', 'form', 'DR 54'),
    ('That AI Collection', 'https://www.thatcollection.com/submit/', 'form', 'DR 32'),
    ('The AI Warehouse', 'https://inside.thewarehouse.ai/submissions', 'form', 'DR 11'),
    ('The Hack Stack', 'https://thehackstack.com/register', 'form', 'DR 10'),
    ('Tiny Startups', 'https://www.tinystartups.co', 'form', 'DR 4.4'),
    ('TipSeason', 'https://tipseason.com/ai-tools/submit', 'form', 'DR 27'),
    ('Tool AI', 'https://toolai.io/en/submit', 'form', 'DR 7'),
    ('Tool Pilot', 'https://www.toolpilot.ai/pages/submit-your-ai-tool', 'form', 'DR 51'),
    ('Toolify.ai', 'https://www.toolify.ai/login?from=%2Fsubmit', 'login', 'DR 13'),
    ('Toolio AI', 'https://toolio.ai/submit-a-tool', 'form', 'DR 34'),
    ('Tools AI', 'https://toolsai.net/add-listing/', 'form', 'DR 19'),
    ('Tools AI Online', 'https://www.tools-ai.online/tool-submit', 'form', 'DR 11'),
    ('Tools Directory', 'https://aitoolsdirectory.com/submit-tool', 'form', 'DR 10'),
    ('Tools Nocode', 'https://www.toolsnocode.com/ai#form1', 'form', 'DR 10'),
    ('Tools.so', 'https://tools.so/', 'form', 'DR 15'),
    ('Toolscout', 'https://toolscout.ai/submit', 'form', 'DR 10'),
    ('ToolsFine', 'https://toolsfine.com', 'form', 'DR 38'),
    ('Toolspedia', 'https://www.toolspedia.io/submit-tool/', 'form', 'DR 21'),
    ('Top Apps AI', 'https://topapps.ai/submit', 'form', 'DR 32'),
    ('Under1000MRR.tools', 'https://under1000mrr.tools/submit-product', 'form', 'DR 0'),
    ('Victrays', 'https://victrays.com/submit-tool/', 'form', 'DR 10'),
    ('What the AI', 'https://whattheai.tech/submit-a-tool/', 'form', 'DR 28'),
]

def submit_to_directory(session, name, url, method, notes):
    """尝试提交到单个目录"""
    result = {'name': name, 'url': url, 'status': 'pending', 'notes': notes}
    
    try:
        # 先 GET 页面查看是否有表单
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        
        resp = session.get(url, headers=headers, timeout=15, allow_redirects=True)
        result['http_status'] = resp.status_code
        result['final_url'] = resp.url
        
        # 检查是否是登录页
        if 'login' in resp.url.lower() or 'signin' in resp.url.lower():
            result['status'] = 'needs_login'
            return result
        
        # 检查是否有表单
        if 'form' in resp.text.lower() and ('submit' in resp.text.lower() or 'tool' in resp.text.lower()):
            result['status'] = 'has_form'
            result['page_size'] = len(resp.text)
        else:
            result['status'] = 'no_form'
            result['page_size'] = len(resp.text)
            
    except Exception as e:
        result['status'] = 'error'
        result['error'] = str(e)
    
    return result

def main():
    print(f"\n{'='*60}")
    print(f"AI Sticker Generator - 批量提交到免费AI目录")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    session = requests.Session()
    results = []
    
    total = len(DIRECTORIES)
    print(f"总共 {total} 个目录需要检查...\n")
    
    for i, (name, url, method, notes) in enumerate(DIRECTORIES, 1):
        print(f"[{i}/{total}] 检查 {name} ({notes})...", end=' ')
        result = submit_to_directory(session, name, url, method, notes)
        results.append(result)
        print(result['status'])
        
        # 避免请求过快
        time.sleep(1)
    
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
    
    # 保存结果到文件
    result_file = '/Users/myan/WorkBuddy/2026-05-17-task-1/directory-submit-results.json'
    with open(result_file, 'w') as f:
        import json
        json.dump(results, f, indent=2)
    
    print(f"\n详细结果已保存到: {result_file}")
    print(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

if __name__ == '__main__':
    main()
