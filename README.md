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
├─ scripts/verify-site.cjs   验收脚本（306 项断言）
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

只改 `assets/js/projects.js`，两页自动同步。

```js
{
  id: "repo-name",              // 必填，须与 GitHub 仓库名一致
  cn: "中文名",                  // 必填，卡片标题
  desc: "一句话简介，20 字以上",  // 必填
  tech: ["HTML", "Canvas"],      // 必填，至少 3 个
  cat: "game",                   // 必填，game/web/tool/art/skill 之一
  year: "2026",                  // 必填
  demo: "https://...",           // 必填，指向自己的仓库链接则显示「仓库」
  featured: true,                // 可选，true 则出现在首页精选
  stars: 1,                      // 可选，有星标才显示
  highlights: ["亮点1", "亮点2"]  // 必填，至少 2 条
}
```

分类出现顺序由 `window.CATS` 控制。若新增了分类，记得在 `work.html` 的筛选栏加一个
`<button class="fbtn" data-f="新分类">`，并在 `main.js` 的 `CAT_LABEL` 加中文名。

## 验收

```bash
node scripts/verify-site.cjs
```

10 组共 **306 项断言**：项目数据完整性（19 个项目逐个校验字段）、两页导航互通、
首页必备区块、筛选结构、卡片渲染函数、动效存在性、视觉统一性、无障碍与安全、语法与标签配平。

## 部署

本仓库即 `uahz.github.io`，GitHub Pages 会自动发布在 <https://uahz.github.io/>。

推送到默认分支即可生效。若 Pages 未开启：仓库 Settings → Pages → Source 选
`main` 分支 `/ (root)`。

## 已知边界

- 联系表单是纯前端演示，提交后只在本地显示回执，**不会发邮件**。上线时接
  Formspree / 邮件服务，把 `main.js` 的 `initForm` 改成真实请求即可。
- 项目链接与介绍基于仓库 description 和 README 整理，如有出入以仓库为准。
