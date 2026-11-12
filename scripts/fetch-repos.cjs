/** 拉取指定仓库的详细元数据（公开 API，无需鉴权） */
const https = require("https");
const names = process.argv.slice(2);

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { "User-Agent": "site-updater", Accept: "application/vnd.github+json" } }, (r) => {
      let s = "";
      r.on("data", (d) => (s += d));
      r.on("end", () => { try { res(JSON.parse(s)); } catch (e) { res({ _raw: s }); } });
    }).on("error", rej);
  });
}

(async () => {
  const out = [];
  for (const n of names) {
    const r = await get("https://api.github.com/repos/uahz/" + n);
    if (!r.full_name) { console.log("✗ " + n + " — " + (r.message || "获取失败")); continue; }
    out.push({
      n: r.name, d: r.description, lang: r.language, home: r.homepage,
      topics: r.topics || [], upd: (r.updated_at || "").slice(0, 10),
      cre: (r.created_at || "").slice(0, 10), stars: r.stargazers_count,
      site: r.has_pages, size: r.size, arch: r.archived,
    });
    console.log("### " + r.name);
    console.log("  语言: " + r.language + " | ★" + r.stargazers_count + " | Pages: " + r.has_pages);
    console.log("  创建: " + (r.created_at || "").slice(0, 10) + " | 更新: " + (r.updated_at || "").slice(0, 10));
    console.log("  主页: " + (r.homepage || "-"));
    console.log("  描述: " + r.description);
    console.log("  标签: " + (r.topics || []).join(", "));
    console.log("");
  }
  require("fs").writeFileSync(__dirname + "/../.gh-new.json", JSON.stringify(out, null, 1));
  console.log("已写出 .gh-new.json");
})();