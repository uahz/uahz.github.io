/** 排查粒子画布在 headless 下的状态 */
const { spawn } = require("child_process");
const os = require("os"), path = require("path"), fs = require("fs");

const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((p) => fs.existsSync(p));
const PORT = 9335;
const profile = path.join(os.tmpdir(), "dbg2-" + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const proc = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`,
    "--disable-gpu", "--no-first-run", "--no-proxy-server", "--proxy-bypass-list=*",
    `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  let ws, id = 0;
  const pending = new Map();
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const l = await r.json();
      const pg = l.find((t) => t.type === "page");
      if (pg) { ws = new WebSocket(pg.webSocketDebuggerUrl); break; }
    } catch (e) {}
    await sleep(250);
  }
  await new Promise((res) => { ws.onopen = res; });
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:8911/index.html" });

  for (const t of [1000, 3000, 6000]) {
    await sleep(t === 1000 ? 1000 : 2000);
    const r = await send("Runtime.evaluate", {
      expression: `(function(){
        var cv=document.getElementById('flow');
        if(!cv) return 'no canvas';
        var ctx=cv.getContext('2d');
        var px=ctx.getImageData(cv.width>>1, cv.height>>1, 1, 1).data;
        return JSON.stringify({
          hasOn: cv.classList.contains('is-on'),
          w: cv.width, h: cv.height,
          display: getComputedStyle(cv).display,
          opacity: getComputedStyle(cv).opacity,
          centerPixel: [px[0],px[1],px[2],px[3]],
          raf: typeof requestAnimationFrame
        });
      })()`, returnByValue: true,
    });
    console.log("t=" + t + "ms:", r.result.result.value);
  }

  // 检查 reduced-motion
  const rm = await send("Runtime.evaluate", {
    expression: "matchMedia('(prefers-reduced-motion: reduce)').matches", returnByValue: true });
  console.log("prefers-reduced-motion:", rm.result.result.value);

  proc.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
})();