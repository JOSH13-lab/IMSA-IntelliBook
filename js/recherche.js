/* IMSA IntelliBook - Page Recherche Avancée */
(function () {
  function getSearchParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get("q") || "",
      category: params.get("category") || "",
      year: params.get("year") || "",
      tag: params.get("tag") || "",
      author: params.get("author") || ""
    };
  }

  function renderCategoryFilters() {
    const container = document.querySelector("#searchFiltersForm .d-grid.gap-2");
    if (!container) return;
    
    const categories = Object.values(window.IMSA_CATEGORIES);
    container.innerHTML = "";
    categories.forEach(cat => {
      container.innerHTML += `
        <label class="form-check">
          <input class="form-check-input" type="checkbox" name="categories" value="${cat.key}" data-filter="category" />
          ${cat.label}
        </label>
      `;
    });
  }

  function escape(str) {
    return window.imsaUtils.escapeHtml(str);
  }

  function parseNumber(val) {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }

  function getActiveFiltersUI() {
    const selectedCategories = Array.from(document.querySelectorAll("input[name='categories'][data-filter='category']:checked")).map((i) => i.value);
    const author = (document.getElementById("authorInput")?.value || "").trim();
    const yearFrom = parseNumber(document.getElementById("yearFrom")?.value);
    const yearTo = parseNumber(document.getElementById("yearTo")?.value);
    const langue = document.querySelector("input[name='langue']:checked")?.value || "";
    const availability = document.getElementById("availabilitySelect")?.value || "tous";
    const minRating = parseNumber(document.getElementById("minRatingSelect")?.value) || 0;
    return { selectedCategories, author, yearFrom, yearTo, langue, availability, minRating };
  }

  function computePertinenceScore(book, q) {
    if (!q) return 0;
    const hayTitle = (book.title || "").toLowerCase();
    const hayAuthor = (book.author || "").toLowerCase();
    const hayTags = (book.tags || []).join(" ").toLowerCase();
    const haySummary = (book.shortSummary || "").toLowerCase();
    const needle = q.toLowerCase();
    let score = 0;
    if (hayTitle.includes(needle)) score += 40;
    if (hayAuthor.includes(needle)) score += 25;
    if (hayTags.includes(needle)) score += 18;
    if (haySummary.includes(needle)) score += 10;
    score += Math.min(15, needle.length);
    return score;
  }

  function filterBooksByUI() {
    const params = getSearchParams();
    const all = window.imsaUtils.getAllBooks();
    const ui = getActiveFiltersUI();

    const q = params.q || "";
    const tag = params.tag || "";
    const authorParam = params.author || "";
    const categoryParam = params.category || "";
    const yearParam = params.year || "";

    let minRating = ui.minRating;
    let yearFrom = ui.yearFrom;
    let yearTo = ui.yearTo;

    // Sync depuis l'URL (prioritaire)
    if (categoryParam) {
      if (ui.selectedCategories.length === 0) ui.selectedCategories = [categoryParam];
    }
    if (authorParam && !ui.author) ui.author = authorParam;
    if (yearParam) {
      const y = parseNumber(yearParam);
      if (y) {
        if (!yearFrom) yearFrom = y;
        if (!yearTo) yearTo = y;
      }
    }
    if (tag && (!ui.selectedCategories || ui.selectedCategories.length === 0)) {
      // Pour un tag, on ne filtre pas les catégories, on utilisera le texte.
    }

    return all.filter((book) => {
      if (ui.selectedCategories.length && !ui.selectedCategories.includes(book.categoryKey)) return false;

      if (ui.author) {
        const hay = `${book.author} ${book.title}`.toLowerCase();
        if (!hay.includes(ui.author.toLowerCase())) return false;
      }

      // q (recherche globale)
      if (q) {
        const hay = `${book.title} ${book.author} ${(book.tags || []).join(" ")} ${book.shortSummary}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }

      if (tag) {
        const tags = (book.tags || []).map((t) => t.toLowerCase());
        if (!tags.includes(tag.toLowerCase())) return false;
      }

      // Année
      if (yearFrom && Number(book.year) < yearFrom) return false;
      if (yearTo && Number(book.year) > yearTo) return false;

      if (ui.langue) {
        if ((book.language || "").toLowerCase() !== ui.langue.toLowerCase()) return false;
      }

      if (ui.availability === "available") {
        if (Number(book.availableCount) <= 0) return false;
      }

      if (minRating > 0) {
        if (Number(book.rating) < minRating) return false;
      }

      return true;
    });
  }

  function sortBooks(books) {
    const sort = document.getElementById("sortSelect")?.value || "pertinence";
    const params = getSearchParams();
    const q = params.q || "";

    const copy = [...books];
    if (sort === "title") {
      copy.sort((a, b) => String(a.title).localeCompare(String(b.title), "fr"));
    } else if (sort === "year_desc") {
      copy.sort((a, b) => Number(b.year) - Number(a.year));
    } else if (sort === "rating_desc") {
      copy.sort((a, b) => Number(b.rating) - Number(a.rating));
    } else {
      copy.sort((a, b) => computePertinenceScore(b, q) - computePertinenceScore(a, q));
    }
    return copy;
  }

  function renderActiveBadges() {
    const container = document.getElementById("activeFilterBadges");
    if (!container) return;
    container.innerHTML = "";

    const params = getSearchParams();
    const ui = getActiveFiltersUI();

    const badges = [];
    if (params.q) badges.push({ label: `Texte: "${params.q}"`, key: "q" });
    if (params.tag) badges.push({ label: `Tag: ${params.tag}`, key: "tag" });
    if (params.author) badges.push({ label: `Auteur: ${params.author}`, key: "author" });
    if (ui.selectedCategories.length) badges.push({ label: `Catégorie: ${ui.selectedCategories.length}`, key: "categories" });
    if (ui.author) badges.push({ label: `Auteur: ${ui.author}`, key: "authorField" });
    if (ui.yearFrom) badges.push({ label: `Année: ${ui.yearFrom}`, key: "yearFrom" });
    if (ui.yearTo) badges.push({ label: `Année: ${ui.yearTo}`, key: "yearTo" });
    if (ui.langue) badges.push({ label: `Langue: ${ui.langue}`, key: "langue" });
    if (ui.availability === "available") badges.push({ label: "Disponible", key: "availability" });
    if (ui.minRating > 0) badges.push({ label: `Note: ${ui.minRating}★ et +`, key: "minRating" });

    if (!badges.length) return;

    badges.forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "badge text-bg-light border rounded-pill d-inline-flex align-items-center gap-1";
      btn.innerHTML = `${escape(b.label)} <i class="fa-solid fa-xmark text-muted"></i>`;
      btn.style.cursor = "pointer";
      btn.addEventListener("click", () => {
        // Reset minimal selon les clés.
        const url = new URL(window.location.href);
        url.searchParams.delete("tag");
        url.searchParams.delete("author");
        url.searchParams.delete("category");
        // q & autres restent gérés via les champs UI.
        if (b.key === "q") url.searchParams.set("q", "");
        window.history.pushState({}, "", url.toString());

        if (b.key === "authorField") document.getElementById("authorInput").value = "";
        if (b.key === "yearFrom") document.getElementById("yearFrom").value = "";
        if (b.key === "yearTo") document.getElementById("yearTo").value = "";
        if (b.key === "langue") {
          document.querySelectorAll("input[name='langue']").forEach((r) => (r.checked = false));
        }
        if (b.key === "availability") document.getElementById("availabilitySelect").value = "tous";
        if (b.key === "minRating") document.getElementById("minRatingSelect").value = "0";

        // Reset catégories
        if (b.key === "categories") {
          document.querySelectorAll("input[name='categories'][data-filter='category']").forEach((c) => (c.checked = false));
        }

        state.page = 1;
        renderResults();
      });
      container.appendChild(btn);
    });
  }

  function updateURLFromUI(filters) {
    const url = new URL(window.location.href);
    // q reste un param "q" pour rester cohérent avec l’URL type.
    // On met à jour seulement quelques champs simples si présents.
    if (filters.author && !url.searchParams.get("author")) url.searchParams.set("author", filters.author);
    if (filters.author === "") url.searchParams.delete("author");
    // Les catégories et tags sont gérés via les champs UI (pas systématiquement via URL) pour éviter une URL trop longue.
    window.history.pushState({}, "", url.toString());
  }

  function bookCardHTML(book, mode) {
    const bookWithPreferredCover = {
      ...book,
      coverUrl: window.imsaUtils.resolvePreferredCoverUrl
        ? window.imsaUtils.resolvePreferredCoverUrl(book)
        : (book.coverUrl || book.cover_url || null)
    };

    const cardHtml = window.imsaUtils.renderBookCardHTML(bookWithPreferredCover, {
      showNewBadge: true,
      showBorrowButton: true,
      showCategoryChip: true,
      linkReadMore: true
    });

    if (mode === "grid") {
      return `<div class="col-12 col-md-6 col-lg-3">${cardHtml}</div>`;
    }
    return `<div>${cardHtml}</div>`;
  }

  function renderResults() {
    const grid = document.getElementById("resultsGrid");
    const list = document.getElementById("resultsList");
    const empty = document.getElementById("resultsEmptyState");
    const countBadge = document.getElementById("resultsCountBadge");
    const summaryLine = document.getElementById("resultsRangeText");

    if (!grid || !list) return;

    const allFiltered = sortBooks(filterBooksByUI());
    const total = allFiltered.length;
    if (countBadge) countBadge.textContent = `${total} ouvrages trouvés`;
    if (summaryLine) summaryLine.textContent = "";

    renderActiveBadges();

    const viewMode = state.viewMode;
    const sort = document.getElementById("sortSelect")?.value || "pertinence";

    const start = (state.page - 1) * state.perPage;
    const pageBooks = allFiltered.slice(start, start + state.perPage);

    grid.innerHTML = "";
    list.innerHTML = "";

    if (!total) {
      empty && empty.classList.remove("d-none");
      if (viewMode === "grid") grid.classList.remove("d-none");
      if (viewMode === "list") list.classList.remove("d-none");
      return;
    }

    empty && empty.classList.add("d-none");

    if (viewMode === "grid") {
      grid.classList.remove("d-none");
      list.classList.add("d-none");
      grid.innerHTML = pageBooks.map((b) => bookCardHTML(b, "grid")).join("");
    } else {
      list.classList.remove("d-none");
      grid.classList.add("d-none");
      list.innerHTML = `<div class="d-flex flex-column gap-3">${pageBooks.map((b) => bookCardHTML(b, "list")).join("")}</div>`;
    }

    if (typeof window.imsaInitBookCovers === "function") window.imsaInitBookCovers();
    if (typeof window.imsaLoadAllCovers === "function") window.imsaLoadAllCovers();
    if (typeof window.imsaLoadAllBookCovers === "function") window.imsaLoadAllBookCovers();

    const end = Math.min(total, start + pageBooks.length);
    const rangeText = document.getElementById("resultsRangeText");
    if (rangeText) rangeText.textContent = `Affichage de ${start + 1} à ${end} sur ${total} résultats`;

    renderPagination(total);
  }

  function renderPagination(total) {
    const ul = document.getElementById("searchPagination");
    if (!ul) return;
    ul.innerHTML = "";
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    state.page = Math.min(state.page, pages);

    const add = (label, page, disabled = false, active = false) => {
      const li = document.createElement("li");
      li.className = `page-item${disabled ? " disabled" : ""}${active ? " active" : ""}`;
      const a = document.createElement("a");
      a.className = "page-link";
      a.href = "#";
      a.textContent = label;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (disabled) return;
        state.page = page;
        renderResults();
      });
      li.appendChild(a);
      ul.appendChild(li);
    };

    add("Préc.", Math.max(1, state.page - 1), state.page === 1);

    const maxButtons = 7;
    let start = Math.max(1, state.page - Math.floor(maxButtons / 2));
    let end = Math.min(pages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p++) {
      add(String(p), p, false, p === state.page);
    }

    add("Suiv.", Math.min(pages, state.page + 1), state.page === pages);
  }

  function setView(mode) {
    state.viewMode = mode;
    const gridBtn = document.getElementById("viewGridBtn");
    const listBtn = document.getElementById("viewListBtn");
    if (gridBtn) gridBtn.classList.toggle("btn-blue-dark", mode === "grid");
    if (gridBtn) gridBtn.classList.toggle("btn-orange-outline", mode !== "grid");
    if (listBtn) listBtn.classList.toggle("btn-orange-outline", mode === "list");
    if (listBtn) listBtn.classList.toggle("btn-blue-dark", mode !== "list");
    renderResults();
  }

  const state = {
    page: 1,
    perPage: 20,
    viewMode: "grid"
  };

  document.addEventListener("DOMContentLoaded", async () => {
    // Render dynamic filters
    renderCategoryFilters();
    if (window.imsaApi?.loadLocalCoversManifest) {
      await window.imsaApi.loadLocalCoversManifest();
    }

    // S'assurer que les données sont chargées
    if (window.imsaApi && (!window.booksData || Object.values(window.booksData).every(arr => arr.length === 0))) {
      await window.imsaApi.fetchAllBooksByCategories();
    }
    
    const params = getSearchParams();

    // Pré-remplissage depuis URL
    if (params.q) {
      const bigInput = document.getElementById("bigSearchInput");
      if (bigInput) bigInput.value = params.q;
    }

    // URL category -> check
    if (params.category) {
      document.querySelectorAll("input[name='categories'][data-filter='category']").forEach((c) => {
        c.checked = c.value === params.category;
      });
    }
    if (params.author) {
      const authorField = document.getElementById("authorInput");
      if (authorField) authorField.value = params.author;
    }
    if (params.year) {
      const y = parseNumber(params.year);
      if (y) {
        const from = document.getElementById("yearFrom");
        const to = document.getElementById("yearTo");
        if (from) from.value = y;
        if (to) to.value = y;
      }
    }

    // Sort
    const sortSel = document.getElementById("sortSelect");
    if (sortSel) sortSel.addEventListener("change", () => {
      state.page = 1;
      renderResults();
    });

    // View toggle
    const gridBtn = document.getElementById("viewGridBtn");
    const listBtn = document.getElementById("viewListBtn");
    if (gridBtn) gridBtn.addEventListener("click", () => setView("grid"));
    if (listBtn) listBtn.addEventListener("click", () => setView("list"));
    // initial
    setView("grid");

    // Items per page
    const perSel = document.getElementById("itemsPerPageSelect");
    if (perSel) {
      perSel.addEventListener("change", () => {
        state.perPage = Number(perSel.value || 20);
        state.page = 1;
        renderResults();
      });
    }

    // Filters change -> render
    const form = document.getElementById("searchFiltersForm");
    if (form) {
      form.addEventListener("input", () => {
        state.page = 1;
        renderResults();
      });
      form.addEventListener("change", () => {
        state.page = 1;
        renderResults();
      });
    }

    // Réinitialiser
    const resetBtn = form ? form.querySelector("[data-action='reset-filters']") : document.querySelector("[data-action='reset-filters']");
    const realResetBtn = document.querySelector("[data-action='reset-filters']");
    if (realResetBtn) {
      realResetBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const url = new URL(window.location.href);
        url.searchParams.set("q", "");
        url.searchParams.delete("tag");
        url.searchParams.delete("author");
        url.searchParams.delete("category");
        url.searchParams.delete("year");
        window.history.pushState({}, "", url.toString());

        document.querySelectorAll("input[name='categories'][data-filter='category']").forEach((c) => (c.checked = false));
        const authorField = document.getElementById("authorInput");
        if (authorField) authorField.value = "";
        const from = document.getElementById("yearFrom");
        const to = document.getElementById("yearTo");
        if (from) from.value = "";
        if (to) to.value = "";
        document.querySelectorAll("input[name='langue']").forEach((r) => (r.checked = false));
        const avail = document.getElementById("availabilitySelect");
        if (avail) avail.value = "tous";
        const rating = document.getElementById("minRatingSelect");
        if (rating) rating.value = "0";

        state.page = 1;
        renderResults();
      });
    }

    // Recherche champ header -> push URL q
    const bigInput = document.getElementById("bigSearchInput");
    const bigBtn = document.getElementById("bigSearchBtn");
    if (bigInput && bigBtn) {
      bigBtn.addEventListener("click", () => {
        const q = (bigInput.value || "").trim();
        const url = new URL(window.location.href);
        if (q) url.searchParams.set("q", q);
        else url.searchParams.delete("q");
        window.history.pushState({}, "", url.toString());
        state.page = 1;
        renderResults();
      });
      bigInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") bigBtn.click();
      });
    }

    // Emprunter -> stub + navigation (si href)
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-action='borrow']");
      if (!link) return;
      e.preventDefault();
      const bookId = link.getAttribute("data-book-id");
      const href = link.getAttribute("href");
      if (bookId) {
        (async () => {
          try {
            // BACKEND: GET /api/books/:id/read stub isn't used here; just borrowBook stub.
            await new Promise((r) => setTimeout(r, 120));
            window.imsaToast && window.imsaToast("Emprunt (démo) enregistré. Ouverture de la fiche...", "success");
          } catch (err) {
            window.imsaToast && window.imsaToast("Erreur lors de l’emprunt (démo).", "error");
          } finally {
            if (href) window.location.href = href;
          }
        })();
      } else {
        if (href) window.location.href = href;
      }
    });

    renderResults();
  });
})();

