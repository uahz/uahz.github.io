/* ============================================================
   uahz · 站点交互
   1 粒子流场引擎（Perlin 噪声）
   2 鼠标光晕 / 滚动进度
   3 导航（汉堡 / 高亮 / 滚动阴影）
   4 逐字入场 / 数字滚动 / 打字机
   5 卡片 3D 倾斜 + 跟随高光
   6 项目渲染 + 分类筛选
   7 深链定位 / 表单回执
   ============================================================ */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var USER = "uahz";

  /* ==========================================================
     1. 粒子流场引擎
     经典 Perlin 噪声实现，粒子沿噪声场运动形成湍流。
     帧率优先：连续掉帧时自动减少粒子数。
     ========================================================== */
  function initFlow() {
    var cv = document.getElementById("flow");
    if (!cv) return;
    if (REDUCED) { cv.style.display = "none"; return; }

    var ctx = cv.getContext("2d", { alpha: true });
    var W = 0, H = 0, DPR = 1;
    var particles = [];
    var COLORS = ["45,212,191", "167,139,250", "251,191,36"];
    var running = true;
    var lastT = 0;
    var slowFrames = 0;
    var pointer = { x: -999, y: -999, active: false };

    // ---- Perlin 噪声 ----
    var perm = new Uint8Array(512);
    (function seedPerm() {
      var p = [];
      for (var i = 0; i < 256; i++) p[i] = i;
      for (var j = 255; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var t = p[j]; p[j] = p[k]; p[k] = t;
      }
      for (var m = 0; m < 512; m++) perm[m] = p[m & 255];
    })();

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + t * (b - a); }
    function grad(h, x, y) {
      switch (h & 3) {
        case 0: return x + y;
        case 1: return -x + y;
        case 2: return x - y;
        default: return -x - y;
      }
    }
    function noise2(x, y) {
      var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      var xf = x - Math.floor(x), yf = y - Math.floor(y);
      var u = fade(xf), v = fade(yf);
      var aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
      var ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
      return lerp(
        lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
        lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
        v
      );
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.floor(W * DPR);
      cv.height = Math.floor(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
    }

    function P() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.max = 120 + Math.random() * 260;
      this.life = Math.random() * this.max;
      this.w = 0.15 + Math.random() * 0.55;
      this.c = COLORS[(Math.random() * COLORS.length) | 0];
    }
    P.prototype.step = function () {
      var a = noise2(this.x * 0.0016, this.y * 0.0016) * Math.PI * 2.4;
      if (pointer.active) {
        var dx = pointer.x - this.x, dy = pointer.y - this.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 42000 && d2 > 1) a += Math.atan2(dy, dx) * 0.35;
      }
      this.x += Math.cos(a) * this.w;
      this.y += Math.sin(a) * this.w;
      this.life -= 1;
      if (this.life <= 0 || this.x < -30 || this.x > W + 30 || this.y < -30 || this.y > H + 30) {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.life = this.max;
      }
    };
    P.prototype.draw = function () {
      var o = Math.min(1, this.life / 70) * 0.5;
      ctx.fillStyle = "rgba(" + this.c + "," + o.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(this.x, this.y, 1.35, 0, 6.2832);
      ctx.fill();
    };

    function seed() {
      var area = W * H;
      var n = Math.min(1500, Math.max(280, Math.floor(area / 1350)));
      particles = [];
      for (var i = 0; i < n; i++) particles.push(new P());
    }

    function frame(t) {
      if (!running) return;
      var dt = lastT ? t - lastT : 16;
      lastT = t;

      if (dt > 26) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 40 && particles.length > 300) {
        particles.length = Math.floor(particles.length * 0.75);
        slowFrames = 0;
      }

      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        particles[i].step();
        particles[i].draw();
      }
      requestAnimationFrame(frame);
    }

    window.addEventListener("resize", function () { resize(); }, { passive: true });
    window.addEventListener("pointermove", function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    }, { passive: true });
    window.addEventListener("pointerleave", function () { pointer.active = false; });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { running = false; }
      else if (!running) { running = true; lastT = 0; requestAnimationFrame(frame); }
    });

    resize();
    requestAnimationFrame(function () {
      cv.classList.add("is-on");
      requestAnimationFrame(frame);
    });
  }

  /* ==========================================================
     2. 鼠标光晕 + 滚动进度条
     ========================================================== */
  function initSpot() {
    if (REDUCED) return;
    var sp = document.querySelector(".spot");
    if (!sp) return;
    var x = 0, y = 0, tx = 0, ty = 0, started = false;

    window.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!started) { started = true; sp.classList.add("is-on"); x = tx; y = ty; }
    }, { passive: true });

    (function loop() {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      sp.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      requestAnimationFrame(loop);
    })();
  }

  function initBar() {
    var bar = document.querySelector(".bar");
    if (!bar) return;
    var head = document.querySelector(".head");
    function upd() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
      bar.style.transform = "scaleX(" + p + ")";
      if (head) head.classList.toggle("stuck", window.scrollY > 12);
    }
    upd();
    window.addEventListener("scroll", upd, { passive: true });
  }

  /* ==========================================================
     3. 导航
     ========================================================== */
  function initNav() {
    var burger = document.querySelector(".burger");
    var nav = document.getElementById("nav");

    if (burger && nav) {
      burger.addEventListener("click", function () {
        var open = burger.getAttribute("aria-expanded") === "true";
        burger.setAttribute("aria-expanded", String(!open));
        nav.classList.toggle("open", !open);
      });
      nav.addEventListener("click", function (e) {
        if (e.target.closest("a")) {
          burger.setAttribute("aria-expanded", "false");
          nav.classList.remove("open");
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("open")) {
          burger.setAttribute("aria-expanded", "false");
          nav.classList.remove("open");
          burger.focus();
        }
      });
    }

    var page = document.body.dataset.page;
    document.querySelectorAll(".nav__l[data-nav]").forEach(function (a) {
      if (a.dataset.nav === page) a.classList.add("on");
    });
  }

  /* ==========================================================
     4. 进场动效
     ========================================================== */
  function splitText() {
    document.querySelectorAll("[data-split]").forEach(function (el) {
      var txt = el.textContent.trim();
      el.textContent = "";
      txt.split("").forEach(function (ch) {
        var s = document.createElement("span");
        s.textContent = ch === " " ? " " : ch;
        el.appendChild(s);
      });
    });
  }

  function initReveal() {
    var els = document.querySelectorAll(".rv, .rv-s, .split");
    if (!els.length) return;
    if (REDUCED || !("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.classList.contains("split")) {
          el.querySelectorAll("span").forEach(function (s, i) {
            s.style.transitionDelay = Math.min(i * 32, 700) + "ms";
          });
        }
        el.classList.add("in");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  function initCounters() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    function run(el) {
      var to = parseFloat(el.dataset.count);
      var suf = el.dataset.suffix || "";
      if (REDUCED) { el.textContent = to + suf; return; }
      var t0 = performance.now(), dur = 1250;
      (function tick(now) {
        var p = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(to * e) + suf;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }
    if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  function initTyper() {
    var box = document.getElementById("typer");
    if (!box) return;
    var lines = [
      { p: "~", t: "cd ~/projects && ls" },
      { p: ">", t: "19 个项目，全部自己写完" },
      { p: ">", t: "游戏 / 工具 / 生成艺术 / Skill" },
      { p: ">", t: "不用框架，不留死代码" },
      { p: "~", t: "git push -u origin main" },
    ];
    var li = 0, ci = 0;
    var el = document.createElement("span");
    el.className = "typer__p";
    var cur = document.createElement("span");
    cur.className = "typer__l caret";
    box.appendChild(el);
    box.appendChild(cur);

    if (REDUCED) {
      el.textContent = "$";
      cur.textContent = "19 个项目，全部自己写完";
      cur.classList.remove("caret");
      return;
    }

    function del() {
      if (ci > 0) { cur.textContent = cur.textContent.slice(0, -1); ci--; setTimeout(del, 34); }
      else { li = (li + 1) % lines.length; setTimeout(push, 420); }
    }
    function push() {
      var line = lines[li];
      el.textContent = line.p;
      if (ci < line.t.length) {
        cur.textContent = line.t.slice(0, ++ci);
        setTimeout(push, 52 + Math.random() * 42);
      } else { setTimeout(del, 1700); }
    }
    setTimeout(push, 700);
  }

  function initTerm() {
    var body = document.querySelector("[data-term]");
    if (!body) return;
    var rows = body.querySelectorAll("div");
    if (REDUCED) { rows.forEach(function (r) { r.style.opacity = 1; }); return; }
    function show(i) {
      if (i >= rows.length) return;
      rows[i].style.animationDelay = "0s";
      setTimeout(function () { show(i + 1); }, 190);
    }
    if (!("IntersectionObserver" in window)) { rows.forEach(function (r) { r.style.opacity = 1; }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { show(0); io.disconnect(); }
      });
    }, { threshold: 0.2 });
    io.observe(body);
  }

  /* ==========================================================
     5. 卡片 3D 倾斜 + 磁性按钮
     ========================================================== */
  function initTilt() {
    if (REDUCED) return;
    document.querySelectorAll(".pcard").forEach(function (card) {
      var raf = 0;
      function apply() {
        raf = 0;
        var mx = card.dataset.mx || 50, my = card.dataset.my || 50;
        var px = mx / 100, py = my / 100;
        card.style.transform =
          "perspective(1000px) rotateX(" + (-(py - 0.5) * 7).toFixed(2) +
          "deg) rotateY(" + ((px - 0.5) * 9).toFixed(2) + "deg) translateY(-4px)";
      }
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.dataset.mx = (px * 100).toFixed(1);
        card.dataset.my = (py * 100).toFixed(1);
        if (!raf) raf = requestAnimationFrame(apply);
      });
      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
        delete card.dataset.mx;
        delete card.dataset.my;
      });
    });
  }

  function initMagnet() {
    if (REDUCED) return;
    document.querySelectorAll(".btn").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = "translate(" + (dx * 0.14).toFixed(1) + "px," + (dy * 0.2).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* ==========================================================
     6. 项目渲染 + 分类筛选
     ========================================================== */
  var CAT_LABEL = {
    game: "游戏", web: "网页应用", tool: "桌面工具",
    art: "生成艺术", skill: "Skill",
  };

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function repoUrl(name) { return "https://github.com/" + USER + "/" + name; }

  function cardHTML(p, withDetail) {
    var demo = p.demo || "";
    // 指向自己仓库的 demo 链接视为"仓库链接"，其余为"在线站点"
    var isSite = demo && demo.indexOf("github.com/" + USER) === -1;
    var demoHref = demo || repoUrl(p.id);
    var demoLabel = demo ? (isSite ? "在线体验 ↗" : "仓库 ↗") : "仓库 ↗";

    var h = '<article class="pcard" data-cat="' + esc(p.cat) + '" id="' + esc(p.id) + '">';
    h += '<div class="pcard__top"><span class="pcard__cat">' + esc(CAT_LABEL[p.cat] || p.cat) + "</span>";
    if (p.stars) h += '<span class="pcard__star">★ ' + p.stars + "</span>";
    h += "</div>";

    h += '<div class="pcard__mid">';
    h += '<h3 class="pcard__cn">' + esc(p.cn) + "</h3>";
    h += '<a class="pcard__repo" href="' + esc(repoUrl(p.id)) + '" target="_blank" rel="noopener">' + esc(p.name) + " ↗</a>";
    h += '<p class="pcard__desc">' + esc(p.desc) + "</p>";
    h += "</div>";

    h += '<div class="pcard__tech tags">';
    p.tech.forEach(function (t) { h += '<span class="tag">' + esc(t) + "</span>"; });
    h += "</div>";

    if (withDetail) {
      h += '<details class="pcard__more"><summary>项目细节</summary><ul>';
      (p.highlights || []).forEach(function (x) { h += "<li>" + esc(x) + "</li>"; });
      h += "</ul></details>";
    }

    h += '<div class="pcard__foot"><div class="pcard__links">';
    h += '<a href="' + esc(demoHref) + '" target="_blank" rel="noopener">' + demoLabel + "</a>";
    h += '<a href="' + esc(repoUrl(p.id)) + '" target="_blank" rel="noopener">源码 ↗</a>';
    h += '</div><span class="pcard__yr">' + esc(p.year) + "</span></div>";
    h += "</article>";
    return h;
  }

  function initProjects() {
    var list = window.PROJECTS || [];
    var grid = document.querySelector("[data-grid]");
    if (!grid || !list.length) return;

    var mode = grid.dataset.grid; // "all" | "featured"
    var shown = mode === "featured"
      ? list.filter(function (p) { return p.featured; })
      : list;

    shown.forEach(function (p, i) {
      var el = document.createElement("div");
      el.className = "rv";
      el.style.transitionDelay = Math.min(i * 70, 560) + "ms";
      el.innerHTML = cardHTML(p, mode !== "featured");
      grid.appendChild(el);
    });

    // 卡片是动态插入的，Tilt 要在插入后再绑一次
    initTilt();

    var bar = document.querySelector("[data-filters]");
    if (!bar || mode !== "all") return;

    var count = bar.querySelector("[data-count]");
    var btns = bar.querySelectorAll(".fbtn");
    var empt = document.querySelector("[data-empty]");

    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = btn.dataset.f;
        btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        var all = grid.querySelectorAll("[data-cat]");
        var n = 0;
        all.forEach(function (c) {
          var ok = cat === "all" || c.dataset.cat === cat;
          c.hidden = !ok;
          if (ok) {
            n++;
            var w = c.parentElement;
            w.classList.remove("in");
            void w.offsetWidth;
            w.classList.add("in");
          }
        });
        if (count) count.textContent = "显示 " + n + " / " + all.length + " 个项目";
        if (empt) empt.hidden = n !== 0;
      });
    });
  }

  /* ==========================================================
     7. 深链定位 + 表单
     ========================================================== */
  function initDeepLink() {
    var id = location.hash.replace("#", "");
    if (!id) return;
    setTimeout(function () {
      var card = document.getElementById(id);
      if (!card) return;
      var btn = document.querySelector('.fbtn[data-f="' + card.dataset.cat + '"]');
      if (btn && card.hidden) btn.click();
      var d = card.querySelector("details");
      if (d) d.open = true;
      card.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
      var wrap = card.parentElement;
      if (wrap) wrap.classList.add("in");
    }, 80);
  }

  function initForm() {
    var f = document.getElementById("ct-form");
    if (!f) return;
    var st = f.querySelector("[data-status]");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!f.checkValidity()) {
        if (st) st.textContent = "把称呼、邮箱和内容都填一下。";
        f.reportValidity();
        return;
      }
      var n = (f.elements.name.value || "").trim();
      if (st) st.textContent = "收到" + (n ? "，" + n : "") + "。站点是纯静态的，正式上线时接上邮件服务即可。";
      f.reset();
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    splitText();
    initFlow();
    initSpot();
    initBar();
    initNav();
    initProjects();
    initReveal();
    initCounters();
    initTyper();
    initTerm();
    initMagnet();
    initDeepLink();
    initForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
