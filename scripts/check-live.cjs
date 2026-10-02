/** 线上内容抽检：确认部署的产物与本地一致 */
const https = require("https");

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { "User-Agent": "check" } }, (r) => {
      let s = "";
      r.on("data", (d) => (s += d));
      r.on("end", () => res(s));
    }).on("error", rej);
  });
}

(async () => {
  const base = "https://uahz.github.io";
  console.log("=== projects.js 数据抽检 ===");
  const js = await get(base + "/assets/js/projects.js");
  const ids = [...js.matchAll(/^\s*id:\s*"([^"]+)"/gm)].map((m) => m[1]);
  const banned = ["JcJgame", "file-mark-remover", "my-tiku-api"];
  console.log("  项目数:", ids.length);
  console.log("  被排除的 3 个是否混入:", banned.filter((x) => ids.includes(x)).join(", ") || "否 ✓");
  console.log("  前 5 个:", ids.slice(0, 5).join(", "));
  console.log("  末 3 个:", ids.slice(-3).join(", "));

  console.log("\n=== work.html 抽检 ===");
  const w = await get(base + "/work.html");
  console.log("  title:", (w.match(/<title>([^<]+)/) || [])[1]);
  const fbs = [...w.matchAll(/data-f="(\w+)"/g)].map((m) => m[1]);
  console.log("  筛选项:", fbs.join(", "));
  console.log("  引 projects.js:", /projects\.js/.test(w));

  console.log("\n=== 关键项目链接抽检（线上可访问性）===");
  const links = [...js.matchAll(/demo:\s*"(https:[^"]+)"/g)].map((m) => m[1]);
  console.log("  demo 链接总数:", links.length);
  const uniq = [...new Set(links)].filter((u) => u.includes("uahz.github.io"));
  for (const u of uniq) {
    await new Promise((res) => {
      https.get(u, { headers: { "User-Agent": "check" } }, (r) => {
        console.log("   ", r.statusCode, u.replace(base, ""));
        res();
      }).on("error", () => { console.log("    ERR", u); res(); });
    });
  }

  console.log("\n=== 404 抽检 ===");
  const nf = await get(base + "/definitely-not-a-page-9x8y7z");
  console.log("  含兜底文案:", /这个页面不存在/.test(nf));
  console.log("  含粒子画布:", /id="flow"/.test(nf));
})();