# uahz.github.io

个人项目站。**首页**（个人简介 / 技能 / 联系方式 + 精选项目）与**项目页**（19 个开源项目，可按类型筛）。

- 技术栈：HTML + CSS + 原生 JS + Canvas，零框架、零构建、零依赖
- 线上地址：<https://uahz.github.io/>
- 动效：自写 Perlin 噪声粒子流场 + 3D 倾斜卡片 + 打字机 + 终端逐行 + 逐字入场 + 磁性按钮

## 目录

```
.
├─ index.html            首页
├─ work.html             全部 19 个项目
├─ 404.html              GitHub Pages 专用兜底页
├─ assets/
│  ├─ css/style.css      唯一样式源（令牌 + 动效 + 组件 + 响应式）
│  ├─ js/projects.js     项目数据源（增删项目只改这里）
│  ├─ js/main.js         粒子引擎 + 全部交互
│  └─ img/favicon.svg
├─ scripts/
│  ├─ verify-site.cjs       结构验收（306 项断言）
│  ├─ browser-check.cjs     浏览器实测（CDP，22 项：渲染 / 筛选 / 跳转 / 异常）
│  ├─ check-links.cjs       外链存活检查（28 个链接，防仓库被删后留死链）
│  ├─ check-live.cjs        线上抽检（内容 / 筛选项 / demo 链接可用性）
│  ├─ verify-live-bytes.cjs 线上与本地字节级一致性比对
│  ├─ push-via-api.cjs      git 不可用时的 REST API 推送通道
│  ├─ stats.cjs             分类与精选数量统计
│  └─ list-links.cjs        列出各项目链接类型
└─ README.md
```

## 页面结构

固定 Header 是唯一全局导航，当前页由 `body[data-page]` 驱动 JS 高亮。

**首页**：Hero（标题逐字入场 + 打字机 + 数字滚动）→ 终端区（逐行打出）→ 精选 4 个项目 →
技能 5 组 → 关于（时间线）→ 联系（4 渠道 + 表单）。

**项目页**：页头 → sticky 分类筛选（全部 / 游戏 / 网页应用 / 桌面工具 / 生成艺术 / Skill）→ 3 列项目网格 → 底部导回首页。

项目卡片由 `main.js` 从 `projects.js` 渲染，**两页复用同一个 `cardHTML()`**，所以首页精选卡与项目页卡片版式天然一致。

## 动效清单

| 效果 | 实现 | 说明 |
|---|---|---|
| 粒子流场 | Canvas + Perlin 噪声 | 粒子沿噪声场运动成湍流，鼠标附近有吸引扰动 |
| 帧率自适应 | 连续慢帧自动降密度 | 掉帧时砍粒子数，不降画质 |
| 省电 | `visibilitychange` 停机 | 切到别的标签页就暂停 |
| 鼠标光晕 | lerp 缓动跟随 | 青色主光晕 + 紫色内芯 |
| 滚动进度条 | `scaleX` + 流光 | 顶部 2px 渐变条 |
| 卡片 3D 倾斜 | `perspective` + rotateX/Y | 跟随鼠标，最大 9° |
| 跟随高光 | CSS 变量 `--mx/--my` | 径向光斑跟着光标走 |
| 磁性按钮 | 位移系数 0.14 | 靠近时轻微吸附 |
| 逐字入场 | JS 拆字 + 错峰 delay | 每个字 32ms 间隔翻转入场 |
| 数字滚动 | rAF + easeOutCubic | 进入视口才计数 |
| 打字机 | 循环打字/删除 | 5 行文案轮播，带光标闪烁 |
| 终端逐行 | IntersectionObserver | 滚动到才逐行打出 |
| 错峰进场 | `transition-delay` | 卡片按索引 70ms 递增 |

**无障碍**：`prefers-reduced-motion` 下所有动效关闭、粒子画布隐藏、进场内容直接显示。
移动端 860px 以下汉堡菜单，粒子密度自动降低。

## 本地预览

```bash
python -m http.server 8900
# 打开 http://127.0.0.1:8900/index.html
```

## 增删项目

只改 `assets/js/projects.js`，两页自动同步。**首页统计数字与项目页的分类标签都是从数据源
实时算出来的**，不用手改 —— 加一个项目，首页的「开源项目」数和分类标签会自动更新。

```js
{
  id: "repo-name",              // 必填，须与 GitHub 仓库名一致（允许大写，如 LPdf）
  cn: "中文名",                  // 必填，卡片标题
  desc: "一句话简介，20 字以上",  // 必填
  tech: ["HTML", "Canvas"],      // 必填，至少 3 个
  cat: "game",                   // 必填，game/web/tool/mobile/art/skill 之一
  year: "2026",                  // 必填
  demo: "https://...",           // 必填，指向自己的仓库链接则显示「仓库」
  featured: true,                // 可选，true 则出现在首页精选
  stars: 1,                      // 可选，有星标才显示
  highlights: ["亮点1", "亮点2"]  // 必填，至少 2 条
}
```

分类出现顺序由 `window.CATS` 控制。若新增了分类，记得在 `work.html` 的筛选栏加一个
`<button class="fbtn" data-f="新分类">`，并在 `main.js` 的 `CAT_LABEL` 加中文名。
（验收脚本会检查筛选按钮与 `CATS` 是否一一对应，漏了会报错。）

## 验收

```bash
node scripts/verify-site.cjs       # 本地结构：10 组 306 项断言
node scripts/browser-check.cjs       # 浏览器实测：22 项（渲染 / 筛选 / 跳转 / 运行时异常）
node scripts/check-links.cjs         # 外链存活：28 个链接，仓库被删会报错
node scripts/check-not-base64.cjs    # ★ 线上内容完整性：确认 Pages 返回的不是 base64 文本
node scripts/check-live.cjs          # 线上抽检：内容 / 筛选项 / demo 链接可达性
node scripts/verify-live-bytes.cjs   # 线上与本地字节级一致性
```

`browser-check.cjs` 用 CDP 驱动 Edge（不装 playwright），覆盖真实渲染、筛选交互、
两页跳转、404 兜底，并捕获运行时异常与 console.error。

**注意**：headless Edge 默认 `prefers-reduced-motion: reduce`，粒子等动效会被正确关闭。
脚本里已用 `Emulation.setEmulatedMedia` 模拟普通用户环境，否则测不到动效。

### ★ 每次部署后必须跑 `check-not-base64.cjs`

**踩过的坑**：Git Data API 的 `git/trees` 里 `content` 字段要的是**纯文本内容**，
不是 base64（只有 Contents API 才要 base64）。若误传 base64，GitHub 会把那串字符
当文件内容原样存下 —— **API 返回 200、Pages 显示 built、curl 状态码 200 全部正常**，
但浏览器打开是一整段 base64 乱码。只验状态码永远发现不了。

`deploy.cjs` 已修正为 `buf.toString("utf8")`。部署脚本本身也要当心：
在字符串上调用 `.toString("base64")` 是 no-op（会返回字符串本身），
看着像编码其实没编码，别写成那样误导人。

## 同步 GitHub 变更

站点收录的项目要跟 GitHub 保持一致。仓库可能被删除或转私有（此时公开 API 返回 404、
Pages 同时失效），需要下架：

```bash
node scripts/check-links.cjs        # 先找出失效链接
node scripts/stats.cjs              # 看当前分类与精选分布
# 从 assets/js/projects.js 删掉失效项目，并同步调整 window.CATS
```

`verify-site.cjs` 里有一条断言专门检查已下架项目不会残留在数据源中。

`verify-site.cjs` 覆盖：项目数据完整性（19 个项目逐个校验字段）、两页导航互通、
首页必备区块、筛选结构、卡片渲染函数、动效存在性、视觉统一性、无障碍与安全、语法与标签配平。

`verify-live-bytes.cjs` 会抓取线上文件与本地逐字节比对，同时检测中文是否被存成乱码
（U+FFFD 替换字符），改完文件推送后跑一次就知道有没有传坏。

## 部署

本仓库即 `uahz.github.io`，GitHub Pages 自动发布在 <https://uahz.github.io/>。

推送到默认分支即生效，通常 1–2 分钟完成构建。若 Pages 未开启：
仓库 Settings → Pages → Source 选 `main` / `/ (root)`。

**网络受限时改用 API 推送**（git over HTTPS 被代理阻断时）：

```bash
export SK=ghp_xxx
node scripts/push-via-api.cjs index.html "commit message"
```

该脚本显式以 UTF-8 读取文件，避免中文被按 latin-1 存成乱码。

## 已知边界

- 联系表单是纯前端演示，提交后只在本地显示回执，**不会发邮件**。上线时接
  Formspree / 邮件服务，把 `main.js` 的 `initForm` 改成真实请求即可。
- 项目链接与介绍基于仓库 description 和 README 整理，如有出入以仓库为准。
