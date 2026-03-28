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
window.IMSA_LOCAL_COVERS = {};

// Interface API IMSA
window.imsaApi = {
  API_BASE: 'http://localhost:5000/api',
  _localCoversPromise: null,

  async loadLocalCoversManifest() {
    if (this._localCoversPromise) return this._localCoversPromise;

    this._localCoversPromise = fetch('covers/manifest.json', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : {})
      .then((manifest) => {
        window.IMSA_LOCAL_COVERS = manifest || {};
        return window.IMSA_LOCAL_COVERS;
      })
      .catch(() => {
        window.IMSA_LOCAL_COVERS = {};
        return window.IMSA_LOCAL_COVERS;
      });

    return this._localCoversPromise;
  },

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
      await this.loadLocalCoversManifest();
      const res = await fetch(`${this.API_BASE}/books/${bookId}`);
      const result = await res.json();
      const b = result.data;
      if (!b) return null;
      // Normalisation minimaliste
      const coverUrl = (window.imsaUtils?.sanitizeCoverUrl
        ? window.imsaUtils.sanitizeCoverUrl(b.cover_url || b.coverUrl || null)
        : (b.cover_url || b.coverUrl || null));
      
      return {
        ...b,
        categoryKey: b.category_slug || b.categoryKey,
        rating: b.average_rating || 0,
        ratingCount: b.total_reviews || 0,
        shortSummary: b.summary || "",
        coverUrl: coverUrl
      };
    } catch (err) {
      console.error(`Erreur chargement livre ${bookId}:`, err);
      return null;
    }
  },

  async fetchAllBooksByCategories() {
    await this.loadLocalCoversManifest();
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
        coverUrl: (window.imsaUtils?.sanitizeCoverUrl
          ? window.imsaUtils.sanitizeCoverUrl(b.cover_url || b.coverUrl || null)
          : (b.cover_url || b.coverUrl || null))
      }));
    });
    
    // Invalider l'index pour forcer sa reconstruction
    window.__booksIndex = null;
    return window.booksData;
  }
};

window.imsaApi.loadLocalCoversManifest();

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

  getLocalCoverUrl(book) {
    const key = book?.legacy_id || book?.id;
    return key ? window.IMSA_LOCAL_COVERS?.[key]?.file || null : null;
  },

  resolvePreferredCoverUrl(book) {
    return this.getLocalCoverUrl(book) || this.sanitizeCoverUrl(book?.coverUrl || book?.cover_url) || this.buildGeneratedCoverUrl(book || {});
  },

  sanitizeCoverUrl(url) {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    if (
      trimmed.includes("books.google.com/books/content") ||
      trimmed.includes("source=gbs_api") ||
      trimmed.includes("vid=ISBN:")
    ) {
      return null;
    }

    return trimmed;
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

  generatedCoverStyle(categoryKey) {
    const literary = new Set(["romans", "histoire", "droit"]);
    const academic = new Set(["sciences", "economie", "san-bms", "san-sso", "san-ema", "san-sin", "bav-s2a", "bav-hse", "bav-sha"]);
    const technical = new Set(["informatique", "gin-pmi", "gin-gel", "gif-rtl", "gif-glo"]);
    const vibrant = new Set(["jeunesse", "arts"]);

    if (literary.has(categoryKey)) return "literary";
    if (academic.has(categoryKey)) return "academic";
    if (technical.has(categoryKey)) return "technical";
    if (vibrant.has(categoryKey)) return "vibrant";
    return "literary";
  },

  normalizedCoverText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  },

  hashedCoverValue(value) {
    let hash = 0;
    const text = String(value || "");
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  },

  inferGeneratedTitleTheme(book) {
    const normalized = `${this.normalizedCoverText(book.title)} ${this.normalizedCoverText(book.categoryKey)}`;
    const author = String(book.author || "");
    const authorSurname = author.split(/\s+/).filter(Boolean).slice(-1)[0] || author;

    const themes = [
      { key: "forest", eyebrow: "FORET ET MEMOIRE", match: ["foret", "brousse", "nature", "ecologie", "biodiversite", "plantes", "agriculture", "gabon"] },
      { key: "cosmos", eyebrow: "IDEES ET UNIVERS", match: ["temps", "science", "chaos", "harmonie", "cosmos", "physique", "quantique", "etoile"] },
      { key: "network", eyebrow: "SYSTEMES ET RESEAUX", match: ["reseau", "data", "cloud", "web", "python", "algorith", "intelligence", "cyber", "logiciel", "telecom"] },
      { key: "power", eyebrow: "POUVOIR ET SOCIETE", match: ["etat", "droit", "constitution", "politique", "nation", "regime", "economie", "developpement"] },
      { key: "journey", eyebrow: "VOYAGE INTERIEUR", match: ["aventure", "enfant", "petit", "lettre", "soleils", "monde", "americanah", "murambi", "voyage"] },
      { key: "legend", eyebrow: "CONTES ET HERITAGES", match: ["conte", "epopee", "kirikou", "reine", "lion", "mvett", "histoire", "arts", "musique"] }
    ];

    const picked = themes.find((theme) => theme.match.some((term) => normalized.includes(term))) || themes[0];
    return {
      key: picked.key,
      eyebrow: picked.eyebrow,
      byline: authorSurname.toUpperCase()
    };
  },

  generatedThemeArtwork(theme, accent) {
    const artworks = {
      forest: `
        <circle cx="232" cy="122" r="62" fill="rgba(255,255,255,0.08)" />
        <path d="M42 276 C72 214, 108 186, 146 130" stroke="${accent}" stroke-opacity="0.42" stroke-width="4" fill="none" />
        <path d="M82 278 C108 224, 148 182, 198 126" stroke="rgba(255,255,255,0.14)" stroke-width="3" fill="none" />
        <circle cx="94" cy="146" r="20" fill="rgba(255,255,255,0.08)" />
      `,
      cosmos: `
        <circle cx="226" cy="118" r="56" fill="rgba(255,255,255,0.1)" />
        <circle cx="226" cy="118" r="28" fill="rgba(255,255,255,0.06)" />
        <circle cx="92" cy="164" r="4" fill="${accent}" />
        <circle cx="118" cy="136" r="3" fill="rgba(255,255,255,0.9)" />
        <circle cx="148" cy="182" r="2.5" fill="rgba(255,255,255,0.8)" />
        <path d="M56 230 Q144 160 248 204" stroke="rgba(255,255,255,0.16)" stroke-width="2" fill="none" />
      `,
      network: `
        <rect x="42" y="116" width="210" height="148" rx="18" fill="rgba(7,10,18,0.2)" />
        <circle cx="74" cy="146" r="7" fill="${accent}" />
        <circle cx="188" cy="136" r="7" fill="rgba(255,255,255,0.8)" />
        <circle cx="230" cy="206" r="7" fill="rgba(255,255,255,0.8)" />
        <circle cx="120" cy="232" r="7" fill="rgba(255,255,255,0.8)" />
        <path d="M74 146 L188 136 L230 206 L120 232 Z" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" fill="none" />
      `,
      power: `
        <rect x="46" y="110" width="198" height="160" rx="8" fill="rgba(255,255,255,0.06)" />
        <rect x="58" y="122" width="20" height="136" fill="${accent}" fill-opacity="0.88" />
        <line x1="92" y1="144" x2="228" y2="144" stroke="rgba(255,255,255,0.18)" />
        <line x1="92" y1="188" x2="228" y2="188" stroke="rgba(255,255,255,0.14)" />
        <line x1="92" y1="232" x2="204" y2="232" stroke="rgba(255,255,255,0.1)" />
      `,
      journey: `
        <path d="M36 256 C78 236, 110 208, 144 194 S214 162, 266 124" stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round" />
        <circle cx="92" cy="216" r="10" fill="rgba(255,255,255,0.14)" />
        <circle cx="190" cy="166" r="14" fill="rgba(255,255,255,0.1)" />
        <circle cx="248" cy="132" r="18" fill="rgba(255,255,255,0.12)" />
      `,
      legend: `
        <circle cx="76" cy="120" r="36" fill="rgba(255,255,255,0.12)" />
        <circle cx="232" cy="172" r="52" fill="rgba(255,255,255,0.08)" />
        <path d="M42 274 Q96 230 150 252 T258 236" stroke="${accent}" stroke-width="3" fill="none" />
        <path d="M62 146 Q112 108 160 146" stroke="rgba(255,255,255,0.16)" stroke-width="2" fill="none" />
      `
    };

    return artworks[theme.key] || artworks.forest;
  },

  generatedUniqueOverlay(book, accent) {
    const hash = this.hashedCoverValue(`${book.title}|${book.author}|${book.categoryKey}`);
    const x1 = 34 + (hash % 80);
    const y1 = 96 + (hash % 70);
    const x2 = 170 + (hash % 70);
    const y2 = 120 + ((hash >> 3) % 90);
    const r1 = 10 + (hash % 18);
    const r2 = 22 + ((hash >> 4) % 24);
    const barY = 278 + ((hash >> 2) % 28);
    const barW = 90 + ((hash >> 5) % 90);
    return `
      <circle cx="${x1}" cy="${y1}" r="${r1}" fill="rgba(255,255,255,0.08)" />
      <circle cx="${x2}" cy="${y2}" r="${r2}" fill="rgba(255,255,255,0.06)" />
      <path d="M34 ${barY} L${34 + barW} ${barY}" stroke="${accent}" stroke-opacity="0.55" stroke-width="2.5" stroke-linecap="round" />
    `;
  },

  buildGeneratedCoverUrl(book) {
    const palettes = {
      romans: ["#8c3d1f", "#d97706"],
      histoire: ["#4b3f72", "#1f6f8b"],
      sciences: ["#0f766e", "#22c55e"],
      informatique: ["#0f172a", "#2563eb"],
      droit: ["#7c2d12", "#b45309"],
      jeunesse: ["#be185d", "#f97316"],
      arts: ["#7c3aed", "#ec4899"],
      economie: ["#14532d", "#65a30d"],
      "san-bms": ["#115e59", "#14b8a6"],
      "san-sso": ["#1d4ed8", "#38bdf8"],
      "san-ema": ["#9d174d", "#fb7185"],
      "san-sin": ["#166534", "#4ade80"],
      "bav-s2a": ["#365314", "#84cc16"],
      "bav-hse": ["#334155", "#f59e0b"],
      "bav-sha": ["#155e75", "#06b6d4"],
      "gin-pmi": ["#3f3f46", "#f97316"],
      "gin-gel": ["#172554", "#3b82f6"],
      "gif-rtl": ["#111827", "#0ea5e9"],
      "gif-glo": ["#1e1b4b", "#8b5cf6"]
    };

    const [start, end] = palettes[book.categoryKey] || ["#113c6b", "#f28c28"];
    const title = String(book.title || "IMSA IntelliBook");
    const author = String(book.author || "");
    const category = this.categoryLabel(book.categoryKey || "");
    const year = String(book.year || "");
    const accent = "#f6e7cb";

    const escapeXml = (value) => String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");

    const wrapTitle = (value, maxCharsPerLine = 18, maxLines = 4) => {
      const words = String(value || "").split(/\s+/).filter(Boolean);
      const lines = [];
      let current = "";

      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length <= maxCharsPerLine || !current) current = next;
        else {
          lines.push(current);
          current = word;
        }
        if (lines.length === maxLines) break;
      }

      if (current && lines.length < maxLines) lines.push(current);
      if (words.join(" ").length > lines.join(" ").length && lines.length) {
        lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.]{3}$/, "")}...`;
      }
      return lines;
    };

    const titleLines = wrapTitle(title, 18, 4);
    const coverStyle = this.generatedCoverStyle(book.categoryKey);
    const theme = this.inferGeneratedTitleTheme(book);
    const titleBlock = titleLines.map((line, index) => `<text x="42" y="${146 + index * 34}" fill="#ffffff" font-size="${index === 0 ? 30 : 28}" font-family="Georgia, serif" font-weight="700">${escapeXml(line)}</text>`).join("");
    const artwork = this.generatedThemeArtwork(theme, accent);
    const uniqueOverlay = this.generatedUniqueOverlay(book, accent);
    const styleMarkup = {
      literary: `
        <rect x="34" y="104" width="232" height="168" rx="14" fill="rgba(12,14,20,0.24)" />
        ${artwork}
        ${titleBlock}
        <rect x="34" y="292" width="160" height="3" rx="2" fill="${accent}" fill-opacity="0.9" />
      `,
      academic: `
        <rect x="34" y="98" width="232" height="182" rx="6" fill="rgba(255,255,255,0.08)" />
        <rect x="34" y="98" width="14" height="182" rx="6" fill="${accent}" fill-opacity="0.85" />
        <line x1="62" y1="132" x2="248" y2="132" stroke="rgba(255,255,255,0.18)" />
        ${artwork}
        ${titleBlock}
        <circle cx="230" cy="316" r="22" fill="rgba(255,255,255,0.1)" />
      `,
      technical: `
        <rect x="34" y="100" width="232" height="176" rx="16" fill="rgba(7,10,18,0.28)" />
        ${artwork}
        <rect x="42" y="110" width="84" height="10" rx="5" fill="${accent}" fill-opacity="0.8" />
        ${titleBlock}
        <rect x="200" y="296" width="54" height="54" rx="10" fill="rgba(255,255,255,0.08)" />
      `,
      vibrant: `
        <rect x="34" y="108" width="232" height="164" rx="26" fill="rgba(12,14,20,0.20)" />
        ${artwork}
        ${titleBlock}
        <path d="M34 286 Q150 244 266 286" fill="none" stroke="${accent}" stroke-width="3" stroke-opacity="0.75" />
      `
    }[coverStyle];

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${start}" />
            <stop offset="100%" stop-color="${end}" />
          </linearGradient>
          <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,0.22)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect width="300" height="400" rx="20" fill="url(#bg)" />
        <rect x="14" y="14" width="272" height="372" rx="18" fill="rgba(14,18,24,0.16)" stroke="rgba(255,255,255,0.24)" />
        <rect x="24" y="24" width="252" height="52" rx="10" fill="rgba(8,10,16,0.28)" />
        <text x="36" y="46" fill="${accent}" font-size="10" font-family="DM Sans, Arial, sans-serif" letter-spacing="2">${escapeXml(theme.eyebrow)}</text>
        <text x="36" y="64" fill="#ffffff" font-size="15" font-family="DM Sans, Arial, sans-serif" font-weight="700">${escapeXml(theme.byline)}</text>
        ${uniqueOverlay}
        ${styleMarkup}
        <text x="36" y="324" fill="#f7f4ee" font-size="18" font-family="DM Sans, Arial, sans-serif" font-weight="700">${escapeXml(author.slice(0, 30))}</text>
        <text x="36" y="350" fill="rgba(255,255,255,0.78)" font-size="12" font-family="DM Sans, Arial, sans-serif" letter-spacing="1.4">${escapeXml(category.slice(0, 18).toUpperCase())} ${escapeXml(year)}</text>
        <rect x="212" y="304" width="46" height="46" rx="8" fill="rgba(255,255,255,0.12)" />
        <path d="M223 317h12c5 0 9 4 9 9v18h-12c-5 0-9-4-9-9v-18Zm21 0h-9v27h9c5 0 9-4 9-9v-9c0-5-4-9-9-9Z" fill="#fff7ed" />
        <path d="M0 300 L300 190 L300 400 L0 400 Z" fill="url(#sheen)" />
      </svg>
    `.replace(/\s+/g, " ").trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  },

  renderBookCoverContainerHTML(book) {
    const title = this.escapeHtml(book.title || "");
    const author = this.escapeHtml(book.author || "");
    const gradient = this.coverGradientClass(book.categoryKey);
    const generatedCoverUrl = this.buildGeneratedCoverUrl(book);
    const coverUrl = this.resolvePreferredCoverUrl(book) || generatedCoverUrl;
    const imageMarkup = `
      <img
        src="${coverUrl}"
        alt="Couverture de ${title}"
        class="book-cover-img"
        data-fallback-src="${generatedCoverUrl}"
        loading="lazy"
        onload="this.classList.add('loaded')"
        onerror="if (this.dataset.fallbackSrc && this.src !== this.dataset.fallbackSrc) { this.src = this.dataset.fallbackSrc; return; } this.style.display='none'"
      >
    `;

    return `
      <div class="book-cover-container ${gradient}">
        ${imageMarkup}
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
