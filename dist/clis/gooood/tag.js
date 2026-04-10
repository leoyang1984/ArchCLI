import { cli } from '@jackwener/opencli/registry';

cli({
  site: 'gooood',
  name: 'tag',
  description: '按专业维度 (类型、材料、国家) 筛选谷德项目',
  args: [
    { name: 'name', required: true, positional: true, help: '标签/标识词 (如 office, 住宅, concrete, renovation)' },
    { name: 'limit', type: 'int', default: 20, help: '结果数量' }
  ],
  columns: ['title', 'architect', 'date', 'url'],
  func: async (page, args) => {
    const typeSlugs = {
      'office': 'office-building',
      '办公': 'office-building',
      '建筑': 'architecture',
      '文化': 'cultural-architecture',
      'cultural': 'cultural-architecture',
      '住宅': 'residential-building',
      'residential': 'residential-building',
      '教育': 'school-and-university',
      'hotel': 'hotel-architecture',
      '酒店': 'hotel-architecture',
      '改造': 'renovation',
      'renovation': 'renovation',
      'landscape': 'landscape-architecture',
      '景观': 'landscape-architecture',
      'interior': 'interior-design',
      '室内': 'interior-design'
    };

    const materialSlugs = {
      'concrete': 'concrete',
      '混凝土': 'concrete',
      'wood': 'wood',
      '木材': 'wood',
      'clt': 'cross-laminated-timber',
      'bamboo': 'bamboo',
      '竹': 'bamboo',
      '竹建筑': 'bamboo'
    };

    const input = args.name.toLowerCase();
    const limit = args.limit || 20;

    let slug = input;
    let filterType = 'type';
    if (typeSlugs[input]) {
      slug = typeSlugs[input];
    } else if (materialSlugs[input]) {
      slug = materialSlugs[input];
      filterType = 'material';
    }

    let results = [];
    let currentPage = 1;

    while (results.length < limit && currentPage <= 5) {
      const pageSuffix = currentPage > 1 ? `/page/${currentPage}` : '';
      let url = (filterType === 'type')
        ? `https://www.gooood.cn/filter/type/${slug}/country/all/material/all/office/all${pageSuffix}`
        : `https://www.gooood.cn/filter/type/all/country/all/material/${slug}/office/all${pageSuffix}`;

      await page.goto(url);
      
      try {
        await page.wait({ selector: 'a.cover-link', timeout: 15 });
        // 稍微等待 AJAX 渲染完成
        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        if (currentPage === 1) break; 
      }

      // 核心修复 3：权重式抓取算法，解决多重链接导致的标题丢失问题
      const pageData = await page.evaluate(`
        (() => {
          const links = Array.from(document.querySelectorAll('a.cover-link, .cover-item a'));
          const linkMap = {}; 

          for (const a of links) {
            const href = a.getAttribute('href');
            if (!href || href.includes('javascript')) continue;
            
            const fullUrl = href.startsWith('http') ? href : 'https://www.gooood.cn' + href;
            const text = (a.innerText || a.getAttribute('title') || '').trim();

            // 如果该 URL 尚未记录，或者当前链接带有更长的文本说明（通常是标题链接），则更新它
            if (!linkMap[fullUrl] || text.length > linkMap[fullUrl].rawTitle.length) {
              let title = text;
              let architect = 'Unknown';

              const parts = text.match(/^(.*?)\\s*[，,/]\\s*(.*)$/);
              if (parts) {
                title = parts[1].trim();
                architect = parts[2].trim();
              } else if (text.toLowerCase().includes(' by ')) {
                const byParts = text.split(/\\s+by\\s+/i);
                title = byParts[0].trim();
                architect = byParts[1].trim();
              }

              linkMap[fullUrl] = {
                title: title || 'Unknown Project',
                rawTitle: text,
                architect: architect,
                date: 'Recent',
                url: fullUrl
              };
            }
          }
          // 过滤掉完全没抓到标题的噪音并返回
          return Object.values(linkMap).filter(item => item.title.length > 2);
        })()
      `);

      if (!Array.isArray(pageData) || pageData.length === 0) break;

      pageData.forEach(item => {
        if (!results.some(r => r.url === item.url) && results.length < limit) {
          results.push(item);
        }
      });

      currentPage++;
    }

    return results;
  }
});
