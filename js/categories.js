/* IMSA IntelliBook - Page Catégories */
(function () {
  const DEFAULT_CATEGORY_KEY = "romans";

  const API_BASE = 'http://localhost:5000/api';

  async function fetchBooks(categoryKey) {
    try {
      // Priorité au Backend: GET /api/books?category=...
      const url = categoryKey === 'toutes' 
        ? `${API_BASE}/books?per_page=100` 
        : `${API_BASE}/books?category=${encodeURIComponent(categoryKey)}&per_page=100`;
        
      const res = await fetch(url);
      const json = await res.json();
      
      if (json.success && json.data && json.data.length > 0) {
        console.log(`📚 ${json.data.length} livres chargés depuis l'API pour: ${categoryKey}`);
        return json.data;
      }
      
      // Fallback sur les données statiques si l'API est vide ou échoue
      return window.imsaUtils.getBooksByCategory(categoryKey);
    } catch (err) {
      console.warn("API indisponible, repli sur les données statiques (js/data.js)");
      return window.imsaUtils.getBooksByCategory(categoryKey);
    }
  }

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

  function renderBookCardForListing(book) {
    const card = document.createElement("div");
    card.className = "col-12 col-md-6 col-lg-3";
    card.innerHTML = window.imsaUtils.renderBookCardHTML(book, { 
      showNewBadge: true, 
      showBorrowButton: true, 
      showCategoryChip: true, 
      linkReadMore: true 
    });
    return card;
  }

  async function openPanel(categoryKey) {
    const panel = document.getElementById("categoryPanelContainer");
    const title = document.getElementById("categoryPanelTitle");
    const booksWrap = document.getElementById("categoryPanelBooks");
    if (!panel || !title || !booksWrap) return;

    title.textContent = window.imsaUtils.categoryLabel(categoryKey);
    panel.classList.remove("d-none");

    booksWrap.innerHTML = "<div class='text-center w-100 p-5'><i class='fa-solid fa-spinner fa-spin fa-2x text-orange'></i></div>";
    
    const books = await fetchBooks(categoryKey);
    
    booksWrap.innerHTML = books
      .map(
        (b) => `
        <div class="col-12 col-md-6 col-lg-3">
          ${window.imsaUtils.renderBookCardHTML(b, { showNewBadge: true, showBorrowButton: true, showCategoryChip: true, linkReadMore: true })}
        </div>
      `
      )
      .join("");

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
    const closeBtn = document.getElementById("categoryPanelCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", closePanel);

    // Panneau ouverture
    document.querySelectorAll("[data-category]").forEach((card) => {
      card.addEventListener("click", () => openPanel(card.getAttribute("data-category")));
      card.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") openPanel(card.getAttribute("data-category"));
      });
      // Bouton "Voir les livres" ne navigue pas.
      const btn = card.querySelector("a.btn");
      if (btn) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          openPanel(card.getAttribute("data-category"));
        });
      }
    });

    // Pills
    document.querySelectorAll("[data-category-filter]").forEach((pill) => {
      pill.addEventListener("click", () => {
        setFilterPills(pill.getAttribute("data-category-filter"));
        applyCategoryCardFilters();
      });
    });

    // Recherche temps réel
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

