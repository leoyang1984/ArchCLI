import { cli } from '@jackwener/opencli/registry';

cli({
  site: 'gooood',
  name: 'detail',
  description: '获取谷德 (gooood) 项目全文及高清大图',
  args: [{ name: 'url', required: true, positional: true, help: '项目详情页 URL' }],
  func: async (page, args) => {
    await page.goto(args.url);
    // 等待正文内容加载
    await page.wait({ selector: '.post-content, article, .item-content', timeout: 10 });

    const data = await page.evaluate(`
      (async () => {
        // 1. 提取文字描述
        const contentEl = document.querySelector('.post-content, article, .item-content');
        const description = contentEl ? contentEl.innerText.trim() : '';

        // 2. 提取文中所有的项目大图
        const images = Array.from(document.querySelectorAll('.post-content img, article img, .item-content img'))
          .map(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
            // 确保是文章配图而非小图标
            return src;
          })
          .filter(src => {
            return src && 
                   src.startsWith('http') && 
                   !src.includes('avatar') && 
                   !src.includes('logo') &&
                   (src.toLowerCase().endsWith('.jpg') || src.toLowerCase().endsWith('.png') || src.includes('image'));
          });

        return {
          title: document.title,
          description: description.slice(0, 2000),
          images: Array.from(new Set(images))
        };
      })()
    `);

    return data;
  }
});
