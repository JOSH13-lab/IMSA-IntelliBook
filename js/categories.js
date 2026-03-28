/* IMSA IntelliBook - Page Catégories */
(function () {
  const DEFAULT_CATEGORY_KEY = "romans";

  async function borrowBook(bookId, userId = "") {
    try {
      // BACKEND: POST /api/borrows
      // await fetch("/api/borrows", { method: "POST", body: JSON.stringify({ bookId, userId }) })
      return { ok: true, bookId };
    } catch (err) {
      console.error(err);
      return { ok: false, error: err };
    }
  }

  function renderCategories() {
    const filterContainer = document.querySelector("[role='tablist']");
    const gridContainer = document.getElementById("categoriesGrid");
    if (!filterContainer || !gridContainer) return;

    const categories = Object.values(window.IMSA_CATEGORIES);
    
    // 1. Filter Pills
    filterContainer.innerHTML = `<button class="btn btn-sm btn-orange-outline filter-pill active" type="button" data-category-filter="toutes">Toutes</button>`;
    categories.forEach(cat => {
      const shortLabel = cat.label.replace("SAN — ", "").replace("BAV — ", "").replace("GIN — ", "").replace("GIF — ", "");
      filterContainer.innerHTML += `<button class="btn btn-sm btn-orange-outline filter-pill" type="button" data-category-filter="${cat.key}">${shortLabel}</button>`;
    });

    // 2. Grid
    gridContainer.innerHTML = "";
    categories.forEach(cat => {
      const gradientClass = window.imsaUtils.coverGradientClass(cat.key);
      const iconMap = {
        romans: "fa-feather-pointed",
        histoire: "fa-landmark",
        sciences: "fa-flask",
        informatique: "fa-laptop-code",
        droit: "fa-scale-balanced",
        jeunesse: "fa-star",
        arts: "fa-palette",
        economie: "fa-chart-line",
        "san-bms": "fa-dna",
        "san-sso": "fa-users",
        "san-ema": "fa-baby",
        "san-sin": "fa-stethoscope",
        "bav-s2a": "fa-seedling",
        "bav-hse": "fa-shield-halved",
        "bav-sha": "fa-fish",
        "gin-pmi": "fa-gear",
        "gin-gel": "fa-bolt",
        "gif-rtl": "fa-network-wired",
        "gif-glo": "fa-code"
      };
      const icon = iconMap[cat.key] || "fa-book";

      gridContainer.innerHTML += `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="category-card h-100 p-3" role="button" tabindex="0" data-category="${cat.key}" aria-label="Ouvrir ${cat.label}">
            <div class="d-flex align-items-start gap-3">
              <div class="category-icon ${gradientClass}">
                <i class="fa-solid ${icon}"></i>
              </div>
              <div class="flex-grow-1">
                <h3 class="h5 mb-1">${cat.label}</h3>
                <p class="text-muted mb-0 small">Explorez notre catalogue d'ouvrages spécialisés.</p>
              </div>
            </div>
            <div class="d-flex align-items-center justify-content-between mt-3">
              <span class="badge bg-orange-subtle text-orange border border-0">Catalogue</span>
              <a href="#" class="btn btn-orange-outline btn-sm">Voir les livres →</a>
            </div>
          </div>
        </div>
      `;
    });
  }

  async function openPanel(categoryKey) {
    const panel = document.getElementById("categoryPanelContainer");
    const title = document.getElementById("categoryPanelTitle");
    const booksWrap = document.getElementById("categoryPanelBooks");
    if (!panel || !title || !booksWrap) return;

    if (window.imsaApi?.loadLocalCoversManifest) {
      await window.imsaApi.loadLocalCoversManifest();
    }

    title.textContent = window.imsaUtils.categoryLabel(categoryKey);
    panel.classList.remove("d-none");

    booksWrap.innerHTML = '<div class="col-12 text-center p-5"><div class="spinner-border text-orange" role="status"></div></div>';

    try {
      const response = await fetch(`http://localhost:5000/api/categories/${categoryKey}/books`);
      const result = await response.json();
      let books = result.data || [];

      // Mapper les propriétés du backend vers le format attendu par imsaUtils si nécessaire
      books = books.map(b => ({
        ...b,
        categoryKey: categoryKey,
        rating: b.average_rating || 0,
        ratingCount: b.total_reviews || 0,
        shortSummary: b.summary || ""
      }));

      booksWrap.innerHTML = books
        .map(
          (b) => `
          <div class="col-12 col-md-6 col-lg-3">
            ${window.imsaUtils.renderBookCardHTML(b, { showBorrowButton: true, showCategoryChip: false })}
          </div>
        `
        )
        .join("");

      if (typeof window.imsaInitBookCovers === "function") window.imsaInitBookCovers();
      if (typeof window.imsaLoadAllCovers === "function") window.imsaLoadAllCovers();
      if (typeof window.imsaLoadAllBookCovers === "function") window.imsaLoadAllBookCovers();
    } catch (err) {
      console.error("Erreur lors du chargement des livres:", err);
      // Fallback data if API fails
      const books = window.imsaUtils.getBooksByCategory(categoryKey);
      booksWrap.innerHTML = books
        .map(
          (b) => `
          <div class="col-12 col-md-6 col-lg-3">
            ${window.imsaUtils.renderBookCardHTML(b, { showBorrowButton: true, showCategoryChip: false })}
          </div>
        `
        )
        .join("");

      if (typeof window.imsaInitBookCovers === "function") window.imsaInitBookCovers();
      if (typeof window.imsaLoadAllCovers === "function") window.imsaLoadAllCovers();
      if (typeof window.imsaLoadAllBookCovers === "function") window.imsaLoadAllBookCovers();
    }

    // scroll doux
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closePanel() {
    const panel = document.getElementById("categoryPanelContainer");
    if (!panel) return;
    panel.classList.add("d-none");
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function setFilterPills(activeKey) {
    document.querySelectorAll("[data-category-filter]").forEach((btn) => {
      const k = btn.getAttribute("data-category-filter");
      const isActive = k === activeKey;
      btn.classList.toggle("active", isActive);
      if (isActive) {
        btn.classList.remove("btn-orange-outline");
        btn.classList.add("btn-orange");
      } else {
        btn.classList.remove("btn-orange");
        btn.classList.add("btn-orange-outline");
      }
    });
  }

  function applyCategoryCardFilters() {
    const search = (document.getElementById("categorySearchInput")?.value || "").trim().toLowerCase();
    const activePill = document.querySelector("[data-category-filter].active");
    const selectedKey = activePill ? activePill.getAttribute("data-category-filter") : "toutes";

    const cards = document.querySelectorAll("#categoriesGrid [data-category]");
    let visibleCount = 0;
    cards.forEach((card) => {
      const key = card.getAttribute("data-category");
      const label = card.querySelector("h3")?.textContent || "";
      const desc = card.querySelector("p")?.textContent || "";
      const matchesSearch = !search || (label + " " + desc).toLowerCase().includes(search);
      const matchesPill = selectedKey === "toutes" || selectedKey === key;
      const show = matchesSearch && matchesPill;
      card.style.display = show ? "" : "none";
      if (show) visibleCount++;
    });

    const empty = document.getElementById("categoryEmptyState");
    const grid = document.getElementById("categoriesGrid");
    if (empty && grid) {
      empty.classList.toggle("d-none", visibleCount > 0);
      grid.classList.toggle("d-none", visibleCount === 0);
    }
  }

  function wireUpBorrowLinks() {
    document.addEventListener("click", async (e) => {
      const link = e.target.closest("[data-action='borrow']");
      if (!link) return;
      const bookId = link.getAttribute("data-book-id");
      if (!bookId) return;

      e.preventDefault();
      await borrowBook(bookId, "");
      if (window.imsaToast) {
        window.imsaToast("📚 Emprunt (démo) prêt — confirmation sur la fiche du livre.", "success");
      }
      const href = link.getAttribute("href");
      if (href) window.location.href = href;
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // 0. Render everything
    renderCategories();

    const closeBtn = document.getElementById("categoryPanelCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", closePanel);

    // Dynamic listeners
    document.querySelectorAll("[data-category]").forEach((card) => {
      card.addEventListener("click", () => openPanel(card.getAttribute("data-category")));
      card.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") openPanel(card.getAttribute("data-category"));
      });
      const btn = card.querySelector("a.btn");
      if (btn) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          openPanel(card.getAttribute("data-category"));
        });
      }
    });

    document.querySelectorAll("[data-category-filter]").forEach((pill) => {
      pill.addEventListener("click", () => {
        setFilterPills(pill.getAttribute("data-category-filter"));
        applyCategoryCardFilters();
      });
    });

    const input = document.getElementById("categorySearchInput");
    if (input) input.addEventListener("input", applyCategoryCardFilters);

    applyCategoryCardFilters();
    wireUpBorrowLinks();

    // Catégorie via URL: categories.html?category=romans
    const selected = getQueryParam("category");
    if (selected) {
      const pillBtn = document.querySelector(`[data-category-filter='${selected}']`);
      if (pillBtn) setFilterPills(selected);
      openPanel(selected);
      applyCategoryCardFilters();
    } else if (getQueryParam("q")) {
      applyCategoryCardFilters();
    } else {
      const firstPill = document.querySelector("[data-category-filter='toutes']");
      if (firstPill) setFilterPills("toutes");
    }
  });
})();

