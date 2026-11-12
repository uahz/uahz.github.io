/**
 * 线上内容完整性检查：确认 Pages 返回的不是 base64 文本。
 *
 * 背景：Git Data API 的 git/trees 里 content 要纯文本，若误传 base64，
 * GitHub 会把那串字符当文件内容原样存下，API 返回 200、Pages 显示 built，
 * 但浏览器打开是一整段 base64 —— 只验状态码完全发现不了。
 *
 * 用法：node scripts/check-not-base64.cjs [baseUrl]
 */
const https = require("https");

const BASE = process.argv[2] || "https://uahz.github.io";
const PATHS = [
  "/", "/work.html", "/404.html",
  "/assets/css/style.css", "/assets/js/main.js",
  "/assets/js/projects.js", "/assets/img/favicon.svg",
  "/README.md",
];

function get(p) {
  return new Promise((res) => {
    https.get(BASE + p, { headers: { "User-Agent": "content-check" } }, (r) => {
      const chunks = [];
      r.on("data", (d) => chunks.push(d));
      r.on("end", () => res({ code: r.statusCode, buf: Buffer.concat(chunks) }));
    }).on("error", () => res({ code: 0, buf: Buffer.alloc(0) }));
  });
}

(async () => {
  let bad = 0;
  console.log("检查 " + BASE + " 的内容是否被 base64 二次编码\n");
  for (const p of PATHS) {
    const r = await get(p);
    const head = r.buf.toString("utf8").slice(0, 120);
    // base64 文本特征：整行由 [A-Za-z0-9+/=] 组成，或以 <!DOCTYPE 的 base64 开头
    const looksB64 = /^PCFET0NUWVBFIGh0bWw/.test(head) ||
      (/^[A-Za-z0-9+/=]+$/.test(head.replace(/\s/g, "")) && head.length > 60);
    const ok = r.code === 200 && !looksB64 && head.length > 0;
    console.log("  " + (ok ? "✓" : "✗") + " " + String(r.code).padEnd(4) +
      "  " + p.padEnd(28) + " " + JSON.stringify(head.slice(0, 42)));
    if (!ok) bad++;
  }
  console.log("\n正常 " + (PATHS.length - bad) + " / 异常 " + bad);
  if (bad) process.exitCode = 1;
})();