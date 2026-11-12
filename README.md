# 个人作品集 · 一页全量 + 二级详情

面向面试官与潜在客户的作品集。

- **主入口**：https://uahz.github.io/
- **备用地址**：https://uahz.github.io/portfolio/
- 结构：`index.html` 一页展示全部 19 个项目 → 点卡片跳 `project.html?id=xxx` 看详情
- 技术栈：原生 HTML + CSS + JS，无框架、无 CDN、无字体文件外链
- 封面：内联 SVG data URI，零外部依赖

> 原来的暗色多页站仍保留在主仓库（`work.html` / `404.html` / `assets/`），
> 但不是入口，仅作归档，避免已发出的链接失效。

## 当前内容约定

| 项 | 值 | 说明 |
|---|---|---|
| 姓名 | **汤** | 只写了姓，全名待补 |
| 邮箱 | `uahz@qq.com` | 纯 `mailto:`，**不放表单**（静态站没有后端，表单只会给假回执） |
| 社交 | 仅 GitHub `uahz` | Behance / 站酷 / 小红书等真实地址待补后再加 |
| 在线体验 | 7 个项目有 | 其余按用户要求暂不处理 |

补全姓名或社交链接时：改 `template.html` / `project-template.html` 里对应文本，跑 `python build.py`，再跑 `node deploy-pages.cjs <TOKEN> <repo>`。

## 设计系统

| 项 | 规范 |
|---|---|
| 配色 | 主色 `#165DFF`、背景 `#FAFAFA`、正文 `#1D1D1F`、次要文字 `#86868B`，全部收敛 `:root` |
| 字体 | **苹方（PingFang SC）优先，标题 700 粗体**。Windows 上按 `Noto Sans SC`（思源黑体 Bold）→ `HarmonyOS Sans SC` → `Microsoft YaHei` 回退；不加载任何字体文件 |
| 布局 | 12 列栅格；Hero 7/5 分栏、主按钮在右下角；画廊 Bento 19 卡按 `6n+N` 循环跨度 7/5/8/4 + 垂直偏移 |
| 圆角 | 统一 12px（`--r`），大容器 20px |
| 阴影 | 低透明度柔和阴影 `--sh-1/2/3` |
| 断点 | 375 / 768 / 1200；768 平板档两列、767 以下单列 + 汉堡 |
| 背景 | 三层极淡径向渐变，无光斑 / 粒子 / 网格 |
| 动效 | 全站唯一一套入场（`.reveal` + `--delay` 错峰）；hover 仅卡片上浮 4px + 封面 1.06 倍；纯 CSS |

### 关于「苹方粗体」

`--font-display` 第一位是 `"PingFang SC"`，所以 **macOS / iOS 上就是原生苹方 Bold**。
Windows 没有苹方（Apple 系统字体，不可分发），按字体栈回退到 **Noto Sans SC Bold**
—— 思源黑体，和苹方同属现代几何无衬线，字重 700 是真实 Bold 而非合成粗体。

已用 CDP `CSS.getPlatformFontsForNode` 实测：Windows 上实际渲染字体为
`Noto Sans SC`，字重 700。如果要在 Windows 上也显示苹方本身，
只能内嵌字体文件（约 3–5 MB），会破坏「零外部依赖」，因此没有采用。

## 源码结构

```
site.css                 ← 唯一设计系统源（构建时内联进两个 HTML）
template.html             ← 主页结构 + JS
project-template.html     ← 二级详情页结构 + JS
export-works.cjs          ← 从 ../个人作品集/assets/js/projects.js 导出 works.json
works.json                ← 19 个项目数据（自动生成）
gen-covers.py             ← 19 张几何封面 SVG
build.py                  ← 注入 CSS / 数据 / 封面 → 产出 index.html + project.html

index.html                ← 交付物：主页（自包含）
project.html              ← 交付物：二级详情页（自包含）

check.cjs                 ← CDP 浏览器实测（43 项）
shoot.cjs                 ← 截图
deploy-pages.cjs          ← GitHub Pages 部署
deploy-single.cjs         ← 旧的单文件部署脚本（保留）
```

## 重建

```bash
node export-works.cjs   # 项目有增删时先跑
python build.py         # 产出两个自包含 HTML
```

`index.html` / `project.html` 各自内嵌 CSS、JS、19 条项目数据和全部封面，
**双击即可运行**，`file://` 下也完整可用。

## 替换内容

| 要改什么 | 位置 |
|---|---|
| 姓名 / Hero 文案 | `template.html` |
| 邮箱 / 社交 | `template.html` 的 `#contact` |
| 项目数据 | `../个人作品集/assets/js/projects.js`（唯一数据源）→ 跑 `export-works.cjs` + `build.py` |
| 作品封面 | `gen-covers.py` 的 `SPECS` / `shapes()`；或把 `works.json` 的 `cover` 换成真实图片 URL |
| 配色 | `site.css` 的 `:root` 变量，改一处全站生效 |

## 验收（直接对线上跑，不需要本地服务）

```bash
node check.cjs                                     # 线上主入口，43 项
node check.cjs https://uahz.github.io/portfolio/   # 备用地址
node verify-online.cjs                             # 线上与本地字节级比对
```

**不要起 `python -m http.server`。** 这个项目从构建到验收全部以线上为准：
`check.cjs` 默认目标就是 `https://uahz.github.io`，用 CDP 驱动 Edge 直接在真实网络上跑。

43 项断言：19 卡片全部渲染且都是跳转链接、无弹窗、无外部依赖、封面 4:3、
Bento 跨度非等宽、分类筛选与计数回写、详情页各区块与无 id 回退、
375/768/1200 三档响应式、**控制台零报错**。

`verify-online.cjs` 抓线上文件与本地构建产物做字节级比对（换行归一），
顺带检测 base64 二次编码与乱码。**每次部署后都该跑这一条。**

> headless Edge 默认 `prefers-reduced-motion: reduce`，脚本用
> `Emulation.setEmulatedMedia` 模拟普通用户环境，否则测不到入场动效。

## 部署

```bash
node deploy-pages.cjs <TOKEN> uahz.github.io main
node deploy-pages.cjs <TOKEN> portfolio main
```

用 Git Data API（`git/trees` + `git/commits` + `git/refs`），`base_tree` 保留仓库里已有文件。
脚本自动等 Pages 构建，并**逐个验响应体前 20 字符是不是 `<!DOCTYPE html>`**。

### 编码约定（踩过坑）

- `git/trees` 的 `content` 要**纯文本** → `fs.readFileSync(file, "utf8")`
- Contents API 的 `content` 要 **base64** → `Buffer.from(text, "utf8").toString("base64")`
- 在字符串上写 `.toString("base64")` 是 **no-op**，看着像编码其实没编码

若给 `git/trees` 传了 base64，GitHub 会把那串字符当文件内容原样存下：
API 200、Pages built、curl 200 全部正常，但浏览器打开是一整段 base64 乱码。
**所以部署后必须验响应体内容，不能只验状态码。**
