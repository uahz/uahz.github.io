/** 统计「纯前端」项目数（技术栈含 HTML 或 JavaScript） */
const fs = require("fs");
const path = require("path");
const d = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "projects.js"), "utf8");

const blocks = d.split(/\n  \{\n/).slice(1);
let fe = 0;
blocks.forEach((b) => {
  const id = (b.match(/id:\s*"([^"]+)"/) || [])[1];
  const tech = (b.match(/tech:\s*\[([\s\S]*?)\]/) || ["", ""])[1];
  const isFe = /HTML|JavaScript/.test(tech);
  if (isFe) fe++;
  console.log((isFe ? "前端 " : "桌面 ") + id);
});
console.log("\n纯前端: " + fe + " / 共 " + blocks.length);
