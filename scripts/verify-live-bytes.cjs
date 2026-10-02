/** 按原始字节比对线上与本地文件，定位真正的内容差异 */
const https = require("https");
const fs = require("fs");
const crypto = require("crypto");

function getBuf(u) {
  return new Promise((res, rej) => {
    https.get(u, { headers: { "User-Agent": "c" } }, (r) => {
      const c = [];
      r.on("data", (d) => c.push(d));
      r.on("end", () => res(Buffer.concat(c)));
    }).on("error", rej);
  });
}

(async () => {
  const files = [
    "index.html", "work.html", "404.html",
    "assets/css/style.css", "assets/js/main.js", "assets/js/projects.js",
    "assets/img/favicon.svg", "scripts/check-live.cjs",
    "scripts/push-via-api.cjs", "scripts/verify-site.cjs", "README.md",
  ];
  let same = 0, diff = 0;
  for (const f of files) {
    const live = await getBuf("https://uahz.github.io/" + f);
    const loc = fs.readFileSync(f);
    const a = live.toString("utf8").replace(/\r\n/g, "\n");
    const b = loc.toString("utf8").replace(/\r\n/g, "\n");
    // 线上是否有乱码：解码后出现替换字符 U+FFFD
    const hasGarbled = live.toString("utf8").includes("\uFFFD");
    const ok = a === b && !hasGarbled;
    console.log(
      "  " + (ok ? "✓" : "✗") + " " + f.padEnd(26) +
      " 线上" + String(live.length).padStart(6) +
      "B  本地" + String(loc.length).padStart(6) + "B" +
      (hasGarbled ? "  ← 含乱码" : "") +
      (ok ? "" : "  ← 内容不同")
    );
    ok ? same++ : diff++;
  }
  console.log("\n字节级一致 " + same + " / 不一致 " + diff);
})();