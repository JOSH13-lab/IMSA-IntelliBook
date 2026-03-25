/* IMSA IntelliBook - Données & API Bridge */

// Configuration des catégories
window.IMSA_CATEGORIES = {
  romans: { key: "romans", label: "Romans Africains", badgeClass: "badge-romans" },
  histoire: { key: "histoire", label: "Histoire & Patrimoine Gabonais", badgeClass: "badge-histoire" },
  sciences: { key: "sciences", label: "Sciences & Recherche", badgeClass: "badge-sciences" },
  informatique: { key: "informatique", label: "Informatique & Technologies", badgeClass: "badge-informatique" },
  droit: { key: "droit", label: "Droit & Sciences Politiques", badgeClass: "badge-droit" },
  jeunesse: { key: "jeunesse", label: "Littérature Jeunesse Africaine", badgeClass: "badge-jeunesse" },
  arts: { key: "arts", label: "Arts, Musique & Culture", badgeClass: "badge-arts" },
  economie: { key: "economie", label: "Économie & Développement", badgeClass: "badge-economie" },
  // Nouvelles filières IMSA
  "san-bms": { key: "san-bms", label: "SAN — Biologie Médicale", badgeClass: "badge-san-bms" },
  "san-sso": { key: "san-sso", label: "SAN — Sciences Sociales", badgeClass: "badge-san-sso" },
  "san-ema": { key: "san-ema", label: "SAN — Études de Maïeutique", badgeClass: "badge-san-ema" },
  "san-sin": { key: "san-sin", label: "SAN — Soins Infirmiers", badgeClass: "badge-san-sin" },
  "bav-s2a": { key: "bav-s2a", label: "BAV — Sciences Agronomiques", badgeClass: "badge-bav-s2a" },
  "bav-hse": { key: "bav-hse", label: "BAV — Hygiène Sécurité", badgeClass: "badge-bav-hse" },
  "bav-sha": { key: "bav-sha", label: "BAV — Sciences Halieutiques", badgeClass: "badge-bav-sha" },
  "gin-pmi": { key: "gin-pmi", label: "GIN — Production & Maintenance", badgeClass: "badge-gin-pmi" },
  "gin-gel": { key: "gin-gel", label: "GIN — Génie Électrique", badgeClass: "badge-gin-gel" },
  "gif-rtl": { key: "gif-rtl", label: "GIF — Réseaux & Télécoms", badgeClass: "badge-gif-rtl" },
  "gif-glo": { key: "gif-glo", label: "GIF — Génie Logiciel", badgeClass: "badge-gif-glo" }
};

// Cet objet sera peuplé de manière asynchrone par l'API.
window.booksData = {};
Object.keys(window.IMSA_CATEGORIES).forEach(k => {
  window.booksData[k] = [];
});

// Interface API IMSA
window.imsaApi = {
  API_BASE: 'http://localhost:5000/api',

  async fetchBooksByCategory(categoryKey) {
    try {
      const res = await fetch(`${this.API_BASE}/categories/${categoryKey}/books`);
      const result = await res.json();
      return result.data || [];
    } catch (err) {
      console.error(`Erreur chargement catégorie ${categoryKey}:`, err);
      return [];
    }
  },

  async fetchBookById(bookId) {
    try {
      const res = await fetch(`${this.API_BASE}/books/${bookId}`);
      const result = await res.json();
      const b = result.data;
      if (!b) return null;
      // Normalisation minimaliste
      return {
        ...b,
        categoryKey: b.category_slug || b.categoryKey,
        rating: b.average_rating || 0,
        ratingCount: b.total_reviews || 0,
        shortSummary: b.summary || "",
        coverUrl: b.cover_url || b.coverUrl || `https://books.google.com/books/content?q=intitle:${encodeURIComponent(b.title)}+inauthor:${encodeURIComponent(b.author || '')}&printsec=frontcover&img=1&zoom=1&source=gbs_api`
      };
    } catch (err) {
      console.error(`Erreur chargement livre ${bookId}:`, err);
      return null;
    }
  },

  async fetchAllBooksByCategories() {
    const keys = Object.keys(window.IMSA_CATEGORIES);
    const promises = keys.map(k => this.fetchBooksByCategory(k));
    const results = await Promise.all(promises);
    
    keys.forEach((key, index) => {
      window.booksData[key] = results[index].map(b => ({
        ...b,
        categoryKey: key, // Pour compatibilité avec les classes CSS
        id: b.id, // Support UUID
        rating: b.average_rating || 0,
        ratingCount: b.total_reviews || 0,
        shortSummary: b.summary || "",
        coverUrl: b.cover_url || b.coverUrl || `https://books.google.com/books/content?q=intitle:${encodeURIComponent(b.title)}+inauthor:${encodeURIComponent(b.author || '')}&printsec=frontcover&img=1&zoom=1&source=gbs_api`
      }));
    });
    
    // Invalider l'index pour forcer sa reconstruction
    window.__booksIndex = null;
    return window.booksData;
  }
};

// Utilitaires IMSA (UI & Helpers)
window.imsaUtils = {
  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },

  getAllBooks() {
    const out = [];
    Object.keys(window.booksData).forEach((k) => {
      out.push(...window.booksData[k]);
    });
    return out;
  },

  getBookById(bookId) {
    if (!bookId) return null;
    if (!window.__booksIndex) {
      const all = this.getAllBooks();
      window.__booksIndex = all.reduce((map, b) => {
        map[b.id] = b;
        return map;
      }, {});
    }
    return window.__booksIndex[bookId] || null;
  },

  getBooksByCategory(categoryKey) {
    return window.booksData[categoryKey] || [];
  },

  formatStars(rating) {
    const r = Number(rating || 0);
    const full = Math.floor(r);
    const half = r - full >= 0.5 ? 1 : 0;
    const empty = Math.max(0, 5 - full - half);
    const orange = "text-orange";
    let html = "";
    for (let i = 0; i < full; i++) html += `<i class="fa-solid fa-star ${orange}"></i>`;
    if (half) html += `<i class="fa-solid fa-star-half-stroke ${orange}"></i>`;
    for (let i = 0; i < empty; i++) html += `<i class="fa-regular fa-star ${orange}"></i>`;
    return html;
  },

  categoryLabel(categoryKey) {
    return window.IMSA_CATEGORIES[categoryKey]?.label || categoryKey;
  },

  categoryBadgeClass(categoryKey) {
    return window.IMSA_CATEGORIES[categoryKey]?.badgeClass || "";
  },

  coverGradientClass(categoryKey) {
    const map = {
      romans: "cover-romans",
      histoire: "cover-histoire",
      sciences: "cover-sciences",
      informatique: "cover-info",
      droit: "cover-droit",
      jeunesse: "cover-jeunesse",
      arts: "cover-arts",
      economie: "cover-economie",
      "san-bms": "cover-san-bms",
      "san-sso": "cover-san-sso",
      "san-ema": "cover-san-ema",
      "san-sin": "cover-san-sin",
      "bav-s2a": "cover-bav-s2a",
      "bav-hse": "cover-bav-hse",
      "bav-sha": "cover-bav-sha",
      "gin-pmi": "cover-gin-pmi",
      "gin-gel": "cover-gin-gel",
      "gif-rtl": "cover-gif-rtl",
      "gif-glo": "cover-gif-glo"
    };
    return map[categoryKey] || "cover-romans";
  },

  renderBookCoverContainerHTML(book) {
    const title = this.escapeHtml(book.title || "");
    const author = this.escapeHtml(book.author || "");
    const gradient = this.coverGradientClass(book.categoryKey);
    const coverUrl = book.coverUrl || "";

    return `
      <div class="book-cover-container ${gradient}">
        <img
          src="${coverUrl}"
          alt="Couverture de ${title}"
          class="book-cover-img"
          loading="lazy"
          onload="this.classList.add('loaded')"
          onerror="this.style.display='none'"
        >
        <div class="book-cover-fallback">
          <i class="fa-solid fa-book cover-icon"></i>
          <div class="cover-title">${title}</div>
          <div class="cover-author">${author}</div>
        </div>
      </div>
    `;
  },

  renderBookCardHTML(book, opts = {}) {
    const {
      variant = "default",
      showNewBadge = false,
      showBorrowButton = true,
      showCategoryChip = true,
      linkReadMore = true
    } = opts;

    const categoryKey = book.categoryKey;
    const catLabel = this.categoryLabel(categoryKey);
    const summary = this.escapeHtml(book.shortSummary || "");
    const title = this.escapeHtml(book.title || "");
    const author = this.escapeHtml(book.author || "");
    const stars = this.formatStars(book.rating);
    const viewHref = `livre.html?id=${encodeURIComponent(book.id)}`;
    
    const borrowActionButton = showBorrowButton
      ? `<a href="${viewHref}" class="btn btn-orange-outline w-100 mt-2 book-borrow-link"
            data-action="borrow"
            data-book-id="${this.escapeHtml(book.id)}">
          Emprunter
        </a>`
      : "";

    const seeCatalogButton = `<a href="${viewHref}" class="btn btn-blue-dark w-100 mt-2 book-detail-link">
        Voir le catalogue
      </a>`;

    const compactClass = variant === "compact" ? "book-card-compact" : "";
    const newBadge = (showNewBadge && book.is_new)
      ? `<span class="badge badge-new position-absolute top-0 end-0 m-2" style="z-index:2;">NOUVEAU</span>`
      : "";

    const catPill = showCategoryChip
      ? `<div class="book-cat mb-2">${this.escapeHtml(catLabel)}</div>`
      : "";

    return `
      <div class="card book-card ${compactClass} h-100 position-relative" data-id="${this.escapeHtml(book.id)}">
        ${newBadge}
        <div class="card-body p-0 d-flex flex-column">
          ${this.renderBookCoverContainerHTML(book)}
          <div class="book-info p-3 d-flex flex-column flex-grow-1">
            ${catPill}
            <h3 class="book-title clamp-2" style="font-size:16px;">${title}</h3>
            <div class="book-author text-muted small mt-1">${author} · ${this.escapeHtml(book.year)}</div>
            <div class="book-rating mt-2">
              <div class="stars">${stars}</div>
              <div class="small text-muted mt-1">
                ${book.rating ? Number(book.rating).toFixed(1) : "—"}
                <span class="text-muted">(${this.escapeHtml(book.ratingCount || 0)} avis)</span>
              </div>
            </div>
            <p class="book-summary clamp-3 mt-2 small">${summary}</p>
            <div class="mt-auto">
              ${linkReadMore ? seeCatalogButton : ""}
              ${borrowActionButton}
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
