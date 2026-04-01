/* IMSA IntelliBook - Fiche détaillée d'un livre */
(function () {
  const GABON_USERS = [
    { name: "Olive Magnanga", city: "Libreville" },
    { name: "Jean-Baptiste Moussavou", city: "Libreville" },
    { name: "Christelle Ondo", city: "Franceville" },
    { name: "Pierre-André Nzamba", city: "Port-Gentil" },
    { name: "Aminata Koumba", city: "Libreville" },
    { name: "Rodrigue Bouanga", city: "Oyem" },
    { name: "Laure-Ines Obiang", city: "Libreville" },
    { name: "Donatien Mboumba", city: "Mouila" },
    { name: "Sylvie Nkoghe", city: "Libreville" },
    { name: "Éric Bekale", city: "Port-Gentil" }
  ];

  function getBookIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  function escape(str) {
    return window.imsaUtils.escapeHtml(str);
  }

  function hashStr(s) {
    let h = 0;
    const str = String(s || "");
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function formatISO(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function generateMeta(book) {
    const h = hashStr(book.id);
    const isbn = `978-${(h % 9999_9999).toString().padStart(9, "0")}-${(h % 97).toString().padStart(2, "0")}`;
    const editor = (book.publisher || book.editor || book.editeur || "").toString().trim();
    const langue = book.language || "Français";
    const pages = 180 + (h % 520);
    const year = book.year;
    const format = "PDF";
    return { isbn, editor, langue, pages, year, format };
  }

  function starsHTML(rating) {
    return window.imsaUtils.formatStars(rating);
  }

  function computeRatingBreakdown(avg) {
    const r = Number(avg || 0);
    let dist = null;
    if (r >= 4.7) dist = { "5": 60, "4": 25, "3": 10, "2": 4, "1": 1 };
    else if (r >= 4.4) dist = { "5": 45, "4": 30, "3": 15, "2": 8, "1": 2 };
    else if (r >= 4.0) dist = { "5": 30, "4": 35, "3": 20, "2": 10, "1": 5 };
    else if (r >= 3.6) dist = { "5": 20, "4": 30, "3": 25, "2": 15, "1": 10 };
    else dist = { "5": 10, "4": 25, "3": 25, "2": 20, "1": 20 };
    return dist;
  }

  function generateSampleReviews(book) {
    const h = hashStr(book.id);
    const list = [];
    for (let i = 0; i < 4; i++) {
      const u = GABON_USERS[(h + i * 3) % GABON_USERS.length];
      const stars = Math.max(1, Math.min(5, Math.round(book.rating - 0.8 + (i % 3) * 0.6)));
      const comments = [
        "Lecture fluide et vraiment inspirante. Les idées sont ancrées dans notre réalité gabonaise.",
        "On sent le travail de recherche et la volonté d’expliquer clairement. Très utile pour les cours et la réflexion.",
        "Une approche moderne qui valorise le patrimoine. J’ai apprécié les exemples et le ton respectueux.",
        "Excellent équilibre entre culture, analyse et plaisir de lire. Je recommande à tout lecteur curieux."
      ];
      list.push({
        id: `rev-${book.id}-${i}`,
        userName: u.name,
        city: u.city,
        date: formatISO(addDays(new Date(), -(h % 220) - i * 11)),
        stars,
        text: comments[(h + i) % comments.length]
      });
    }
    return list;
  }

  function generateLongSummary(book) {
    const topic = window.imsaUtils.categoryLabel(book.categoryKey);
    const a = book.author;
    const s = book.shortSummary;
    const paras = [
      `Plonger dans « ${book.title} » revient à traverser ${topic} avec un regard attentif. ${s}`,
      `L’ouvrage met en avant ${topic.toLowerCase()} à travers des scènes, des analyses et des repères qui parlent au lecteur d’Afrique centrale. En suivant ${a}, vous découvrez des clés pour mieux comprendre et mémoriser.`,
      `Au fil des pages, le récit ou l’étude propose des questions simples et puissantes. Pourquoi ces choix existent-ils ? Quelles traces laissent-ils ? Et comment les relier à votre quotidien ?`,
      `Enfin, « ${book.title} » donne envie de continuer : discuter, comparer, transmettre. C’est une lecture pensée pour accompagner la culture gabonaise et ouvrir vers l’horizon africain.`,
      `Pour aller plus loin, des thèmes comme la mémoire, l’éthique et le développement durable se répondent en écho. Une invitation à lire avec curiosité et esprit critique.`
    ];
    return paras.slice(0, 5);
  }

const API = 'http://localhost:5000/api';
const API_ORIGIN = API.replace(/\/api\/?$/, '');

function resolveBookFileUrl(book) {
  const raw = book?.file_url || book?.preview_url || null;
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${API_ORIGIN}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

function getToken() {
  return localStorage.getItem('imsa_access_token');
}

function isLoggedIn() {
  return !!localStorage.getItem("imsa_user");
}

async function borrowBook(bookId) {
  if (!isLoggedIn()) {
    showToast('Connectez-vous pour emprunter un livre.', 'warning');
    setTimeout(() => window.location.href = 'inscription.html', 1500);
    return { ok: false };
  }

  try {
    const res = await fetch(`${API}/borrows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ book_id: bookId })
    });

    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      return { ok: true, data: data.data };
    } else {
      showToast(data.message, 'danger');
      return { ok: false };
    }
  } catch (err) {
    showToast('Erreur de connexion au serveur.', 'danger');
    return { ok: false };
  }
}

function showToast(message, type = 'success') {
  const existing = document.getElementById('liveToast');
  if (existing) existing.remove();

  const colors = {
    success: '#198754',
    danger:  '#dc3545',
    warning: '#ffc107',
    info:    '#0dcaf0'
  };

  document.body.insertAdjacentHTML('beforeend', `
    <div id="liveToast" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index:9999">
      <div class="toast show align-items-center text-white border-0"
           style="background:${colors[type] || colors.success}">
        <div class="d-flex">
          <div class="toast-body fw-semibold">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto"
                  onclick="this.closest('#liveToast').remove()"></button>
        </div>
      </div>
    </div>
  `);

  setTimeout(() => {
    const t = document.getElementById('liveToast');
    if (t) t.remove();
  }, 4000);
}

  async function submitReview(bookId, data) {
    // BACKEND: POST /api/books/:id/reviews
    await new Promise((r) => setTimeout(r, 80));
    return { ok: true };
  }

  async function toggleFavorite(bookId) {
    // BACKEND: POST/DELETE /api/favorites
    await new Promise((r) => setTimeout(r, 60));
    return { ok: true };
  }

  function getUserFavorites() {
    const raw = localStorage.getItem("imsa_user_favorites");
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function setUserFavorites(ids) {
    localStorage.setItem("imsa_user_favorites", JSON.stringify(ids));
  }

  function loadReviews(book) {
    const key = `imsa_reviews_${book.id}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch { }
    }
    return generateSampleReviews(book);
  }

  function renderStarsAverage(book, reviews) {
    const avg = book.rating || 4.5;
    document.getElementById("ratingSummaryAvg").textContent = avg.toFixed(1);
    document.getElementById("ratingSummaryText").textContent = `${reviews.length} avis • note moyenne`;
    document.getElementById("reviewsCount").textContent = `(${reviews.length} avis)`;
    document.getElementById("averageStars").innerHTML = starsHTML(avg);
  }

  function renderBreakdown(reviews) {
    const dist = computeRatingBreakdown(window.imsaUtils.getBookById(getBookIdFromUrl())?.rating || 4.3);
    const wrap = document.getElementById("ratingBreakdown");
    const keys = [5, 4, 3, 2, 1];
    if (!wrap) return;
    wrap.innerHTML = keys
      .map((k) => {
        const pct = dist[String(k)] || 0;
        return `
          <div class="d-flex align-items-center gap-2">
            <div class="small text-muted" style="width:38px;">${k}★</div>
            <div class="bar flex-grow-1" aria-label="Répartition ${k} étoiles">
              <span style="width:${pct}%;"></span>
            </div>
            <div class="small text-muted" style="width:46px;text-align:right;">${pct}%</div>
          </div>
        `;
      })
      .join("");
  }

  function renderReviews(reviews) {
    const grid = document.getElementById("reviewsGrid");
    const meta = document.getElementById("reviewsMeta");
    if (meta) meta.textContent = `${reviews.length} avis vérifiés (démo)`;
    if (!grid) return;
    grid.innerHTML = "";

    reviews.slice(0, 4).forEach((r) => {
      const col = document.createElement("div");
      col.className = "col-12";
      col.innerHTML = `
        <div class="card testi-card p-4 h-100">
          <div class="d-flex align-items-center justify-content-between gap-3">
            <div class="d-flex align-items-center gap-2">
              <div class="testi-avatar" style="width:42px;height:42px;">${escape(r.userName.split(" ").slice(0, 2).map((x) => x.charAt(0)).join("")).toUpperCase()}</div>
              <div>
                <div class="fw-bold">${escape(r.userName)}</div>
                <div class="text-muted small">${escape(r.city)} • ${escape(r.date)}</div>
              </div>
            </div>
            <div class="text-orange">${starsHTML(r.stars)}</div>
          </div>
          <p class="mb-0 text-muted mt-3">${escape(r.text)}</p>
        </div>
      `;
      grid.appendChild(col);
    });
  }

  function setReviewFormVisibility() {
    const collapseEl = document.getElementById("reviewFormCollapse");
    const hint = document.getElementById("reviewLoginHint");
    const btn = document.querySelector('[data-bs-target="#reviewFormCollapse"]');
    if (!collapseEl) return;
    const logged = isLoggedIn();
    if (!logged) {
      if (btn) btn.setAttribute("disabled", "disabled");
      if (hint) hint.style.display = "block";
      return;
    }
    if (btn) btn.removeAttribute("disabled");
    if (hint) hint.style.display = "none";
  }

  function renderRelatedBooks(book) {
    const row = document.getElementById("relatedRow");
    if (!row) return;
    
    // Utiliser les livres similaires du backend s'ils existent
    let picks = book.similar_books || [];
    
    // Sinon fallback sur imsaUtils (nécessite d'avoir chargé les autres livres)
    if (picks.length === 0) {
      const all = window.imsaUtils.getAllBooks();
      const same = all.filter((b) => b.categoryKey === book.categoryKey && b.id !== book.id);
      picks = same.slice(0, 6);
    }

    row.innerHTML = "";
    picks.forEach((b) => {
      // Normalisation pour renderBookCardHTML
      const normalized = {
        ...b,
        categoryKey: b.categoryKey || book.categoryKey,
        rating: b.average_rating || b.rating || 0
      };

      const wrap = document.createElement("div");
      wrap.style.minWidth = "260px";
      wrap.innerHTML = window.imsaUtils.renderBookCardHTML(normalized, {
        variant: "compact",
        showNewBadge: false,
        showBorrowButton: false,
        showCategoryChip: true,
        linkReadMore: true
      });
      row.appendChild(wrap);
    });

    if (typeof window.imsaInitBookCovers === "function") window.imsaInitBookCovers();
    if (typeof window.imsaLoadAllCovers === "function") window.imsaLoadAllCovers();
    if (typeof window.imsaLoadAllBookCovers === "function") window.imsaLoadAllBookCovers();
  }

  function setButtonsState(book) {
    const favs = getUserFavorites();
    const isFav = favs.includes(book.id);
    const btn = document.getElementById("favoriteBtn");
    if (btn) {
      btn.setAttribute("data-book-id", book.id);
      if (isFav) {
        btn.classList.remove("btn-orange-outline");
        btn.classList.add("btn-orange");
      } else {
        btn.classList.add("btn-orange-outline");
        btn.classList.remove("btn-orange");
      }
    }

    const borrowBtn = document.getElementById("borrowBtn");
    if (borrowBtn) borrowBtn.setAttribute("data-book-id", book.id);

    const readBtn = document.getElementById("readOnlineBtn");
    if (readBtn) {
      const fileUrl = resolveBookFileUrl(book);
      readBtn.href = fileUrl || `lire.html?id=${encodeURIComponent(book.id)}`;
      if (fileUrl) {
        readBtn.setAttribute("target", "_blank");
        readBtn.setAttribute("rel", "noopener noreferrer");
      } else {
        readBtn.removeAttribute("target");
        readBtn.removeAttribute("rel");
      }
    }

    document.getElementById("shareBtn")?.setAttribute("data-book-id", book.id);
  }

  function renderBookDetail(book) {
    document.getElementById("bookTitle").textContent = book.title;
    document.getElementById("authorLink").textContent = book.author;
    document.getElementById("authorLink").href = `recherche.html?author=${encodeURIComponent(book.author)}`;

    const coverWrap = document.getElementById("bookCoverContainer");
    if (coverWrap) {
      const temp = document.createElement("div");
      temp.innerHTML = window.imsaUtils.renderBookCoverContainerHTML(book).trim();
      const renderedCover = temp.firstElementChild;
      if (renderedCover) {
        renderedCover.id = "bookCoverContainer";
        renderedCover.style.maxWidth = "280px";
        renderedCover.style.margin = "0 auto";
        renderedCover.style.borderRadius = "14px";
        renderedCover.style.boxShadow = "0 16px 48px rgba(0,0,0,0.30)";
        coverWrap.replaceWith(renderedCover);
      }
    }

    // Breadcrumb current
    const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = book.title;

    const catLabel = window.imsaUtils.categoryLabel(book.categoryKey);
    document.getElementById("categoryBadge").textContent = catLabel;
    document.getElementById("categoryBadge").className = `badge badge-category ${window.imsaUtils.categoryBadgeClass(book.categoryKey)}`;
    document.getElementById("categoryYear").textContent = `${book.year}`;

    // Availability
    const badge = document.getElementById("availabilityBadge");
    const count = document.getElementById("availableCountText");
    if (badge) {
      const available = (book.available_count !== undefined) ? (Number(book.available_count) > 0) : (Number(book.availableCount) > 0);
      badge.classList.toggle("text-bg-success", available);
      badge.classList.toggle("text-bg-danger", !available);
      badge.textContent = available ? "DISPONIBLE" : "INDISPONIBLE";
    }
    if (count) count.textContent = `${book.available_count || book.availableCount || 0} exemplaires disponibles`;

    // Meta card
    const meta = generateMeta(book);
    document.getElementById("metaISBN").textContent = book.isbn || meta.isbn;
    document.getElementById("metaEditor").textContent = meta.editor || "Éditeur non renseigné";
    document.getElementById("metaLang").textContent = book.language || meta.langue;
    document.getElementById("metaPages").textContent = String(book.page_count || book.pages || meta.pages);
    document.getElementById("metaYear").textContent = String(book.year || meta.year);
    document.getElementById("metaFormat").textContent = meta.format;

    // Summary & tags
    const longSummary = document.getElementById("longSummary");
    if (longSummary) {
      const summaryText = book.description || book.summary || book.shortSummary;
      if (summaryText && summaryText.length > 200) {
        longSummary.innerHTML = `<p class="mb-3">${escape(summaryText)}</p>`;
      } else {
        const paras = generateLongSummary(book);
        longSummary.innerHTML = paras.map((p) => `<p class="mb-3">${escape(p)}</p>`).join("");
      }
    }
    const tags = document.getElementById("tagsWrap");
    if (tags) {
      const bookTags = book.tags || [];
      tags.innerHTML = bookTags.slice(0, 8).map((t) => {
        return `<a href="recherche.html?tag=${encodeURIComponent(t)}" class="tag-chip">${escape(t)}</a>`;
      }).join("");
    }

    // Reviews
    const reviews = (book.reviews && book.reviews.length) ? book.reviews : loadReviews(book);
    renderStarsAverage(book, reviews);
    renderBreakdown(reviews);
    renderReviews(reviews);
    document.getElementById("reviewsTitle").textContent = `Avis des lecteurs (${reviews.length})`;

    // Related books
    renderRelatedBooks(book);
  }

  function initReviewForm(book) {
    setReviewFormVisibility();
    const form = document.getElementById("submitReviewForm");
    const starsPicker = document.getElementById("reviewStarsPicker");
    const hidden = document.getElementById("reviewSelectedStar");
    if (!form || !starsPicker || !hidden) return;

    starsPicker.querySelectorAll("[data-star]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = btn.getAttribute("data-star");
        hidden.value = s;
        starsPicker.querySelectorAll("[data-star]").forEach((b) => b.classList.remove("btn-orange", "btn-blue-dark"));
        btn.classList.add("btn-orange");
      });
    });
    if (window.imsaUtils) {
      starsPicker.querySelectorAll("[data-star]").forEach((btn) => {
        const val = Number(btn.getAttribute("data-star"));
        if (String(hidden.value) === String(val)) btn.classList.add("btn-orange");
      });
    }

    const reviewText = document.getElementById("reviewText");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rating = Number(hidden.value || 5);
      const text = (reviewText?.value || "").trim();
      if (!text || text.length < 5) {
        window.imsaToast && window.imsaToast("Veuillez écrire un commentaire plus détaillé.", "error");
        return;
      }
      await submitReview(book.id, { rating, text });
      const key = `imsa_reviews_${book.id}`;
      const current = loadReviews(book);
      current.unshift({
        id: `rev-${book.id}-new-${Date.now()}`,
        userName: (JSON.parse(localStorage.getItem("imsa_user") || "{}")?.fullname || "Lecteur").toString(),
        city: (JSON.parse(localStorage.getItem("imsa_user") || "{}")?.city || "Libreville").toString(),
        date: formatISO(new Date()),
        stars: rating,
        text
      });
      localStorage.setItem(key, JSON.stringify(current));
      window.imsaToast && window.imsaToast("Merci pour votre avis !", "success");
      window.location.reload();
    });
  }

  function initToolbarActions(book) {
    // Borrow modal
    const borrowBtn = document.getElementById("borrowBtn");
    const modalEl = document.getElementById("borrowConfirmModal");
    const modalBody = document.getElementById("borrowModalBody");
    const confirmBtn = document.getElementById("confirmBorrowBtn");

    let dueDate = null;

    if (borrowBtn && modalEl && modalBody && confirmBtn) {
      const modal = new bootstrap.Modal(modalEl);
      borrowBtn.addEventListener("click", () => {
        const today = new Date();
        dueDate = addDays(today, 14);
        const modalCoverUrl = window.imsaUtils?.resolvePreferredCoverUrl
          ? window.imsaUtils.resolvePreferredCoverUrl(book)
          : (book.coverUrl || book.cover_url || "");
        modalBody.innerHTML = `
          <div class="d-flex gap-3 align-items-start">
              <img src="${modalCoverUrl}" alt="Couverture" class="admin-mini-thumb" style="width:64px;height:84px;object-fit:cover;" loading="lazy" onerror="this.style.display='none'"/>
            <div>
              <div class="fw-bold">${escape(book.title)}</div>
              <div class="text-muted small mt-1">Durée du prêt : 14 jours</div>
              <div class="text-muted small mt-1">Date de retour : <span class="fw-bold">${escape(formatISO(dueDate))}</span></div>
            </div>
          </div>
        `;
        modal.show();
      });

      confirmBtn.onclick = async () => {
        await borrowBook(book.id);
        // Démo stock local
        const userRaw = localStorage.getItem("imsa_user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const userId = user?.id || user?.email || "usr-demo";
        const borrows = JSON.parse(localStorage.getItem("imsa_borrows") || "[]");
        borrows.unshift({
          id: `borrow-${book.id}-${Date.now()}`,
          bookId: book.id,
          userId,
          dueDate: formatISO(dueDate || addDays(new Date(), 14))
        });
        localStorage.setItem("imsa_borrows", JSON.stringify(borrows));
        modal.hide();
        window.imsaToast && window.imsaToast(`📚 Emprunt confirmé ! Retour avant le ${escape(formatISO(dueDate))}`, "success");
      };
    }

    // Favorite
    const favoriteBtn = document.getElementById("favoriteBtn");
    if (favoriteBtn) {
      favoriteBtn.addEventListener("click", async () => {
        const favs = getUserFavorites();
        const idx = favs.indexOf(book.id);
        if (idx >= 0) favs.splice(idx, 1);
        else favs.push(book.id);
        await toggleFavorite(book.id);
        setUserFavorites(favs);
        window.imsaToast && window.imsaToast("Favoris mis à jour.", "success");
        setButtonsState(book);
      });
    }

    // Share
    const shareBtn = document.querySelector('[data-action="share"]');
    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        const url = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(book.id)}`;
        const text = `Découvrez « ${book.title} » sur IMSA IntelliBook`;
        try {
          if (navigator.share) {
            await navigator.share({ title: book.title, text, url });
            window.imsaToast && window.imsaToast("Lien partagé.", "success");
          } else {
            await navigator.clipboard.writeText(url);
            window.imsaToast && window.imsaToast("Lien copié dans le presse-papiers.", "success");
          }
        } catch {
          window.imsaToast && window.imsaToast("Impossible de partager (démo).", "error");
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const bookId = getBookIdFromUrl();
    if (!bookId) {
      window.imsaToast && window.imsaToast("Livre introuvable.", "error");
      return;
    }

    // Charger le livre via l'API
    let book = null;
    if (window.imsaApi) {
      book = await window.imsaApi.fetchBookById(bookId);
    }
    
    // Fallback if API fails or not yet loaded properly
    if (!book && window.imsaUtils) {
      book = window.imsaUtils.getBookById(bookId);
    }

    if (!book) {
      window.imsaToast && window.imsaToast("Livre introuvable au catalogue.", "error");
      return;
    }

    renderBookDetail(book);
    setButtonsState(book);
    initReviewForm(book);
    initToolbarActions(book);
  });
})();

