# ArchCLI 开发指南 (全量升级版)

本指南总结了在开发 ArchDaily 与 谷德 (Gooood) 适配器过程中积累的高级实战经验，特别是针对异步加载和复杂逻辑死锁的解决方案。

## 1. 架构与性能规范

### 1.1 翻页逻辑：必须位于“主进程”
**陷阱**：在 `page.evaluate`(浏览器内) 使用 `window.location.href` 会导致当前执行环境被销毁，报 `Frame removed` 错误。
**最佳实践**：在 Node.js 异步循环中使用 `page.goto`，每页抓取一次。
```javascript
while (results.length < limit) {
  const url = `https://site.com/page/${p}`;
  await page.goto(url); // 在外部导航
  const pageData = await page.evaluate(`...抓取数据...`);
  results = results.concat(pageData);
}
```

### 1.2 异步容错 (AJAX 处理)
对于谷德这种依赖异步加载的页面，必须在执行 `evaluate` 前通过 `page.wait` 进行“软硬结合”的等待。
```javascript
await page.wait({ selector: '.target-item', timeout: 15 });
await new Promise(r => setTimeout(r, 2000)); // 给 AJAX 逻辑留出渲染缓冲
```

---

## 2. 高级解析黑科技

### 2.1 针对“幽灵链接”的权重抓取算法
**应用场景**：一个项目卡片包含多个相同 URL 的 `<a>` 标签（如一个是图片，一个是标题）。
**解决逻辑**：使用 Map 存储 URL，并根据文字长度 (`innerText.length`) 动态覆盖，确保保留信息最全的那个。
```javascript
const linkMap = {};
for (const a of links) {
  const href = a.getAttribute('href');
  const text = a.innerText.trim();
  if (!linkMap[href] || text.length > linkMap[href].title.length) {
    linkMap[href] = { title: text, url: href };
  }
}
```

### 2.2 标题特征工程 (Regex)
统一使用 `match` 代替 `split` 进行元数据剥离：
- `项目 / 地点 / 建筑师` -> `/^(.*?)\s*[\/，]\s*(.*?)\s*[\/]\s*(.*)$/`
- 能够同时兼容中英文标点。

---

## 3. 常见实战坑位回访

| 坑位 | 解决方案 | 状态 |
| :--- | :--- | :--- |
| **搜索跳回首页** | 强制使用 `/search/keyword.htm` 等固定后缀路径。 | 已验证 |
| **Grid 布局抓取失败** | 使用 `a.cover-link` 或 `img` 的 `parent` 节点回溯获取标题。 | 已验证 |
| **描述文字缺失** | 放弃容器抓取，直接横扫正文区所有 `p` 标签并聚合。 | 已验证 |

---

## 4. 数据格式与兼容性规范

由于适配器基于 OpenCLI 注册，自动支持 `json`, `table`, `md`, `csv` 等导出格式。为了保证最佳兼容性，开发时应遵循：

1.  **字段扁平化**：返回结果（columns）应尽量避免深层嵌套对象。
2.  **字段命名一致性**：确保 `title`、`url`、`architect` 等核心字段名在不同命令间保持一致，方便用户使用 `--columns` 进行跨命令筛选。
3.  **大文本处理**：对于 `detail` 命令抓取的长描述，应在返回前进行 `slice` 处理或清理冗余空白，以防止在 `table` 模式下撑破终端屏幕。

---
*这些经验已经固化在 `dist/` 的源码中，可根据注释直接复用。*
