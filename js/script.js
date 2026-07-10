const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const revealEls = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// Node maps (Soar / Sirat systems diagrams)
document.querySelectorAll(".node-map").forEach((map) => {
  const note = map.querySelector(".node-map__note");
  const nodes = map.querySelectorAll(".node-map__node");
  const defaultText = map.dataset.default;

  const activate = (node) => {
    nodes.forEach((n) => n.classList.remove("is-active"));
    node.classList.add("is-active");
    note.textContent = node.dataset.note;
  };

  const reset = () => {
    nodes.forEach((n) => n.classList.remove("is-active"));
    note.textContent = defaultText;
  };

  nodes.forEach((node) => {
    node.addEventListener("mouseenter", () => activate(node));
    node.addEventListener("focus", () => activate(node));
    node.addEventListener("mouseleave", reset);
    node.addEventListener("blur", reset);
    node.addEventListener("click", () => activate(node));
  });
});

// Command palette
const cmdk = document.getElementById("cmdk");
const cmdkBtn = document.getElementById("cmdkBtn");
const cmdkBackdrop = document.getElementById("cmdkBackdrop");
const cmdkInput = document.getElementById("cmdkInput");
const cmdkList = document.getElementById("cmdkList");
const cmdkPanel = cmdk ? cmdk.querySelector(".cmdk__panel") : null;
const cmdkItems = () => Array.from(cmdkList.querySelectorAll(".cmdk__item"));

function openCmdk() {
  cmdk.hidden = false;
  cmdkInput.value = "";
  filterCmdk("");
  cmdkPanel.setAttribute("aria-hidden", "false");
  setTimeout(() => cmdkInput.focus(), 0);
}

function closeCmdk() {
  cmdk.hidden = true;
  cmdkPanel.setAttribute("aria-hidden", "true");
}

function filterCmdk(query) {
  const q = query.trim().toLowerCase();
  let firstVisible = null;

  cmdkItems().forEach((item) => {
    const label = item.querySelector("span").textContent.toLowerCase();
    const match = label.includes(q);
    item.hidden = !match;
    item.classList.remove("is-active");
    if (match && !firstVisible) firstVisible = item;
  });

  if (firstVisible) firstVisible.classList.add("is-active");
}

function moveActive(direction) {
  const visible = cmdkItems().filter((i) => !i.hidden);
  if (!visible.length) return;
  const currentIndex = visible.findIndex((i) => i.classList.contains("is-active"));
  let nextIndex = currentIndex + direction;
  if (nextIndex < 0) nextIndex = visible.length - 1;
  if (nextIndex >= visible.length) nextIndex = 0;
  visible.forEach((i) => i.classList.remove("is-active"));
  visible[nextIndex].classList.add("is-active");
}

function goToCmdkItem(item) {
  closeCmdk();
  if (item.dataset.href) {
    window.location.href = item.dataset.href;
  } else if (item.dataset.target) {
    document.querySelector(item.dataset.target)?.scrollIntoView({ behavior: "smooth" });
  }
}

function selectActive() {
  const active = cmdkItems().find((i) => i.classList.contains("is-active") && !i.hidden);
  if (!active) return;
  goToCmdkItem(active);
}

if (cmdk) {
  cmdkBtn.addEventListener("click", openCmdk);
  cmdkBackdrop.addEventListener("click", closeCmdk);

  cmdkList.addEventListener("click", (e) => {
    const item = e.target.closest(".cmdk__item");
    if (!item) return;
    goToCmdkItem(item);
  });

  cmdkInput.addEventListener("input", (e) => filterCmdk(e.target.value));
}

document.addEventListener("keydown", (e) => {
  if (!cmdk) return;

  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const cmdKey = isMac ? e.metaKey : e.ctrlKey;

  if (cmdKey && e.key.toLowerCase() === "k") {
    e.preventDefault();
    cmdk.hidden ? openCmdk() : closeCmdk();
    return;
  }

  if (cmdk.hidden) return;

  if (e.key === "Escape") closeCmdk();
  if (e.key === "ArrowDown") {
    e.preventDefault();
    moveActive(1);
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    moveActive(-1);
  }
  if (e.key === "Enter") {
    e.preventDefault();
    selectActive();
  }
});

const glow = document.getElementById("glow");

if (glow && window.matchMedia("(hover: hover)").matches) {
  let raf = null;

  window.addEventListener("mousemove", (e) => {
    glow.style.opacity = "1";
    if (raf) return;
    raf = requestAnimationFrame(() => {
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      raf = null;
    });
  });

  window.addEventListener("mouseleave", () => {
    glow.style.opacity = "0";
  });
}

// Magnetic buttons — nudge toward the cursor within a radius
if (window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll(".magnetic").forEach((el) => {
    const strength = 18;

    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${(x / rect.width) * strength}px, ${(y / rect.height) * strength}px)`;
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "translate(0, 0)";
    });
  });
}

// Tilt cards — subtle 3D tilt following the cursor
if (window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll(".product-card").forEach((card) => {
    const maxTilt = 6;

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * maxTilt * 2;
      const rotateX = (0.5 - py) * maxTilt * 2;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    });
  });
}

// Count-up stats — animate numbers in once visible
const statEls = document.querySelectorAll(".stats__num[data-count]");

if (statEls.length && "IntersectionObserver" in window) {
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const duration = 900;
        const start = performance.now();

        function tick(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target);
          if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
        countObserver.unobserve(el);
      });
    },
    { threshold: 0.4 }
  );

  statEls.forEach((el) => countObserver.observe(el));
}

// Scramble text — decode-in effect on load
const scrambleEls = document.querySelectorAll(".scramble");
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

scrambleEls.forEach((el) => {
  const finalText = el.textContent;
  let frame = 0;
  const totalFrames = 18;

  function renderFrame() {
    const revealCount = Math.floor((frame / totalFrames) * finalText.length);
    let out = "";
    for (let i = 0; i < finalText.length; i++) {
      if (i < revealCount || finalText[i] === " ") {
        out += finalText[i];
      } else {
        out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
    }
    el.textContent = out;
    frame++;
    if (frame <= totalFrames) {
      requestAnimationFrame(() => setTimeout(renderFrame, 22));
    } else {
      el.textContent = finalText;
    }
  }

  renderFrame();
});

// Theme toggle — persisted in localStorage, defaults to dark
(function initTheme() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const darkColor = metaTheme ? metaTheme.getAttribute("content") : "#0a0814";
  const lightColor = "#fbf5ec";

  function syncMetaColor(theme) {
    if (metaTheme) metaTheme.setAttribute("content", theme === "light" ? lightColor : darkColor);
  }

  const stored = localStorage.getItem("sy-theme");
  if (stored) {
    document.documentElement.setAttribute("data-theme", stored);
    syncMetaColor(stored);
  }

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("sy-theme", next);
    syncMetaColor(next);
  });
})();

// Scroll progress bar
(function initProgressBar() {
  const bar = document.getElementById("progressBar");
  if (!bar) return;

  function update() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    bar.style.width = `${pct}%`;
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();

// Back to top
(function initToTop() {
  const btn = document.getElementById("toTop");
  if (!btn) return;

  window.addEventListener(
    "scroll",
    () => {
      btn.classList.toggle("is-visible", window.scrollY > 600);
    },
    { passive: true }
  );

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

// Snapshot — table-view toggles (accessible fallback for each chart)
document.querySelectorAll(".viz-table-toggle").forEach((btn) => {
  const table = document.getElementById(btn.dataset.tableFor);
  if (!table) return;

  btn.addEventListener("click", () => {
    const nowHidden = !table.hidden;
    table.hidden = nowHidden;
    btn.textContent = nowHidden ? "View as table" : "Hide table";
  });
});

// Keyboard shortcuts overlay
(function initShortcuts() {
  const trigger = document.getElementById("shortcutsBtn");
  const overlay = document.getElementById("shortcutsOverlay");
  const backdrop = document.getElementById("shortcutsBackdrop");
  const closeBtn = document.getElementById("shortcutsClose");
  if (!overlay) return;

  function isTyping() {
    const active = document.activeElement;
    if (!active) return false;
    return active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable;
  }

  function open() {
    overlay.hidden = false;
  }

  function close() {
    overlay.hidden = true;
  }

  if (trigger) trigger.addEventListener("click", open);
  if (backdrop) backdrop.addEventListener("click", close);
  if (closeBtn) closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "?" && !isTyping() && cmdk.hidden) {
      e.preventDefault();
      overlay.hidden ? open() : close();
      return;
    }

    if (e.key === "Escape" && !overlay.hidden) close();
  });
})();

// Theme toggle shortcut (T key)
document.addEventListener("keydown", (e) => {
  if (e.key === "t" || e.key === "T") {
    const active = document.activeElement;
    if (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable) return;
    const cmdkOpen = cmdk && !cmdk.hidden;
    const shortcutsOverlay = document.getElementById("shortcutsOverlay");
    const shortcutsOpen = shortcutsOverlay && !shortcutsOverlay.hidden;
    if (cmdkOpen || shortcutsOpen) return;

    const toggle = document.getElementById("themeToggle");
    if (toggle) toggle.click();
  }
});

// Reading time estimator
(function initReadingTime() {
  const bar = document.getElementById("readingBar");
  const label = document.getElementById("readingLabel");
  if (!bar || !label) return;

  const main = document.querySelector("main");
  if (!main) return;

  const text = main.textContent || "";
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  label.textContent = `${minutes} min read`;

  function update() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) { bar.classList.remove("is-visible"); return; }

    const pct = (window.scrollY / scrollable) * 100;
    bar.style.background = `linear-gradient(90deg, var(--soar) ${pct}%, var(--border) ${pct}%)`;

    if (window.scrollY > 200) {
      bar.classList.add("is-visible");
    } else {
      bar.classList.remove("is-visible");
    }
  }

  window.addEventListener("scroll", update, { passive: true });
  update();
})();

// Active nav section highlighting on scroll
(function initActiveNav() {
  const navLinks = document.querySelectorAll(".nav__links a[href^='#']");
  if (!navLinks.length) return;

  const sections = [];
  navLinks.forEach((link) => {
    const id = link.getAttribute("href").slice(1);
    const section = document.getElementById(id);
    if (section) sections.push({ el: section, link });
  });

  function update() {
    const scrollY = window.scrollY + 120;
    let current = sections[0];

    for (const s of sections) {
      if (s.el.offsetTop <= scrollY) current = s;
    }

    navLinks.forEach((l) => l.classList.remove("is-active"));
    if (current) current.link.classList.add("is-active");
  }

  window.addEventListener("scroll", update, { passive: true });
  update();
})();

// Smooth scroll offset for sticky nav
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const id = anchor.getAttribute("href");
    if (id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const navHeight = document.getElementById("nav")?.offsetHeight || 0;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
    window.scrollTo({ top, behavior: "smooth" });
  });
});

// Contact form — client-side validation and submission feedback
(function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const status = document.getElementById("contactStatus");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.querySelector("#contactName");
    const email = form.querySelector("#contactEmail");
    const message = form.querySelector("#contactMessage");

    if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
      status.textContent = "Please fill in all fields.";
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      status.textContent = "Please enter a valid email address.";
      return;
    }

    const submitBtn = form.querySelector(".contact__submit");
    submitBtn.disabled = true;
    status.textContent = "Sending...";

    function fallbackToEmail() {
      const subject = encodeURIComponent(`Portfolio message from ${name.value.trim()}`);
      const body = encodeURIComponent(`${message.value.trim()}\n\n— ${name.value.trim()} (${email.value.trim()})`);
      window.location.href = `mailto:samir.yasar.usa@gmail.com?subject=${subject}&body=${body}`;
      status.textContent = "This site is hosted statically, so I've opened your email app instead — just hit send.";
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.value.trim(),
          email: email.value.trim(),
          message: message.value.trim(),
        }),
      });

      // No /api/contact route on this host (e.g. static GitHub Pages) — fall back to mailto.
      if (res.status === 404) {
        fallbackToEmail();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        status.textContent = (data && data.error) || "Something went wrong. Please try again.";
        return;
      }

      status.textContent = "Message sent! I'll get back to you soon.";
      form.reset();
    } catch {
      // Network-level failure — most likely no backend at all. Fall back to mailto.
      fallbackToEmail();
    } finally {
      submitBtn.disabled = false;
    }
  });
})();

// Ambient background — soft drifting constellation
(function initBackground() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  let width, height, points;
  const COUNT = 46;
  const LINK_DIST = 130;
  // Blue, light blue, purple, pink — cycled per point for a cyberpunk constellation
  const PALETTE = [
    [58, 167, 255],
    [51, 230, 255],
    [178, 100, 255],
    [255, 95, 209],
  ];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function makePoints() {
    points = Array.from({ length: COUNT }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      color: PALETTE[i % PALETTE.length],
    }));
  }

  function step() {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const alphaMul = isLight ? 0.4 : 1;

    ctx.clearRect(0, 0, width, height);

    points.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${0.65 * alphaMul})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          const c = points[i].color;
          ctx.strokeStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${0.14 * alphaMul * (1 - dist / LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }
    }

    if (!reduceMotion) requestAnimationFrame(step);
  }

  resize();
  makePoints();
  step();

  window.addEventListener("resize", () => {
    resize();
    makePoints();
    if (reduceMotion) step();
  });
})();

// Sirat app filter — pillar chips + text search (sirat.html only)
(function initSiratFilter() {
  const search = document.getElementById("siratSearch");
  const chips = document.querySelectorAll(".pillar-filter__chip");
  const pillars = document.querySelectorAll(".pillar[data-pillar]");
  const empty = document.getElementById("siratEmpty");

  if (!search || !pillars.length) return;

  let activeFilter = "all";

  function apply() {
    const query = search.value.trim().toLowerCase();
    let anyVisible = false;

    pillars.forEach((pillar) => {
      const matchesPillar = activeFilter === "all" || activeFilter === pillar.dataset.pillar;
      let pillarHasVisibleCard = false;

      pillar.querySelectorAll(".pillar-card").forEach((card) => {
        const name = card.querySelector("h4").textContent.toLowerCase();
        const tagline = card.querySelector("p").textContent.toLowerCase();
        const matchesSearch = !query || name.includes(query) || tagline.includes(query);
        const visible = matchesPillar && matchesSearch;
        card.hidden = !visible;
        if (visible) pillarHasVisibleCard = true;
      });

      pillar.hidden = !pillarHasVisibleCard;
      if (pillarHasVisibleCard) anyVisible = true;
    });

    if (empty) empty.hidden = anyVisible;
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      activeFilter = chip.dataset.filter;
      apply();
    });
  });

  search.addEventListener("input", apply);
})();

// PWA — register the service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is a nice-to-have — a failed registration shouldn't break the page */
    });
  });
}
