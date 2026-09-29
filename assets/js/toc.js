// Table of contents behavior. Loaded by layouts/posts/baseof.html on posts
// with `toc: true`. The list at the start of the post comes from
// layouts/partials/toc.html and works as plain links without this script.
// What it adds:
//
//   - a bar fixed to the top of the screen that names the current section and
//     opens a copy of the list as a panel. It hides on the way down the page
//     and shows on the way up.
//   - a mark on the current section in the lists
//   - a copy of the appearance toggle in the bar
(function () {
  "use strict";

  var inline = document.querySelector(".toc-inline");
  var list = inline && inline.querySelector(".toc-list");
  if (!list) return;

  var root = document.documentElement;

  // Scrolling less than this far in one direction moves the bar neither way.
  var SLACK = 10;
  // How long after a jump scrolling counts as part of it, in milliseconds.
  var JUMP_WINDOW = 300;

  // ---------------------- TOP BAR ---------------------- //

  var bar = document.createElement("div");
  bar.className = "toc-bar";

  var row = document.createElement("div");
  row.className = "toc-bar-row";
  bar.appendChild(row);

  var inner = document.createElement("div");
  inner.className = "toc-bar-inner";
  row.appendChild(inner);

  var opener = document.createElement("button");
  opener.type = "button";
  opener.className = "toc-bar-open";
  opener.setAttribute("aria-controls", "toc-panel");
  opener.setAttribute("aria-expanded", "false");
  inner.appendChild(opener);

  var label = document.createElement("span");
  label.className = "toc-bar-label";
  opener.appendChild(label);

  var hint = document.createElement("span");
  hint.className = "toc-bar-hint";
  hint.textContent = "[toc]";
  opener.appendChild(hint);

  // From layouts/partials/appearance_toggle.html.
  if (window.createAppearanceToggle) {
    inner.appendChild(window.createAppearanceToggle("toc-bar-toggle"));
  }

  var panel = document.createElement("div");
  panel.className = "toc-panel";
  panel.id = "toc-panel";
  panel.appendChild(list.cloneNode(true));
  bar.appendChild(panel);

  // One entry per heading, with the links to it from both lists.
  var entries = [];
  var byId = {};
  [list, panel].forEach(function (parent) {
    var links = parent.querySelectorAll("a[href^='#']");
    Array.prototype.forEach.call(links, function (link) {
      var id = decodeURIComponent(link.getAttribute("href").slice(1));
      var entry = byId[id];
      if (!entry) {
        var heading = document.getElementById(id);
        if (!heading) return;
        entry = byId[id] = { heading: heading, links: [], panelLink: null };
        entries.push(entry);
      }
      entry.links.push(link);
      if (parent === panel) entry.panelLink = link;
      link.addEventListener("click", jump);
    });
  });
  if (!entries.length) return;

  document.body.insertBefore(bar, document.body.firstChild);
  root.classList.add("toc-js");

  // ---------------------- CURRENT SECTION ---------------------- //

  var current = null;

  // A heading this close to the top of the screen has been reached. A jump
  // leaves the heading its scroll margin below the top of the screen. The line
  // has to sit under that, or the section jumped to would not count as
  // reached.
  var margin = parseFloat(getComputedStyle(entries[0].heading).scrollMarginTop) || 0;
  var line = margin + 16;

  // The last heading that has passed the top of the screen. At the very end
  // of the page that is the last one, which may never get to the top.
  function findCurrent() {
    if (window.innerHeight + window.scrollY >= root.scrollHeight - 2) {
      return entries[entries.length - 1];
    }
    var found = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].heading.getBoundingClientRect().top > line) break;
      found = entries[i];
    }
    return found;
  }

  // Scrolls the panel to put the link in its middle.
  function reveal(link) {
    var box = panel.getBoundingClientRect();
    var rect = link.getBoundingClientRect();
    panel.scrollTop += rect.top + rect.height / 2 - (box.top + box.height / 2);
  }

  function setCurrent(entry) {
    if (current) {
      current.links.forEach(function (link) { link.removeAttribute("aria-current"); });
    }
    current = entry;
    if (current) {
      current.links.forEach(function (link) { link.setAttribute("aria-current", "location"); });
    }
    var title = current ? current.panelLink.textContent : "Contents";
    label.textContent = title;
    opener.setAttribute("aria-label", "Table of contents, current section: " + title);
  }

  // ---------------------- SHOWING THE BAR ---------------------- //

  var shown = false;
  var open = false;
  var lastY = 0;
  // Distance covered since the last change of direction. Negative is up.
  var travel = 0;
  var jumpUntil = 0;

  // Safari on iPhone scrolls past both ends of the page and bounces back.
  // Clamping keeps the bounce from reading as a change of direction.
  function scrollPosition() {
    var max = root.scrollHeight - window.innerHeight;
    return Math.max(0, Math.min(window.scrollY, max));
  }

  // The bar stays away while the collapsed list at the start of the post is on
  // screen. That one does the same job.
  function pastInline() {
    return inline.getBoundingClientRect().bottom < 0;
  }

  function setShown(value) {
    if (value === shown) return;
    shown = value;
    root.classList.toggle("toc-bar-show", shown);
  }

  function setOpen(value, returnFocus) {
    if (value === open) return;
    open = value;
    root.classList.toggle("toc-open", open);
    opener.setAttribute("aria-expanded", String(open));
    hint.textContent = open ? "[close]" : "[toc]";
    if (open) {
      var link = (current || entries[0]).panelLink;
      reveal(link);
      link.focus({ preventScroll: true });
    } else if (returnFocus) {
      opener.focus();
    }
  }

  // A click on an entry, or Back and Forward between them. The bar goes away
  // whichever way the page moves, so the reader can get on with reading.
  function jump() {
    jumpUntil = performance.now() + JUMP_WINDOW;
    setOpen(false, false);
    setShown(false);
  }

  function update() {
    var y = scrollPosition();
    var delta = y - lastY;
    lastY = y;

    var entry = findCurrent();
    if (entry !== current) setCurrent(entry);

    if (performance.now() < jumpUntil || !pastInline()) {
      travel = 0;
      if (!open) setShown(false);
      return;
    }
    if (open || delta === 0) return;

    if ((delta > 0) !== (travel > 0)) travel = 0;
    travel += delta;
    if (travel > SLACK) setShown(false);
    else if (travel < -SLACK) setShown(true);
  }

  var queued = false;
  function queueUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      update();
    });
  }

  opener.addEventListener("click", function () { setOpen(!open, false); });

  // Not "click": Safari on iPhone sends none for a tap on plain text.
  document.addEventListener("pointerdown", function (event) {
    if (open && !bar.contains(event.target)) setOpen(false, false);
  });

  document.addEventListener("keydown", function (event) {
    if (open && event.key === "Escape") setOpen(false, true);
  });

  window.addEventListener("hashchange", jump);
  window.addEventListener("popstate", jump);
  window.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate);
  window.addEventListener("load", queueUpdate);

  lastY = scrollPosition();
  setCurrent(findCurrent());
})();
