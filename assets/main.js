/* System Design Patterns — shared behaviour.
   Builds the top bar, sidebar nav, per-page TOC and prev/next links so
   individual pages only contain content. Pages declare:
     <body data-page="01" data-root="../">   (index.html uses data-page="index" data-root="")
*/
(function () {
  "use strict";

  var PATTERNS = [
    { id: "01", file: "patterns/01-scaling-reads.html",        title: "Scaling Reads" },
    { id: "02", file: "patterns/02-scaling-writes.html",       title: "Scaling Writes" },
    { id: "03", file: "patterns/03-contention.html",           title: "Dealing with Contention" },
    { id: "04", file: "patterns/04-large-blobs.html",          title: "Handling Large Blobs" },
    { id: "05", file: "patterns/05-long-running-tasks.html",   title: "Long-Running Tasks" },
    { id: "06", file: "patterns/06-real-time-updates.html",    title: "Real-Time Updates" },
    { id: "07", file: "patterns/07-multi-step-processes.html", title: "Multi-Step Processes" },
    { id: "08", file: "patterns/08-proximity-search.html",     title: "Proximity Search" }
  ];

  var body = document.body;
  var root = body.getAttribute("data-root") || "";
  var page = body.getAttribute("data-page") || "index";

  /* ---- favicon (inline, avoids a 404 on /favicon.ico) ---- */
  if (!document.querySelector('link[rel~="icon"]')) {
    var ico = document.createElement("link");
    ico.rel = "icon";
    ico.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%232457d6'/%3E%3Cpath d='M8 21l5-6 4 4 7-9' stroke='white' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
    document.head.appendChild(ico);
  }

  /* ---- theme ---- */
  var KEY = "sdp-theme";
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* ignore */ } }
  function applyTheme(t) { if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); }
  applyTheme(stored());
  function currentTheme() {
    var a = document.documentElement.getAttribute("data-theme");
    if (a) return a;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  /* ---- shared SVG arrowhead marker (referenced as url(#arrow) by diagrams) ---- */
  var defs = document.createElement("div");
  defs.className = "dg-hidden";
  defs.setAttribute("aria-hidden", "true");
  defs.innerHTML =
    '<svg width="0" height="0"><defs>' +
    '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">' +
    '<path class="arrowhead" d="M0 0 L10 5 L0 10 z"/></marker></defs></svg>';
  body.insertBefore(defs, body.firstChild);

  /* ---- top bar ---- */
  var top = document.createElement("header");
  top.className = "topbar";
  top.innerHTML =
    '<button class="icon-btn menu-btn" type="button" aria-label="Toggle navigation" aria-expanded="false">☰</button>' +
    '<a class="brand" href="' + root + 'index.html">System Design Patterns</a>' +
    '<span class="spacer"></span>' +
    '<button class="icon-btn theme-btn" type="button" aria-label="Toggle dark mode"></button>';
  body.insertBefore(top, defs.nextSibling);

  var themeBtn = top.querySelector(".theme-btn");
  function paintThemeBtn() { themeBtn.textContent = currentTheme() === "dark" ? "☀ Light" : "☾ Dark"; }
  paintThemeBtn();
  themeBtn.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next); store(next); paintThemeBtn();
  });

  /* ---- sidebar ---- */
  var shell = document.querySelector(".shell");
  var side = document.createElement("aside");
  side.className = "sidebar";
  var navHtml = '<nav aria-label="Patterns"><h5>The 8 patterns</h5>';
  navHtml += '<a href="' + root + 'index.html"' + (page === "index" ? ' class="current"' : "") + '><span class="num">⌂</span><span>Overview</span></a>';
  PATTERNS.forEach(function (p) {
    navHtml += '<a href="' + root + p.file + '"' + (p.id === page ? ' class="current"' : "") +
      '><span class="num">' + p.id + '</span><span>' + p.title + '</span></a>';
  });
  navHtml += "</nav>";
  side.innerHTML = navHtml;
  if (shell) shell.insertBefore(side, shell.firstChild);

  /* ---- on-this-page TOC (h2s) ---- */
  var heads = Array.prototype.slice.call(document.querySelectorAll("main h2"));
  if (heads.length) {
    var toc = document.createElement("nav");
    toc.className = "toc";
    toc.setAttribute("aria-label", "On this page");
    var html = "<h5>On this page</h5>";
    heads.forEach(function (h, i) {
      if (!h.id) h.id = "sec-" + (i + 1);
      html += '<a href="#' + h.id + '">' + h.textContent + "</a>";
    });
    toc.innerHTML = html;
    side.appendChild(toc);

    if ("IntersectionObserver" in window) {
      var links = {};
      toc.querySelectorAll("a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            Object.keys(links).forEach(function (k) { links[k].classList.remove("active"); });
            if (links[e.target.id]) links[e.target.id].classList.add("active");
          }
        });
      }, { rootMargin: "-70px 0px -70% 0px" });
      heads.forEach(function (h) { io.observe(h); });
    }
  }

  /* ---- mobile menu ---- */
  var menuBtn = top.querySelector(".menu-btn");
  function setNav(open) {
    body.classList.toggle("nav-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  menuBtn.addEventListener("click", function () { setNav(!body.classList.contains("nav-open")); });
  side.addEventListener("click", function (e) { if (e.target.closest("a")) setNav(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setNav(false); });
  document.addEventListener("click", function (e) {
    if (body.classList.contains("nav-open") && !e.target.closest(".sidebar") && !e.target.closest(".menu-btn")) setNav(false);
  });

  /* ---- prev / next ---- */
  var holder = document.querySelector("[data-pager]");
  if (holder) {
    var idx = PATTERNS.findIndex(function (p) { return p.id === page; });
    var out = "";
    if (idx > 0) {
      var p = PATTERNS[idx - 1];
      out += '<a class="prev" href="' + root + p.file + '"><small>← Previous</small>' + p.id + " · " + p.title + "</a>";
    } else if (idx === 0) {
      out += '<a class="prev" href="' + root + 'index.html"><small>← Back</small>Overview</a>';
    }
    if (idx >= 0 && idx < PATTERNS.length - 1) {
      var n = PATTERNS[idx + 1];
      out += '<a class="next" href="' + root + n.file + '"><small>Next →</small>' + n.id + " · " + n.title + "</a>";
    } else if (idx === -1) {
      out += '<a class="next" href="' + root + PATTERNS[0].file + '"><small>Start here →</small>' + PATTERNS[0].id + " · " + PATTERNS[0].title + "</a>";
    } else if (idx === PATTERNS.length - 1) {
      out += '<a class="next" href="' + root + 'index.html"><small>Done →</small>Back to overview</a>';
    }
    holder.innerHTML = out;
  }
})();
