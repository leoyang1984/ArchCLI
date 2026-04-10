# ArchCLI: 建筑设计平台适配器 (ArchDaily & Gooood)

本套件为 OpenCLI 提供了针对全球领先建筑设计门户的自动化数据采集能力，支持从关键词搜索、专业分类浏览到高清大图提取的全流程操作。

---

## 🛠 安装说明

1. 确保已全局安装 `@jackwener/opencli` 并在 Chrome 中启用扩展。
2. 在当前目录下运行安装脚本：
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
3. 运行环境检查：
   ```bash
   opencli doctor
   ```

---

## 📑 指令全地图

### 1. ArchDaily 适配器 (全球站 & 中国站)
自适应中英双语，支持无限滚动加载。

*   **项目搜索**：基于关键词查找相关案例。
    *   `opencli archdaily search "混凝土住宅" --limit 10`
*   **专业分类**：直接浏览编辑部精选的分类池。
    *   `opencli archdaily category "cultural" --limit 5`
*   **详情提取**：抓取项目说明、参数及全景高清图。
    *   `opencli archdaily detail "URL"`

### 2. 谷德 (Gooood.cn) 适配器
支持高精度标题解析与专业过滤器。

*   **项目搜索**：全网关键词检索。
    *   `opencli gooood search "木建筑"`
*   **专业标签 (Filter)**：**[推荐]** 利用官方过滤器锁定办公、居住、材料等专业范畴。
    *   `opencli gooood tag "office-building" --limit 10`
*   **详情提取**：提取深度背景文字及所有实景大图。
    *   `opencli gooood detail "URL"`

---

## 🚀 典型工作流示例

**场景：研究最新的办公建筑趋势**
1.  **锁定资源**：使用标签筛选最近的办公建筑。
    ```bash
    opencli gooood tag "office" --limit 3 -f json
    ```
2.  **获取详情**：复制返回结果中的 URL，进行大图抓取。
    ```bash
    opencli gooood detail "https://www.gooood.cn/..." -f json
    ```

---

## 📘 开发者指南
如需深入了解适配器内部逻辑或学习如何开发新的插件，请查阅根目录下的：
[OpenCLI_Developer_Guide.md](./OpenCLI_Developer_Guide.md)

---

## 📊 数据导出格式

本套适配器继承了 OpenCLI 的原生导出能力，你可以通过 `-f` 或 `--format` 参数将结果输出为多种格式：

| 参数 | 格式 | 典型用途 |
| :--- | :--- | :--- |
| `-f json` | **JSON** | 程序对接（如交给 AI 或脚本加工） |
| `-f table` | **Table** | 终端直接阅读（默认选项） |
| `-f md` | **Markdown** | 复制到笔记软件（Obsidian/Notion/Typora） |
| `-f csv` | **CSV** | 导入 Excel 进行统计分析 |
| `-f yaml` | **YAML** | 结构化参数查看 |

**示例命令：**
```bash
# 将 20 条室内设计案例导出为 Markdown 表格
opencli gooood tag "室内" --limit 20 -f md
```
