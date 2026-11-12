/**
 * 一键部署：把本地站点推送到 GitHub。
 *
 * 用法：
 *   node scripts/deploy.cjs <TOKEN>
 * 或
 *   SK=<token> node scripts/deploy.cjs
 *
 * 说明：git over HTTPS 在本机常被代理阻断，且 Contents API 每次只能传一个文件，
 * 所以这里用 Git 的 Data API（git/trees + git/commits + git/refs）一次性提交整棵树。
 * 需要 token 具备该仓库的 contents:write 权限。
 */
const https = require("https");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OWNER = "uahz";
const REPO = "uahz.github.io";
const BRANCH = "main";
const SITE = "https://" + OWNER + ".github.io";

const TOKEN = process.argv[2] || process.env.SK;
if (!TOKEN) {
  console.error("需要 token：node scripts/deploy.cjs <TOKEN>");
  process.exit(1);
}

/* ---------- 站点需要推送的文件 ----------
   注意：主入口 index.html 由「../作品集单页/deploy-pages.cjs」负责，
   这里【不能】推 index.html，否则会把亮色作品集主页覆盖成旧的暗色多页站主页。
   本仓库现在只承担归档：work.html / 404.html / assets / scripts。 */
const INCLUDE = [
  ".gitignore", ".nojekyll", "404.html", "README.md",
  "work.html",
  "assets/css/style.css",
  "assets/js/main.js", "assets/js/projects.js",
  "assets/img/favicon.svg",
];

/* scripts/ 下也同步，方便线上排查 */
const SCRIPT_EXT = [".cjs", ".py"];

function api(method, url, body) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(url, {
      method,
      headers: {
        Authorization: "token " + TOKEN,
        Accept: "application/vnd.github+json",
        "User-Agent": "deploy-bot",
        "Content-Type": "application/json",
        "Content-Length": data ? Buffer.byteLength(data) : 0,
      },
    }, (r) => {
      let s = "";
      r.on("data", (d) => (s += d));
      r.on("end", () => {
        try { res(JSON.parse(s)); } catch (e) { res({ raw: s }); }
      });
    });
    req.on("error", rej);
    if (data) req.write(data);
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function collectFiles() {
  const files = [...INCLUDE];
  const sdir = path.join(ROOT, "scripts");
  if (fs.existsSync(sdir)) {
    fs.readdirSync(sdir).forEach((f) => {
      if (SCRIPT_EXT.some((e) => f.endsWith(e))) files.push("scripts/" + f);
    });
  }
  return files.filter((f) => fs.existsSync(path.join(ROOT, f)));
}

(async () => {
  const base = "https://api.github.com/repos/" + OWNER + "/" + REPO;

  // 1. 拿当前 ref
  const ref = await api("GET", base + "/git/ref/heads/" + BRANCH);
  if (!ref.object) {
    console.error("✗ 拿不到分支 ref：", ref.message || JSON.stringify(ref).slice(0, 200));
    process.exit(1);
  }
  const baseCommit = ref.object.sha;
  console.log("当前远端 commit: " + baseCommit.slice(0, 7));

  // 2. 构造 tree
  const tree = [];
  for (const f of collectFiles()) {
    const buf = fs.readFileSync(path.join(ROOT, f));
    tree.push({
      path: f,
      mode: "100644",
      type: "blob",
      // 关键：git/trees 的 content 字段要的是【纯文本内容】，不是 base64！
      // 只有 Contents API (PUT /repos/{o}/{r}/contents/{path}) 才要 base64。
      // 这里若传 base64，GitHub 会把那串字符当成文件内容原样存下来，
      // 线上页面就变成一整段 base64 乱码，而 API 仍返回 200、Pages 仍显示 built。
      content: buf.toString("utf8"),
    });
  }
  console.log("准备提交 " + tree.length + " 个文件");

  const treeRes = await api("POST", base + "/git/trees", {
    tree,
    base_tree: baseCommit,
  });
  if (!treeRes.sha) {
    console.error("✗ 建 tree 失败：", treeRes.message || JSON.stringify(treeRes).slice(0, 300));
    process.exit(1);
  }
  console.log("新 tree: " + treeRes.sha.slice(0, 7));

  // 3. 建 commit
  const commit = await api("POST", base + "/git/commits", {
    message: process.env.MSG || "chore: 同步站点更新",
    tree: treeRes.sha,
    parents: [baseCommit],
  });
  if (!commit.sha) {
    console.error("✗ 建 commit 失败：", commit.message || JSON.stringify(commit).slice(0, 300));
    process.exit(1);
  }
  console.log("新 commit: " + commit.sha.slice(0, 7));

  // 4. 推 ref
  const upd = await api("PATCH", base + "/git/refs/heads/" + BRANCH, {
    sha: commit.sha,
    force: false,
  });
  if (!upd.object) {
    console.error("✗ 更新 ref 失败：", upd.message || JSON.stringify(upd).slice(0, 300));
    process.exit(1);
  }
  console.log("✓ 已推送 → " + commit.sha.slice(0, 7));

  // 5. 等 Pages 重建
  console.log("\n等待 GitHub Pages 重建（约 30–60 秒）...");
  for (let i = 0; i < 12; i++) {
    await sleep(10000);
    const pages = await api("GET", base + "/pages/builds/latest");
    const st = pages.status || "?";
    process.stdout.write("  构建状态: " + st + "\r");
    if (st === "built") {
      console.log("\n✓ 构建完成");
      break;
    }
    if (st === "errored") {
      console.log("\n✗ 构建失败");
      process.exit(1);
    }
  }

  // 6. 线上验证
  console.log("\n线上验证：");
  for (const p of ["", "work.html", "assets/js/projects.js", "assets/css/style.css"]) {
    const r = await new Promise((res) => {
      https.get(SITE + "/" + p, { headers: { "User-Agent": "deploy-check" } }, (x) => {
        x.resume();
        res(x.statusCode);
      }).on("error", () => res(0));
    });
    console.log("  " + (r === 200 ? "✓" : "✗") + " " + r + "  /" + p);
  }
  console.log("\n线上地址: " + SITE);
})();