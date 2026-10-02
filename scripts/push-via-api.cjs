/**
 * 一次性工具：git HTTPS 被代理隧道阻断时，改用 REST API 推送文件。
 * 用法：SK=xxx node scripts/push-via-api.cjs scripts/check-live.cjs "commit message"
 */
const fs = require("fs");
const https = require("https");
const path = require("path");

const SK = process.env.SK;
const REPO = "uahz/uahz.github.io";
const BRANCH = "main";

const files = process.argv.slice(2).filter((a) => a !== process.argv[2] || !a.startsWith("commit"));
const file = process.argv[2];
const msg = process.argv[3] || "update";

if (!SK || !file) {
  console.error("用法：SK=xxx node scripts/push-via-api.cjs <file> <msg>");
  process.exit(1);
}

function api(method, url, body) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(url, {
      method,
      headers: {
        Authorization: "token " + SK,
        Accept: "application/vnd.github+json",
        "User-Agent": "push-bot",
        "Content-Type": "application/json",
        "Content-Length": data ? Buffer.byteLength(data) : 0,
      },
    }, (r) => {
      let s = "";
      r.on("data", (d) => (s += d));
      r.on("end", () => { try { res(JSON.parse(s)); } catch (e) { res({ raw: s }); } });
    });
    req.on("error", rej);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const base = "https://api.github.com/repos/" + REPO;
  const abs = path.resolve(file);
  const content = fs.readFileSync(abs).toString("base64");

  // 已存在则需要带 sha
  const cur = await api("GET", base + "/contents/" + file + "?ref=" + BRANCH);
  const body = { message: msg, content, branch: BRANCH };
  if (cur && cur.sha) body.sha = cur.sha;

  const r = await api("PUT", base + "/contents/" + file, body);
  if (r.commit) {
    console.log("✓ " + file + " → " + r.commit.sha.slice(0, 7));
  } else {
    console.error("✗ " + (r.message || JSON.stringify(r).slice(0, 200)));
    process.exit(1);
  }
})();