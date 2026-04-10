import { cli } from '@jackwener/opencli/registry';

cli({
  site: 'gooood',
  name: 'search',
  description: '搜索谷德 (gooood) 建筑设计项目',
  args: [
    { name: 'query', required: true, positional: true, help: '搜索关键词' },
    { name: 'limit', type: 'int', default: 20, help: '结果数量' }
  ],
  columns: ['title', 'architect', 'location', 'date', 'url'],
  func: async (page, args) => {
    // 核心修复：改用专用的搜索后缀页面，避免与首页混淆
    const url = `https://www.gooood.cn/search/${encodeURIComponent(args.query)}.htm`;
    await page.goto(url);
    
    // 等待搜索结果列表加载
    await page.wait({ selector: '.post-item, .item-content', timeout: 10 });

    const limit = args.limit || 20;

    const data = await page.evaluate(`
      (async () => {
        const limit = ${limit};
        const results = [];
        
        while (results.length < limit) {
          const items = Array.from(document.querySelectorAll('.post-item, .item-content'));
          
          for (const el of items) {
            const linkEl = el.querySelector('h2 a, .cover-link, a');
            const href = linkEl?.getAttribute('href');
            if (!href || href.includes('javascript') || results.some(r => r.url === href)) continue;

            const fullUrl = href.startsWith('http') ? href : 'https://www.gooood.cn' + href;
            const fullTitle = (el.querySelector('h2, .post-title')?.textContent || '').trim();
            const dateText = (el.querySelector('.post-date, .time')?.textContent || '').trim();

            if (!fullTitle) continue;

            let title = fullTitle;
            let location = 'Unknown';
            let architect = 'Unknown';

            const partsA = fullTitle.match(/^(.*?)\\s*[，,]\\s*(.*?)\\s*[/]\\s*(.*)$/);
            const partsB = fullTitle.match(/^(.*?)\\s+by\\s+(.*)$/i);

            if (partsA) {
              title = partsA[1].trim();
              location = partsA[2].trim();
              architect = partsA[3].trim();
            } else if (partsB) {
              title = partsB[1].trim();
              architect = partsB[2].trim();
            }
            
            results.push({
              title: title,
              location: location,
              architect: architect,
              date: dateText,
              url: fullUrl
            });

            if (results.length >= limit) break;
          }

          if (results.length >= limit) break;

          const nextBtn = document.querySelector('a.next.page-numbers');
          if (nextBtn) {
            nextBtn.click();
            await new Promise(r => setTimeout(r, 2500));
          } else {
            break;
          }
        }

        return results.slice(0, limit);
      })()
    `);

    return Array.isArray(data) ? data : [];
  }
});
