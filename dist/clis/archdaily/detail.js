import { cli } from '@jackwener/opencli/registry';

cli({
  site: 'archdaily',
  name: 'detail',
  description: '获取 ArchDaily 项目详情与高清图',
  args: [{ name: 'url', required: true, positional: true, help: '项目详情页 URL' }],
  func: async (page, args) => {
    await page.goto(args.url);
    // 等待核心元素
    await page.wait({ selector: '.afd-specs-list, article, .afd-article-body', timeout: 10 });

    const data = await page.evaluate(`
      (async () => {
        // 1. 提取元数据 (兼容中英文标签)
        const specs = {};
        const specItems = Array.from(document.querySelectorAll('.afd-specs-list li'));
        specItems.forEach(el => {
          const text = el.innerText || '';
          if (text.match(/Architects:|建筑师:|建筑设计:/i)) {
            specs.architect = text.split(/Architects:|建筑师:|建筑设计:/i)[1].trim();
          }
          if (text.match(/Year:|项目年份:|年份:/i)) {
            specs.year = text.split(/Year:|项目年份:|年份:/i)[1].trim();
          }
          if (text.match(/Location:|地点:/i)) {
            specs.location = text.split(/Location:|地点:/i)[1].trim();
          }
        });

        // 2. 增强型描述抓取：处理图文混排布局
        // 抓取所有可能的段落容器
        const selectors = [
          '.afd-article-body p', 
          '.ad-article-text p', 
          '.article-content p', 
          '#article-body p',
          'article p'
        ];
        
        let paragraphs = [];
        selectors.forEach(sel => {
          const found = Array.from(document.querySelectorAll(sel));
          if (found.length > 0) {
            paragraphs = paragraphs.concat(found.map(p => p.innerText.trim()));
          }
        });

        // 去重并合并
        let description = Array.from(new Set(paragraphs))
          .filter(t => t.length > 20) // 过滤掉短链接或小文字
          .join('\\n\\n');

        // 3. 提取高清大图
        const images = Array.from(document.querySelectorAll('.afd-gallery-thumbs img, .thumbs__link img, .gallery-thumbs img, article img'))
          .map(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
            // 转换为高清大图
            return src.replace('thumb_jpg', 'large_jpg').replace('medium_jpg', 'large_jpg').split('?')[0];
          })
          .filter(src => src && src.startsWith('http') && !src.includes('profile_images'));

        return {
          title: document.title.split('|')[0].trim(),
          ...specs,
          description: description.slice(0, 3000), 
          images: Array.from(new Set(images))
        };
      })()
    `);

    return data;
  }
});
