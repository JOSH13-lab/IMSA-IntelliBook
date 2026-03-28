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
  //  CONFIGURATION API — BACK-END
  // ═══════════════════════════════════════

  const API_BASE = 'http://localhost:5000/api';

  // Sauvegarder le token après connexion
  function saveSession(data) {
    localStorage.setItem('imsa_user', JSON.stringify(data.user));
    localStorage.setItem('imsa_access_token', data.accessToken);
    localStorage.setItem('imsa_refresh_token', data.refreshToken);
  }

  // Headers avec JWT pour les requêtes protégées
  function authHeaders() {
    const token = localStorage.getItem('imsa_access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Récupérer la vraie couverture d'un livre (avec retry)
  async function loadBookCover(bookId, imgElement, retries = 3) {
    try {
      const res = await fetch(`${API_BASE}/books/${bookId}/cover`);
      const data = await res.json();
      if (data.success && data.coverUrl) {
        imgElement.src = data.coverUrl;
        imgElement.classList.add("loaded");
        const fallback = imgElement.closest('.book-cover-container')?.nextElementSibling || 
                        imgElement.closest('.book-cover-container')?.querySelector('.book-cover-fallback');
        if (fallback) fallback.style.display = 'none';
      }
    } catch (err) {
      if (retries > 0) {
        // Retry après 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
        return loadBookCover(bookId, imgElement, retries - 1);
      }
      console.warn('Couverture indisponible pour', bookId);
    }
  }

  // Charger TOUTES les couvertures de la page (méthode batch optimisée)
  async function loadAllCovers() {
    const elements = document.querySelectorAll('.book-card[data-id]');
    if (elements.length === 0) return;

    // Grouper par batch de 20 livres max
    const BATCH_SIZE = 20;
    const bookIds = Array.from(elements).map(el => el.dataset.id).filter(Boolean);
    
    for (let i = 0; i < bookIds.length; i += BATCH_SIZE) {
      const batch = bookIds.slice(i, i + BATCH_SIZE);
      await loadCoversBatch(batch, elements);
      // Petit délai entre les batches pour ne pas surcharger
      if (i + BATCH_SIZE < bookIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Charger un batch de couvertures via le nouvel endpoint
  async function loadCoversBatch(bookIds, allElements) {
    try {
      const res = await fetch(`${API_BASE}/books/batch/covers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bookIds })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success && data.covers) {
        // Appliquer les couvertures trouvées
        data.covers.forEach(cover => {
          const element = Array.from(allElements).find(
            el => el.dataset.id === cover.id || el.dataset.id === cover.legacy_id
          );
          if (element && cover.coverUrl) {
            const img = element.querySelector('.book-cover-img');
            if (img) {
              img.src = cover.coverUrl;
              img.classList.add("loaded");
              const fallback = element.querySelector('.book-cover-fallback');
              if (fallback) fallback.style.display = 'none';
            }
          }
        });
      }
    } catch (err) {
      console.warn('Erreur batch covers:', err.message);
      // Fallback : charger individuellement
      bookIds.forEach(bookId => {
        const element = Array.from(allElements).find(el => el.dataset.id === bookId);
        if (element) {
          const img = element.querySelector('.book-cover-img');
          if (img) loadBookCover(bookId, img, 2);
        }
      });
    }
  }

  // Charge les couvertures depuis notre API back-end (version alternative)
  async function loadAllBookCovers() {
    const cards = document.querySelectorAll('[data-id]');
    if (cards.length === 0) return;

    const BATCH_SIZE = 20;
    const bookIds = Array.from(cards).map(c => c.dataset.id).filter(Boolean);

    for (let i = 0; i < bookIds.length; i += BATCH_SIZE) {
      const batch = bookIds.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch(`${API_BASE}/books/batch/covers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookIds: batch })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.success && data.covers) {
          data.covers.forEach(cover => {
            const card = Array.from(cards).find(
              c => c.dataset.id === cover.id || c.dataset.id === cover.legacy_id
            );
            if (card && cover.coverUrl) {
              const img = card.querySelector('img.book-cover-img, img');
              if (img) {
                img.src = cover.coverUrl;
                img.style.display = 'block';
                const fallback = card.querySelector('.book-cover-fallback');
                if (fallback) fallback.style.display = 'none';
              }
            }
          });
        }
      } catch (e) {
        console.warn('Erreur chargement couvertures batch:', e.message);
      }
    }
  }

  // ═══════════════════════════════════════
  // GESTION DES COUVERTURES DE LIVRES
  // ═══════════════════════════════════════
  function initBookCovers() {
    document.querySelectorAll(".book-cover-img").forEach((img) => {
      // Si l'image est déjà chargée (cache)
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add("loaded");
        return;
      }

      // Image charge avec succès → masquer le fallback
      img.addEventListener("load", function () {
        this.classList.add("loaded");
      });

      // Image cassée → afficher le fallback coloré
      img.addEventListener("error", function () {
        this.style.display = "none";
        // Le fallback CSS devient visible automatiquement
      });
    });
  }

  // ═══════════════════════════════════════
  //  FONCTION POUR GÉNÉRER UNE CARTE LIVRE
  // ═══════════════════════════════════════

  function createBookCard(book) {
    if (!window.imsaUtils || !window.imsaUtils.renderBookCardHTML) {
      console.error("IMSA: imsaUtils.renderBookCardHTML not found.");
      return "";
    }
    return window.imsaUtils.renderBookCardHTML(book, {
      showNewBadge: true,
      showBorrowButton: true,
      showCategoryChip: true,
      linkReadMore: true
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
    loadAllCovers();
    loadAllBookCovers();

    // Ferme l'offcanvas après navigation mobile.
    document.querySelectorAll("[data-bs-toggle='offcanvas']").forEach((tog) => {
      const offcanvasElId = tog.getAttribute("data-bs-target");
      if (!offcanvasElId) return;
      const offcanvasEl = document.querySelector(offcanvasElId);
      if (!offcanvasEl) return;
      offcanvasEl.addEventListener("hide.bs.offcanvas", () => { });
    });

    document.querySelectorAll(".offcanvas a.nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        const offcanvasEl = document.querySelector(".offcanvas");
        if (!offcanvasEl) return;
        const inst = bootstrap.Offcanvas.getInstance(offcanvasEl) || new bootstrap.Offcanvas(offcanvasEl);
        inst.hide();
      });
    });
    if (window.imsaUtils) {
      window.imsaUtils.initBookCovers = initBookCovers;
    }
  });
})();

