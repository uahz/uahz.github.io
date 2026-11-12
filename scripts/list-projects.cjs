/** 列出站点当前收录的项目 id */
const fs = require("fs");
const path = require("path");
const d = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "projects.js"), "utf8");
const ids = [...d.matchAll(/^\s*id:\s*"([^"]+)"/gm)].map((m) => m[1]);
console.log(ids.length + " 个项目：");
ids.forEach((x, i) => console.log("  " + (i + 1) + ". " + x));
