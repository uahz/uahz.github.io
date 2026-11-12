/** 截图：首页首屏 / 首页精选区 / 项目页 / 移动端 */
const { spawn } = require("child_process");
const os = require("os"), path = require("path"), fs = require("fs");

const BASE = process.argv[2] || "http://127.0.0.1:8911";
const OUT = path.join(__dirname, "..", ".shots");
const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((p) => fs.existsSync(p));
const PORT = 9336;
const profile = path.join(os.tmpdir(), "shot-" + Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const proc = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`,
    "--disable-gpu", "--no-first-run", "--no-proxy-server", "--proxy-bypass-list=*",
    "--hide-scrollbars", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });

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

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });

  async function shot(name, url, w, h, scrollY, wait) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
    await send("Page.navigate", { url });
    await sleep(wait || 3000);
    if (scrollY) {
      await send("Runtime.evaluate", { expression: `window.scrollTo(0,${scrollY})` });
      await sleep(1400);
    }
    const r = await send("Page.captureScreenshot", { format: "png" });
    const p = path.join(OUT, name + ".png");
    fs.writeFileSync(p, Buffer.from(r.result.data, "base64"));
    console.log("  " + name + ".png  " + fs.statSync(p).size + "B");
  }

  console.log("截图：");
  await shot("01-home-hero", BASE + "/index.html", 1440, 900, 0, 3600);
  await shot("02-home-featured", BASE + "/index.html", 1440, 900, 1000, 3600);
  await shot("03-home-terminal", BASE + "/index.html", 1440, 900, 1900, 3600);
  await shot("04-work-grid", BASE + "/work.html", 1440, 900, 700, 3600);
  await shot("05-mobile-home", BASE + "/index.html", 390, 844, 0, 3400);
  await shot("06-mobile-work", BASE + "/work.html", 390, 844, 600, 3400);

  proc.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
})();