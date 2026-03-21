/* IMSA IntelliBook - Comportements globaux */
(function () {
  function getPageSlug() {
    const name = (window.location.pathname.split("/").pop() || "").trim();
    return name || "index.html";
  }

  function setActiveNavLink() {
    const page = getPageSlug();
    const links = document.querySelectorAll("[data-navlink]");
    links.forEach((a) => {
      const href = (a.getAttribute("href") || "").split("?")[0];
      const target = href.split("/").pop();
      if (target === page) a.classList.add("active");
      else a.classList.remove("active");
    });
  }

  function initNavbarScrollShadow() {
    const navbar = document.querySelector(".navbar.fixed-top");
    if (!navbar) return;
    const onScroll = () => {
      if (window.scrollY > 10) navbar.classList.add("navbar-scrolled");
      else navbar.classList.remove("navbar-scrolled");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function initProfileLinkToggle() {
    const item = document.getElementById("navProfileItem");
    if (!item) return;
    const userRaw = localStorage.getItem("imsa_user");
    const hasUser = !!userRaw;
    item.classList.toggle("d-none", !hasUser);

    const mobile = document.getElementById("navProfileLinkMobile");
    if (mobile) mobile.classList.toggle("d-none", !hasUser);
  }

  function initScrollAnimations() {
    const targets = document.querySelectorAll(".animate-on-scroll");
    if (!targets.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((t) => obs.observe(t));
  }

  function formatNumber(n) {
    const num = Number(n);
    if (Number.isNaN(num)) return "0";
    return num.toLocaleString("fr-FR");
  }

  function initCountUp() {
    const counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;

    const run = (el) => {
      const to = Number(el.getAttribute("data-count"));
      const duration = Number(el.getAttribute("data-duration") || 900);
      const suffix = el.getAttribute("data-suffix") || "";
      const start = 0;
      const startTime = performance.now();

      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = Math.floor(start + (to - start) * eased);
        el.textContent = `${formatNumber(value)}${suffix}`;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          if (el.dataset.countRan === "1") return;
          el.dataset.countRan = "1";
          run(el);
        });
      },
      { threshold: 0.2 }
    );

    counters.forEach((c) => obs.observe(c));
  }

  function ensureToastContainer() {
    let container = document.getElementById("imsaToastContainer");
    if (container) return container;
    container = document.createElement("div");
    container.id = "imsaToastContainer";
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    container.style.zIndex = "1080";
    document.body.appendChild(container);
    return container;
  }

  window.imsaToast = function (message, type = "info") {
    const container = ensureToastContainer();
    const toastEl = document.createElement("div");
    toastEl.className = `toast align-items-center text-bg-${type === "success" ? "success" : type === "error" ? "danger" : "primary"} border-0`;
    toastEl.setAttribute("role", "alert");
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fermer"></button>
      </div>`;
    container.appendChild(toastEl);
    const t = new bootstrap.Toast(toastEl, { delay: 3200 });
    t.show();
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
  };

  function initNavbarSearch() {
    const input = document.getElementById("navbarSearchInput");
    const btn = document.getElementById("navbarSearchButton");
    if (!input || !btn) return;

    const go = () => {
      const q = (input.value || "").trim();
      const url = q ? `recherche.html?q=${encodeURIComponent(q)}` : "recherche.html";
      window.location.href = url;
    };

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      go();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
  }

  function initAnchorSmoothScroll() {
    document.body.addEventListener("click", (e) => {
      const a = e.target.closest("a[href^='#']");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // ═══════════════════════════════════════
  // GESTION DES COUVERTURES DE LIVRES
  // ═══════════════════════════════════════
  function initBookCovers() {
    document.querySelectorAll(".book-cover-img").forEach((img) => {
      // Déjà chargé (cache)
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add("loaded");
        return;
      }

      img.addEventListener("load", function () {
        this.classList.add("loaded");
      });

      img.addEventListener("error", function () {
        // Le fallback reste visible (pas de class loaded)
        this.style.display = "none";
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNavbarScrollShadow();
    initProfileLinkToggle();
    setActiveNavLink();
    initScrollAnimations();
    initCountUp();
    initNavbarSearch();
    initAnchorSmoothScroll();
    initBookCovers();

    // Ferme l'offcanvas après navigation mobile.
    document.querySelectorAll("[data-bs-toggle='offcanvas']").forEach((tog) => {
      const offcanvasElId = tog.getAttribute("data-bs-target");
      if (!offcanvasElId) return;
      const offcanvasEl = document.querySelector(offcanvasElId);
      if (!offcanvasEl) return;
      offcanvasEl.addEventListener("hide.bs.offcanvas", () => {});
    });

    document.querySelectorAll(".offcanvas a.nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        const offcanvasEl = document.querySelector(".offcanvas");
        if (!offcanvasEl) return;
        const inst = bootstrap.Offcanvas.getInstance(offcanvasEl) || new bootstrap.Offcanvas(offcanvasEl);
        inst.hide();
      });
    });
  });
})();

