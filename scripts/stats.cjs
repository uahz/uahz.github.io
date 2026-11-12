/** 统计项目分类分布与精选数量 */
const fs = require("fs");
const path = require("path");
const d = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "projects.js"), "utf8");

const items = [];
let cur = null;
for (const line of d.split("\n")) {
  let m = line.match(/^\s*id:\s*"([^"]+)"/);
  if (m) { cur = { id: m[1], cat: null, featured: false }; items.push(cur); continue; }
  m = line.match(/^\s*cat:\s*"(\w+)"/);
  if (m && cur) { cur.cat = m[1]; continue; }
  if (/featured:\s*true/.test(line) && cur) cur.featured = true;
}

const cnt = {};
items.forEach((i) => { if (i.cat) cnt[i.cat] = (cnt[i.cat] || 0) + 1; });
const feat = items.filter((i) => i.featured);

console.log("总数: " + items.length);
console.log("分类: " + JSON.stringify(cnt));
console.log("精选: " + feat.length + " → " + feat.map((f) => f.id).join(", "));
console.log("\n明细:");
items.forEach((i) => console.log("  " + i.id.padEnd(28) + i.cat.padEnd(8) + (i.featured ? "★" : "")));
