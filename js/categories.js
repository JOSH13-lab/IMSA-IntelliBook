/* IMSA IntelliBook - Page Catégories */
(function () {
  const DEFAULT_CATEGORY_KEY = "romans";

  async function fetchBooks(categoryKey) {
    try {
      // BACKEND: GET /api/books?category=...
      // const res = await fetch(`/api/books?category=${encodeURIComponent(categoryKey)}`);
      // return await res.json();
      return window.imsaUtils.getBooksByCategory(categoryKey);
    } catch (err) {
      console.error(err);
      return [];
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

  function buildBookCardHTML(book) {
    const title = window.imsaUtils.escapeHtml(book.title || "");
    const author = window.imsaUtils.escapeHtml(book.author || "");
    const year = window.imsaUtils.escapeHtml(book.year || "");
    const summary = window.imsaUtils.escapeHtml(book.short_summary || book.shortSummary || "");
    const categoryKey = book.category_key || book.categoryKey || "";
    const catLabel = window.imsaUtils.categoryLabel(categoryKey);
    const stars = window.imsaUtils.formatStars(book.rating);
    const rating = book.rating ? Number(book.rating).toFixed(1) : "—";
    const ratingCount = book.rating_count || book.ratingCount || 0;
    const viewHref = `livre.html?id=${encodeURIComponent(book.id)}`;

    return `
      <div class="card book-card h-100 position-relative" data-id="${window.imsaUtils.escapeHtml(book.id)}">
        ${book.is_new || book.isNew ? '<span class="badge badge-new position-absolute top-0 end-0 m-2" style="z-index:2;">NOUVEAU</span>' : ""}
        <div class="card-body p-0 d-flex flex-column">
          <div class="book-cover-wrap">
            <img 
              src="${book.cover_url || book.coverUrl}" 
              alt="${title}"
              class="book-cover-img"
              style="width:100%;height:100%;object-fit:cover;"
              onerror="this.src='https://books.google.com/books/content?q=${encodeURIComponent(title)}&printsec=frontcover&img=1&zoom=1'"
            />
          </div>
          <div class="book-info p-3 d-flex flex-column flex-grow-1">
            <div class="book-cat mb-2">${window.imsaUtils.escapeHtml(catLabel)}</div>
            <h3 class="book-title clamp-2" style="font-size:16px;">${title}</h3>
            <div class="book-author text-muted small mt-1">${author} · ${year}</div>
            <div class="book-rating mt-2">
              <div class="stars">${stars}</div>
              <div class="small text-muted mt-1">
                ${rating} <span class="text-muted">(${ratingCount} avis)</span>
              </div>
            </div>
            <p class="book-summary clamp-3 mt-2 small">${summary}</p>
            <div class="mt-auto">
              <a href="${viewHref}" class="btn btn-blue-dark w-100 mt-2">Voir le catalogue</a>
              <a href="${viewHref}" class="btn btn-orange-outline w-100 mt-2" data-action="borrow" data-book-id="${window.imsaUtils.escapeHtml(book.id)}">Emprunter</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderBookCardForListing(book) {
    const card = document.createElement("div");
    card.className = "col-12 col-md-6 col-lg-3";
    card.innerHTML = buildBookCardHTML(book);
    return card;
  }

  async function openPanel(categoryKey) {
    const panel = document.getElementById("categoryPanelContainer");
    const title = document.getElementById("categoryPanelTitle");
    const booksWrap = document.getElementById("categoryPanelBooks");
    if (!panel || !title || !booksWrap) return;

    title.textContent = window.imsaUtils.categoryLabel(categoryKey);
    panel.classList.remove("d-none");

    booksWrap.innerHTML = '<div class="col-12 text-center p-5"><div class="spinner-border text-orange" role="status"></div></div>';

    try {
      const response = await fetch(`http://localhost:5000/api/categories/${categoryKey}/books`);
      const result = await response.json();
      const books = result.data || [];

      booksWrap.innerHTML = books
        .map(
          (b) => `
          <div class="col-12 col-md-6 col-lg-3">
            ${buildBookCardHTML(b)}
          </div>
        `
        )
        .join("");
    } catch (err) {
      console.error("Erreur lors du chargement des livres:", err);
      // Fallback data if API fails (optional but good for UX)
      const books = window.booksData[categoryKey] || [];
      booksWrap.innerHTML = books
        .map(
          (b) => `
          <div class="col-12 col-md-6 col-lg-3">
            ${buildBookCardHTML(b)}
          </div>
        `
        )
        .join("");
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

