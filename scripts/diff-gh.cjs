/** 对比 GitHub 最新仓库列表与站点已收录项目，输出差异 */
const fs = require("fs");
const path = require("path");

const RAW = process.argv[2];
const dir = path.dirname(RAW);
const files = fs.readdirSync(dir).filter((f) => f.startsWith("mcp-github-search_repositories-"));
files.sort();
const latest = files[files.length - 1];
const data = JSON.parse(fs.readFileSync(path.join(dir, latest), "utf8"));
const arr = data.items || data;

const site = [...fs.readFileSync(path.join(__dirname, "..", "assets", "js", "projects.js"), "utf8")
  .matchAll(/^\s*id:\s*"([^"]+)"/gm)].map((m) => m[1]);

console.log("GitHub 最新仓库：" + arr.length + " 个\n");
console.log("=== 全部仓库（按更新时间排序）===");
arr.forEach((r) => {
  const on = site.includes(r.name) ? "[站内]" : "[未收录]";
  const star = r.stargazers_count ? " ★" + r.stargazers_count : "";
  const site2 = r.has_pages ? " Pages" : "";
  const home = r.homepage ? " " + r.homepage.replace("https://", "") : "";
  console.log(
    on.padEnd(10) + "[" + (r.language || "-") + "]" +
    (r.name + star + site2).padEnd(34) +
    (r.updated_at || "").slice(0, 10) +
    home
  );
  console.log("           " + (r.description || "(无描述)").slice(0, 150));
});

const siteSet = new Set(site);
const onSite = arr.filter((r) => siteSet.has(r.name));
const notOnSite = arr.filter((r) => !siteSet.has(r.name));
const stale = site.filter((id) => !arr.find((r) => r.name === id));

console.log("\n=== 差异 ===");
console.log("站内已收录且 GitHub 仍存在: " + onSite.length);
console.log("GitHub 新增（未收录）:");
notOnSite.forEach((r) => console.log("  + " + r.name + "  [" + r.language + "] " + (r.description || "").slice(0, 90)));
console.log("站内已收录但 GitHub 已删除/改名:");
stale.forEach((s) => console.log("  - " + s));

fs.writeFileSync(path.join(__dirname, "..", ".gh-latest.json"), JSON.stringify(arr.map((r) => ({
  n: r.name, d: r.description, lang: r.language, home: r.homepage,
  topics: r.topics || [], upd: (r.updated_at || "").slice(0, 10),
  cre: (r.created_at || "").slice(0, 10), stars: r.stargazers_count,
  site: r.has_pages, size: r.size, fork: r.fork, arch: r.archived,
})), null, 1));
console.log("\n已写出 .gh-latest.json");
