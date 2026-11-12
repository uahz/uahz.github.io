/**
 * CDP 浏览器验收：真实渲染 + 关键交互链路 + 运行时异常捕获。
 * 不装 playwright，用 Node 内置 WebSocket + Edge headless。
 *
 * 用法：node scripts/browser-check.cjs http://127.0.0.1:8910
 */
const { spawn } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

const BASE = process.argv[2] || "http://127.0.0.1:8910";
const EDGE = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));

if (!EDGE) { console.error("未找到 Edge"); process.exit(1); }

const PORT = 9333;
const profile = path.join(os.tmpdir(), "cdp-profile-" + Date.now());

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) { /* 还没起来 */ }
    await sleep(250);
  }
  throw new Error("CDP 未就绪");
}

(async () => {
  const proc = spawn(EDGE, [
    "--headless=new", `--remote-debugging-port=${PORT}`,
    "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    // 本机代理会拦截 127.0.0.1，导致页面加载成 chrome-error://
    "--no-proxy-server", "--proxy-bypass-list=*",
    `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });

  let ws, id = 0;
  const pending = new Map();
  const errors = [];
  const consoleErrs = [];

  try {
    const wsUrl = await getWsUrl();
    ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
      if (m.method === "Runtime.exceptionThrown") {
        const d = m.params.exceptionDetails;
        errors.push((d.exception && d.exception.description) || d.text);
      }
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
        consoleErrs.push(m.params.args.map((a) => a.value || a.description || "").join(" "));
      }
    };

    const send = (method, params = {}) => new Promise((res) => {
      const mid = ++id;
      pending.set(mid, res);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

    await send("Runtime.enable");
    await send("Page.enable");

    // headless Edge 默认 prefers-reduced-motion: reduce，会让动效全部关闭。
    // 这里模拟普通用户环境（无该偏好），才能验到粒子等动效是否真的在跑。
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });

    async function goto(url) {
      await send("Page.navigate", { url });
      await sleep(2600);
    }

    async function evalJS(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.result && r.result.exceptionDetails) {
        return { err: r.result.exceptionDetails.text };
      }
      return r.result && r.result.result ? r.result.result.value : null;
    }

    const results = [];
    const check = (name, ok, detail) => {
      results.push({ name, ok, detail });
      console.log("  " + (ok ? "✓" : "✗") + " " + name + (detail && !ok ? "  → " + detail : ""));
    };

    /* ============ 首页 ============ */
    console.log("\n=== 首页 ===");
    await goto(BASE + "/index.html");

    const title = await evalJS("document.title");
    check("标题渲染", /个人项目站/.test(title || ""), title);

    const projects = await evalJS("window.PROJECTS && window.PROJECTS.length");
    check("数据源加载", projects === 19, "实际 " + projects);

    const cards = await evalJS("document.querySelectorAll('.pcard').length");
    check("精选卡片渲染", cards === 4, "实际 " + cards);

    const stats = await evalJS("Array.from(document.querySelectorAll('[data-stats] [data-count]')).map(e=>e.dataset.count).join(',')");
    check("统计数字自动填入", stats === "19,7,11,6", "实际 " + stats);

    // 分类标签在 work.html（首页没有这个元素）
    const homeCatTags = await evalJS("document.querySelectorAll('[data-cat-tags] .tag').length");
    check("首页无分类标签容器（预期 0）", homeCatTags === 0, "实际 " + homeCatTags);

    const canvasOn = await evalJS("document.getElementById('flow') && document.getElementById('flow').classList.contains('is-on')");
    check("粒子画布已激活", canvasOn === true, String(canvasOn));

    // 拆字：span 在 [data-split] 元素内部
    const splitSpans = await evalJS("document.querySelectorAll('[data-split] span').length");
    check("标题已拆字", splitSpans >= 8, "实际 " + splitSpans);

    // 点击精选卡片链接应指向 GitHub
    const href = await evalJS("(document.querySelector('.pcard__repo')||{}).getAttribute ? document.querySelector('.pcard__repo').getAttribute('href') : ''");
    check("卡片仓库链接正确", /^https:\/\/github\.com\/uahz\//.test(href || ""), href);

    /* ============ 项目页 + 筛选 ============ */
    console.log("\n=== 项目页 ===");
    await goto(BASE + "/work.html");

    const allCards = await evalJS("document.querySelectorAll('.pcard').length");
    check("全部项目渲染", allCards === 19, "实际 " + allCards);

    const btns = await evalJS("document.querySelectorAll('.fbtn').length");
    check("筛选按钮数", btns === 7, "实际 " + btns);

    const catTags = await evalJS("document.querySelectorAll('[data-cat-tags] .tag').length");
    check("分类标签自动生成", catTags === 7, "实际 " + catTags);

    // 点「移动端」筛选
    await evalJS("document.querySelector('.fbtn[data-f=\"mobile\"]').click()");
    await sleep(500);
    const mobVisible = await evalJS("Array.from(document.querySelectorAll('.pcard')).filter(c=>!c.hidden).length");
    check("筛选「移动端」→ 1 个", mobVisible === 1, "实际 " + mobVisible);

    const mobName = await evalJS("String((function(){var v=Array.from(document.querySelectorAll('.pcard')).filter(c=>!c.hidden)[0];return v?v.querySelector('.pcard__cn').textContent:''})())");
    check("移动端筛选命中 LPdf", mobName === "LPdf 阅读器", mobName);

    const count = await evalJS("String(document.querySelector('[data-fcount]').textContent)");
    check("计数回写", /1 \/ 19/.test(count || ""), count);

    // 回到全部
    await evalJS("document.querySelector('.fbtn[data-f=\"all\"]').click()");
    await sleep(400);
    const backAll = await evalJS("Array.from(document.querySelectorAll('.pcard')).filter(c=>!c.hidden).length");
    check("切回全部 → 19 个", backAll === 19, "实际 " + backAll);

    // 展开详情
    await evalJS("(function(){var d=document.querySelector('.pcard__more');if(d)d.open=true;return 1})()");
    const detailsOpen = await evalJS("document.querySelector('.pcard__more').open");
    check("详情可展开", detailsOpen === true, String(detailsOpen));

    /* ============ 导航跳转 ============ */
    console.log("\n=== 导航 ===");
    await goto(BASE + "/index.html");
    await evalJS("document.querySelector('a[href=\"work.html\"].btn').click()");
    await sleep(1400);
    const afterNav = await evalJS("location.pathname + location.search");
    check("首页 CTA 跳转到项目页", /work\.html/.test(afterNav || ""), afterNav);

    await goto(BASE + "/work.html");
    await evalJS("document.querySelector('.nav__l[href=\"index.html\"]').click()");
    await sleep(1400);
    const backHome = await evalJS("location.pathname");
    check("项目页导航回首页", /index\.html|\/$/.test(backHome || ""), backHome);

    /* ============ 404 ============ */
    // 注意：python http.server 对不存在路径返回它自带的 404，不走我们的 404.html。
    // 这里直接打开 404.html 验证内容（GitHub Pages 才会用它兜底）。
    console.log("\n=== 404 ===");
    await goto(BASE + "/404.html");
    const nf = await evalJS("String((document.querySelector('.nf__n')||{}).textContent||'')");
    check("404 兜底页内容", nf === "404", nf);
    const nfFlow = await evalJS("!!document.getElementById('flow')");
    check("404 页也有粒子画布", nfFlow === true, String(nfFlow));

    /* ============ 运行时错误 ============ */
    console.log("\n=== 运行时 ===");
    check("无未捕获异常", errors.length === 0, errors.slice(0, 3).join(" | "));
    check("无 console.error", consoleErrs.length === 0, consoleErrs.slice(0, 3).join(" | "));

    const failed = results.filter((r) => !r.ok);
    console.log("\n" + "=".repeat(50));
    console.log("通过 " + (results.length - failed.length) + " / " + results.length);
    if (failed.length) { console.log("失败项："); failed.forEach((f) => console.log("  - " + f.name)); }
  } catch (e) {
    console.error("异常:", e.message);
    process.exitCode = 1;
  } finally {
    try { ws && ws.close(); } catch (e) {}
    try { proc.kill(); } catch (e) {}
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  }
})();