/**
 * uahz 个人项目站 — 验收脚本
 * 把方案里的硬性要求写成断言，交付/推送前真跑。
 * 用法：node scripts/verify-site.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

let pass = 0;
const fails = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log("  [PASS] " + name); }
  else { fails.push(name + (detail ? " -> " + detail : "")); console.log("  [FAIL] " + name + (detail ? " -> " + detail : "")); }
}
const cnt = (s, re) => (s.match(re) || []).length;

const home = read("index.html");
const work = read("work.html");
const css = read("assets/css/style.css");
const js = read("assets/js/main.js");
const data = read("assets/js/projects.js");

console.log("\n== 1. 文件齐备 ==");
["index.html", "work.html", "assets/css/style.css", "assets/js/main.js",
 "assets/js/projects.js", "assets/img/favicon.svg", "README.md", "404.html"
].forEach(f => check("存在 " + f, exists(f)));

console.log("\n== 2. 项目数据完整性（19 个）==");
// 从 projects.js 里抽出所有 id
const ids = [...data.matchAll(/^\s*id:\s*"([^"]+)"/gm)].map(m => m[1]);
check("项目数量为 19", ids.length === 19, "实际 " + ids.length);
check("id 无重复", new Set(ids).size === ids.length);
ids.forEach(id => {
  check("id 合法 " + id, /^[a-z0-9-]+$/.test(id));
});
// 每个项目必须有完整字段
const blocks = data.split(/\n  \{\n/).slice(1);
blocks.forEach((b, i) => {
  const id = (b.match(/id:\s*"([^"]+)"/) || [])[1] || ("#" + i);
  check(`[${id}] 有中文名`, /cn:\s*"[^"]{2,}"/.test(b));
  check(`[${id}] 有简介`, /desc:\s*"[^"]{20,}"/.test(b));
  check(`[${id}] 有技术栈`, (b.match(/"/g) || []).length > 0 && /tech:\s*\[/.test(b));
  check(`[${id}] 技术栈 >= 3`, cnt((b.match(/tech:\s*\[([\s\S]*?)\]/) || ["", ""])[1], /"/g) >= 3);
  check(`[${id}] 有分类`, /cat:\s*"(game|web|tool|art|skill)"/.test(b));
  check(`[${id}] 有年份`, /year:\s*"\d{4}"/.test(b));
  check(`[${id}] 有链接`, /demo:\s*"https:\/\//.test(b));
  check(`[${id}] 亮点 >= 2`, cnt((b.match(/highlights:\s*\[([\s\S]*?)\]/) || ["", ""])[1], /"/g) >= 2);
});
// 分类齐全
["game", "web", "tool", "art", "skill"].forEach(c =>
  check("有 " + c + " 类项目", data.includes('cat: "' + c + '"')));
// 精选项目
check("有 4 个精选", cnt(data, /featured:\s*true/g) === 4, "实际 " + cnt(data, /featured:\s*true/g));

console.log("\n== 3. 两页导航可互相跳转 ==");
check("首页 → 项目页", /href="work\.html"/.test(home));
check("项目页 → 首页", /href="index\.html"/.test(work));
check("两页都有 GitHub 外链", /github\.com\/uahz/.test(home) && /github\.com\/uahz/.test(work));
check("首页 data-page=home", /<body data-page="home">/.test(home));
check("项目页 data-page=all", /<body data-page="all">/.test(work));
check("首页导航项数量 = 项目页", cnt(home, /class="nav__l"/g) === cnt(work, /class="nav__l"/g),
  cnt(home, /class="nav__l"/g) + " vs " + cnt(work, /class="nav__l"/g));
const navCta = (s) => (s.match(/class="nav__gh" href="([^"]+)"/) || [])[1];
check("两页 GitHub 按钮同指向", navCta(home) === navCta(work));
check("两页 footer 链接数量一致",
  cnt((home.match(/<footer[\s\S]*?<\/footer>/) || [""])[0], /<a /g) ===
  cnt((work.match(/<footer[\s\S]*?<\/footer>/) || [""])[0], /<a /g));
check("两页 footer 结构一致", (home.match(/<footer[\s\S]*?<\/footer>/) || [""])[0].replace(/2026|精选/g, "")
  === (work.match(/<footer[\s\S]*?<\/footer>/) || [""])[0].replace(/2026|精选/g, ""));
// 锚点
["#work", "#skills", "#about", "#contact"].forEach(a =>
  check("首页有锚点区块 " + a, home.includes('id="' + a.slice(1) + '"')));

console.log("\n== 4. 首页必备区块 ==");
[["Hero 区", /class="hero"/], ["个人简介", /我是 uahz/],
 ["进入项目页 CTA", /浏览全部项目/],
 ["核心技能区", /id="skills"/], ["技能条 5 组", cnt(home, /class="skill rv"/g) === 5],
 ["关于区", /id="about"/], ["时间线", /class="tl__i"/g],
 ["联系方式区", /id="contact"/], ["邮箱 mailto", /mailto:uahz@qq\.com/],
 ["联系表单", /id="ct-form"/],
 ["精选容器", /data-grid="featured"/],
].forEach(([n, re]) => check(n, re instanceof RegExp ? re.test(home) : re));

console.log("\n== 5. 项目集页结构 ==");
check("筛选栏存在", /data-filters/.test(work));
check("筛选按钮 6 个", cnt(work, /class="fbtn"/g) === 6);
["all", "game", "web", "tool", "art", "skill"].forEach(f =>
  check("筛选按钮 data-f=" + f, work.includes('data-f="' + f + '"')));
check("全量容器 data-grid=all", /data-grid="all"/.test(work));
check("计数元素", /data-count/.test(work));
check("空状态", /data-empty/.test(work));
check("两个页面各有一个 grid 容器", cnt(home, /data-grid=/g) === 1 && cnt(work, /data-grid=/g) === 1);

console.log("\n== 6. 卡片渲染函数 ==");
check("cardHTML 存在", /function cardHTML/.test(js));
check("渲染后含中文名 p.cn", /esc\(p\.cn\)/.test(js));
check("渲染后含简介 p.desc", /esc\(p\.desc\)/.test(js));
check("渲染后含技术标签循环", /p\.tech\.forEach/.test(js));
check("渲染后含亮点循环", /p\.highlights/.test(js));
check("详情用 details 元素", /<details class="pcard__more">/.test(js));
check("外链带 noopener", (js.match(/rel="noopener"/g) || []).length >= 3);
check("escape 防注入", /function esc/.test(js) && /&lt;/.test(js) && /&quot;/.test(js));
check("详情模式仅在项目页开启", /withDetail/.test(js) && /mode !== "featured"/.test(js));

console.log("\n== 7. 视觉与动效 ==");
check("暗色底令牌", /--bg-0:\s*#07090C/.test(css));
check("双强调色", /--cy-400/.test(css) && /--vi-400/.test(css));
check("粒子画布元素", /id="flow"/.test(home) && /id="flow"/.test(work));
check("鼠标光晕元素", /class="spot"/.test(home) && /class="spot"/.test(work));
check("滚动进度条", /class="bar"/.test(home) && /class="bar"/.test(work));
check("Perlin 噪声实现", /function noise2/.test(js) && /perm\[/.test(js));
check("帧率自适应降密度", /slowFrames/.test(js));
check("页面隐藏时停机", /visibilitychange/.test(js));
check("DPR 适配", /devicePixelRatio/.test(js));
check("卡片 3D 倾斜", /perspective\(1000px\)/.test(js) && /rotateX/.test(js));
check("跟随高光", /--mx/.test(css) && /radial-gradient\(340px circle/.test(css));
check("磁性按钮", /function initMagnet/.test(js));
check("按钮流光扫过", /btn__a/.test(css) && /btn__a/.test(home));
check("逐字入场", /data-split/.test(js) && /\.split span/.test(css));
check("数字滚动", /data-count/.test(js) && /data-count/.test(home));
check("打字机", /function initTyper/.test(js) && /id="typer"/.test(home));
check("终端逐行", /function initTerm/.test(js) && /data-term/.test(home));
check("干扰文字样式", /\.glitch/.test(css));
check("视差光晕 lerp 缓动", /x \+= \(tx - x\) \* 0\.14/.test(js));
check("错峰进场 delay", /transitionDelay/.test(js) && /transition-delay/.test(home));
check("KF 动画 >= 8 组", cnt(css, /@keyframes/g) >= 8, "实际 " + cnt(css, /@keyframes/g));

console.log("\n== 8. 统一性与约束 ==");
check("两页引用同一份样式", /assets\/css\/style\.css/.test(home) && /assets\/css\/style\.css/.test(work));
check("两页引用同一份脚本", (home.match(/assets\/js\//g) || []).length === 2 &&
  (work.match(/assets\/js\//g) || []).length === 2);
check("两页引用同一份数据", /projects\.js/.test(home) && /projects\.js/.test(work));
check("颜色收敛 :root 令牌", /:root\s*\{[\s\S]*?--bg-0/.test(css));
check("HTML 无硬编码颜色", ![...home.matchAll(/style="([^"]*)"/g), ...work.matchAll(/style="([^"]*)"/g)]
  .some(m => /#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/.test(m[1])));
check("响应式断点 >= 3", cnt(css, /@media \(max-width/g) >= 3);
check("prefers-reduced-motion 处理", /prefers-reduced-motion/.test(css) && /REDUCED/.test(js));
check("汉堡导航样式", /\.burger\s*\{[^}]*display:\s*none/.test(css));
check("sticky 筛选栏", /\.filters\s*\{[^}]*position:\s*sticky/.test(css));
check("sticky header", /\.head\s*\{[^}]*position:\s*fixed/.test(css));
check("skip link", /class="skip"/.test(home) && /class="skip"/.test(work));
check("aria 标注充分", cnt(home, /aria-hidden="true"/g) >= 3 && /aria-label/.test(home));
check("aria-pressed 用于筛选", /aria-pressed/.test(js) && /aria-pressed/.test(work));
check("表单状态区 role=status", /role="status"/.test(home));
check("html lang", /<html lang="zh-CN">/.test(home) && /<html lang="zh-CN">/.test(work));
check("theme-color", /name="theme-color"/.test(home) && /name="theme-color"/.test(work));

console.log("\n== 9. 无障碍与安全 ==");
check("外链全部 https", !/href="http:\/\//.test(home + work + js + data));
check("外链带 noopener", !/target="_blank"(?![^>]*noopener)/.test(home + work));
check("无内联事件处理器", !/on(click|change|load|submit)\s*=/.test(home + work));
check("邮箱已转义或用 mailto", /mailto:/.test(home));

console.log("\n== 10. 语法与配平 ==");
try { new Function(js); check("main.js 语法正确", true); }
catch (e) { check("main.js 语法正确", false, e.message); }
try {
  // projects.js 是纯数据赋值，包装成函数后用 new Function 校验语法
  new Function(data);
  check("projects.js 语法正确", true);
}
catch (e) { check("projects.js 语法正确", false, e.message); }

["index.html", "work.html"].forEach(f => {
  const s = read(f);
  ["section", "div", "ul", "li", "nav", "footer", "header", "form", "main", "button", "a", "p", "span", "aside"]
    .forEach(t => {
      const o = cnt(s, new RegExp("<" + t + "(\\s|>)", "g"));
      const c = cnt(s, new RegExp("</" + t + ">", "g"));
      check(f + " <" + t + "> 配平 (" + o + "/" + c + ")", o === c);
    });
  check(f + " 双引号成对", cnt(s, /"/g) % 2 === 0);
});
check("无 TODO/FIXME/占位文本", !/TODO|FIXME|Lorem ipsum|待补充|占位/.test(home + work + css + js + data));

console.log("\n" + "=".repeat(54));
if (fails.length === 0) {
  console.log("全部通过：" + pass + " 项断言");
  process.exit(0);
} else {
  console.log("通过 " + pass + " 项，失败 " + fails.length + " 项：");
  fails.forEach(f => console.log("  - " + f));
  process.exit(1);
}
