import { cli } from '@jackwener/opencli/registry';

cli({
  site: 'archdaily',
  name: 'search',
  description: '搜索 ArchDaily 建筑项目 (支持中英双站)',
  args: [
    { name: 'query', required: true, positional: true, help: '搜索关键词' },
    { name: 'limit', type: 'int', default: 20, help: '结果数量' }
  ],
  columns: ['title', 'architect', 'year', 'location', 'url'],
  func: async (page, args) => {
    // 智能切换站点
    const isChinese = /[\u4e00-\u9fa5]/.test(args.query);
    const domain = isChinese ? 'www.archdaily.cn' : 'www.archdaily.com';
    const url = `https://${domain}/search/projects?q=${encodeURIComponent(args.query)}`;
    
    await page.goto(url);
    
    // 等待页面加载：兼容多种可能的容器和项目类名
    await page.wait({ selector: '.afd-search-listview__item, .gridview__content, .grid-view__item, .afd-search-results', timeout: 10 });

    const limit = args.limit || 20;

    const data = await page.evaluate(`
      (async () => {
        const limit = ${limit};
        const results = [];
        let lastHeight = 0;

        try {
          const cookieBtn = document.querySelector('#onetrust-accept-btn-handler, .accept-cookie-btn');
          if (cookieBtn) cookieBtn.click();
        } catch (e) {}

        while (results.length < limit) {
          // 获取所有潜在的项目节点
          const items = Array.from(document.querySelectorAll('li.afd-search-listview__item, a.gridview__content, .grid-view__item, .afd-search-results > div, .afd-search-listview__list > div'));
          
          for (const el of items) {
            // 核心修复：如果节点本身就是 A 标签，直接取 Href
            const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
            const href = linkEl?.getAttribute('href');
            
            if (!href || href.includes('/search/') || href.length < 5) continue;
            
            const fullUrl = href.startsWith('http') ? href : 'https://${domain}' + href;
            if (results.some(r => r.url === fullUrl)) continue;

            const fullText = el.innerText || '';
            const architectMatch = fullText.match(/(Architects|建筑师|建筑设计):\\s*([^|\\n\\r]+)/i);
            const locationMatch = fullText.match(/(Location|地点):\\s*([^|\\n\\r]+)/i);
            const dateMatch = fullText.match(/(\\d+\\s+(weeks|months|years|days|个月|年|周|天)\\s+ago|\\d{4}年\\d{1,2}月\\d{1,2}日|\\d{4}-\\d{2}-\\d{2})/i);

            const linkText = linkEl?.textContent?.trim() || '';
            const titleParts = linkText.split(' / ');

            results.push({
              title: titleParts[0] || 'Unknown Project',
              url: fullUrl,
              architect: architectMatch ? architectMatch[2].trim() : (titleParts[1] || 'Unknown'),
              location: locationMatch ? locationMatch[2].trim() : 'Unknown',
              year: dateMatch ? dateMatch[1].trim() : 'Unknown'
            });

            if (results.length >= limit) break;
          }

          if (results.length >= limit) break;

          window.scrollBy(0, window.innerHeight * 2);
          await new Promise(r => setTimeout(r, 2000));
          
          const currentHeight = document.body.scrollHeight;
          if (currentHeight === lastHeight) break;
          lastHeight = currentHeight;
        }

        return results.slice(0, limit);
      })()
    `);

    return Array.isArray(data) ? data : [];
  }
});
