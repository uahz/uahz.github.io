# -*- coding: utf-8 -*-
"""按行号替换 main.js 中的 splitText 函数（避免 Edit 工具的不可见字符匹配问题）"""
import io
import os

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "js", "main.js")

NEW = '''  function splitText() {
    document.querySelectorAll("[data-split]").forEach(function (root) {
      // 拆之前先记住内部哪些子元素带 class
      var inner = [];
      root.querySelectorAll("*").forEach(function (el) {
        if (el.className) inner.push({ el: el, cls: el.className });
      });

      // 只对 root 的直接文本节点做拆分，保留子元素结构
      Array.prototype.slice.call(root.childNodes).forEach(function (node) {
        if (node.nodeType !== 3) return;
        var txt = node.textContent;
        if (!txt.trim()) return;
        var frag = document.createDocumentFragment();
        txt.split("").forEach(function (ch) {
          var s = document.createElement("span");
          s.textContent = ch === " " ? " " : ch;
          frag.appendChild(s);
        });
        root.replaceChild(frag, node);
      });

      // 让内层元素（如渐变 span）里的字也参与逐字动画
      inner.forEach(function (rec) {
        var txt = rec.el.textContent;
        rec.el.textContent = "";
        txt.split("").forEach(function (ch) {
          var s = document.createElement("span");
          s.textContent = ch === " " ? " " : ch;
          rec.el.appendChild(s);
        });
      });
    });
  }'''

with io.open(P, "r", encoding="utf-8", newline="") as f:
    lines = f.readlines()

# 定位 function splitText() 到其闭合的 "  }"
start = None
for i, l in enumerate(lines):
    if l.rstrip("\r\n").strip() == "function splitText() {":
        start = i
        break
if start is None:
    raise SystemExit("未找到 splitText")

end = None
for j in range(start + 1, len(lines)):
    if lines[j].rstrip("\r\n") == "  }":
        end = j
        break
if end is None:
    raise SystemExit("未找到函数结尾")

print("替换第 %d..%d 行" % (start + 1, end + 1))
print("原内容首行:", lines[start].rstrip())

out = lines[:start] + [NEW + "\n"] + lines[end + 1:]
with io.open(P, "w", encoding="utf-8", newline="") as f:
    f.writelines(out)
print("写入完成")
