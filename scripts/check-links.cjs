/**
 * 链接存活检查：逐个探测站内所有外链是否仍可访问。
 * 用途：项目仓库被删除或转私有时，及时发现并下架。
 *
 * 用法：node scripts/check-links.cjs
 */
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const SITE = "https://uahz.github.io";
const ROOT = path.join(__dirname, "..");

function head(url, redirects = 0) {
  return new Promise((resolve) => {
    const mod = url.startsWith("http://") ? http : https;
    const req = mod.request(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0 (link-check)", Accept: "*/*" },
      timeout: 12000,
    }, (r) => {
      // HEAD 不被支持时退回 GET，但立即断开
      r.resume();
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && redirects < 5) {
        const next = new URL(r.headers.location, url).toString();
        r.destroy();
        resolve(head(next, redirects + 1));
        return;
      }
      resolve({ code: r.statusCode, final: url });
    });
    req.on("error", (e) => resolve({ code: 0, err: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ code: 0, err: "timeout" }); });
    req.end();
  });
}

/** 收集所有 URL */
function collect() {
  const urls = new Set();
  const pjs = fs.readFileSync(path.join(ROOT, "assets", "js", "projects.js"), "utf8");
  for (const m of pjs.matchAll(/demo:\s*"(https:[^"]+)"/g)) urls.add(m[1]);
  for (const m of pjs.matchAll(/^\s*id:\s*"([^"]+)"/gm)) {
    urls.add("https://github.com/uahz/" + m[1]);
  }
  for (const f of ["index.html", "work.html", "404.html"]) {
    const s = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const m of s.matchAll(/href="(https:[^"]+)"/g)) urls.add(m[1]);
  }
  return [...urls];
}

(async () => {
  const urls = collect();
  console.log("检查 " + urls.length + " 个外链...\n");
  let ok = 0, bad = [];
  for (const u of urls) {
    const r = await head(u);
    const label = u.replace(SITE, "").replace("https://github.com/uahz/", "gh:").replace("https://", "");
    if (r.code >= 200 && r.code < 400) {
      ok++;
      console.log("  ✓ " + String(r.code) + "  " + label);
    } else {
      bad.push({ u, code: r.code, err: r.err });
      console.log("  ✗ " + (r.code || "ERR") + "  " + label + (r.err ? "  (" + r.err + ")" : ""));
    }
  }
  console.log("\n可达 " + ok + " / 失效 " + bad.length);
  if (bad.length) {
    console.log("\n失效清单（需从 projects.js 下架或换链接）：");
    bad.forEach((b) => console.log("  - " + b.u + "  [" + (b.code || b.err) + "]"));
    process.exitCode = 1;
  }
})();