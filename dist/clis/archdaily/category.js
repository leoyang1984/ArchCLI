import { cli } from '@jackwener/opencli/registry';

cli({
  site: 'archdaily',
  name: 'category',
  description: '按分类浏览 ArchDaily 建筑项目 (支持简写名，如 cultural, residential)',
  args: [
    { name: 'name', required: true, positional: true, help: '分类名称 (如 residential, cultural, office)' },
    { name: 'limit', type: 'int', default: 20, help: '结果数量' }
  ],
  columns: ['title', 'architect', 'year', 'location', 'url'],
  func: async (page, args) => {
    const isChinese = /[\u4e00-\u9fa5]/.test(args.name);
    const domain = isChinese ? 'www.archdaily.cn' : 'www.archdaily.com';
    
    // 智能映射表：将简写映射为官方 Slug
    const slugMap = {
      // 英文映射
      'cultural': 'cultural-architecture',
      'residential': 'residential-architecture',
      'office': 'office-buildings',
      'educational': 'educational-architecture',
      'houses': 'houses',
      'healthcare': 'healthcare-architecture',
      'industrial': 'industrial-architecture',
      'public': 'public-architecture',
      'commercial': 'commercial-architecture',
      // 中文映射 (archdaily.cn 使用拼音别名)
      '文化': 'wen-hua-jian-zhu',
      '文化建筑': 'wen-hua-jian-zhu',
      '住宅': 'ju-zhu-jian-zhu',
      '居住建筑': 'ju-zhu-jian-zhu',
      '居住': 'ju-zhu-jian-zhu',
      '办公': 'ban-gong-jian-zhu',
      '办公建筑': 'ban-gong-jian-zhu'
    };

    const inputLow = args.name.toLowerCase();
    const slug = slugMap[inputLow] || inputLow;
    
    // 使用最稳定的分类搜索路径
    // EN: /search/projects/categories/{slug}
    // CN: /search/cn/projects/categories/{slug}
    const url = isChinese 
      ? `https://www.archdaily.cn/search/cn/projects/categories/${slug}`
      : `https://www.archdaily.com/search/projects/categories/${slug}`;
    
    await page.goto(url);
    
    // 等待标准结果列表加载
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
          const items = Array.from(document.querySelectorAll('li.afd-search-listview__item, a.gridview__content, .grid-view__item, .afd-search-results > div, .afd-search-listview__list > div'));
          
          for (const el of items) {
            const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
            const href = linkEl?.getAttribute('href');
            if (!href || href.includes('/category/') || href.length < 5) continue;
            
            const fullUrl = href.startsWith('http') ? href : 'https://${domain}' + href;
            if (results.some(r => r.url === fullUrl)) continue;

            const fullText = el.innerText || '';
            const architectMatch = fullText.match(/(Architects|建筑师|建筑设计):\\s*([^|\\n\\r]+)/i);
            const locationMatch = fullText.match(/(Location|地点):\\s*([^|\\n\\r]+)/i);
            const dateMatch = fullText.match(/(\\d+\\s+(weeks|months|years|days|个月|年|周|天)\\s+ago|\\d{4}年\\d{1,2}月\\d{1,2}日|\\d{4}-\\d{2}-\\d{2})/i);

            const linkText = linkEl?.textContent?.trim() || '';
            const titleParts = linkText.split(/\\s*[|/]\\s*/);

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
