/** 列出每个项目的 demo 链接类型（在线站点 / 仓库） */
const fs = require("fs");
const path = require("path");
const d = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "projects.js"), "utf8");

const re = /id:\s*"([^"]+)"[\s\S]*?demo:\s*"([^"]+)"/g;
let m;
let online = 0, repo = 0;
const rows = [];
while ((m = re.exec(d))) {
  const isOnline = m[2].indexOf("github.com/") === -1;
  isOnline ? online++ : repo++;
  rows.push([isOnline ? "在线" : "仓库", m[1], m[2]]);
}
rows.forEach((r) => console.log("  " + r[0] + "  " + r[1].padEnd(28) + r[2]));
console.log("\n有在线站点: " + online + "  仅仓库: " + repo + "  合计: " + (online + repo));
