/* IMSA IntelliBook - Lecteur en ligne (PDF.js + fallback dummy) */
(function () {
  const STORAGE_BOOKMARK_PREFIX = "imsa_bookmark_";
  const STORAGE_PROGRESS_PREFIX = "imsa_progress_";
  const NIGHT_MODE_KEY = "imsa_reader_night";

  function getBookIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  function getSavedJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveBookmark(bookId, pageNum) {
    localStorage.setItem(`${STORAGE_BOOKMARK_PREFIX}${bookId}`, JSON.stringify({ page: pageNum, at: Date.now() }));
  }

  function updateProgress(bookId, pageNum, totalPages) {
    const total = Math.max(1, totalPages);
    const percent = Math.round(((pageNum - 1) / (total - 1 || 1)) * 100);
    const payload = { page: pageNum, percent };
    localStorage.setItem(`${STORAGE_PROGRESS_PREFIX}${bookId}`, JSON.stringify(payload));
    const bar = document.getElementById("readerProgressBar");
    if (bar) bar.style.width = `${percent}%`;
  }

  function toggleNightMode(force) {
    const should =
      typeof force === "boolean"
        ? force
        : !document.body.classList.contains("night-mode");
    document.body.classList.toggle("night-mode", should);
    localStorage.setItem(NIGHT_MODE_KEY, should ? "1" : "0");
  }

  function formatPageIndicator(pageNum, totalPages) {
    const label = `Page ${pageNum} / ${totalPages}`;
    const indicator = document.getElementById("pageIndicator");
    const toolbarText = document.getElementById("toolbarPageText");
    if (indicator) indicator.textContent = label;
    if (toolbarText) toolbarText.textContent = label;
  }

  function setZoom(level) {
    state.zoom = level;
    state.zoomScale = level;
    renderPage(state.currentPage);
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(/\s+/);
    let line = "";
    const lines = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line ? `${line} ${words[n]}` : words[n];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && line) {
        lines.push(line);
        line = words[n];
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    lines.forEach((l, idx) => ctx.fillText(l, x, y + idx * lineHeight));
  }

  async function fetchBookContent(bookId) {
    try {
      // BACKEND: GET /api/books/:id/read
      // return { pdfUrl: "..." }
      // Démo: renvoie null => fallback dummy
      await new Promise((r) => setTimeout(r, 120));
      return { pdfUrl: null };
    } catch (err) {
      console.error(err);
      return { pdfUrl: null };
    }
  }

  function initDummyState(book) {
    state.totalPages = 2;
    state.currentPage = 1;
    state.mode = "dummy";
    state.dummyText = [
      `Ce livre explore ${book.tags?.[0] || "le savoir"} et montre comment la culture gabonaise nourrit les apprentissages.\n\n${book.shortSummary}`,
      `À travers une lecture guidée, vous découvrirez des repères pour comprendre, réfléchir et retenir.\n\n${book.shortSummary}`
    ];
  }

  function setupCanvasSizing() {
    const canvas = document.getElementById("pdfCanvas");
    const viewer = document.getElementById("pdfViewer");
    if (!canvas || !viewer) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.min(820, viewer.clientWidth - 10);
    const h = 900; // taille fixe pour un rendu cohérent
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.floor(w * dpr * state.zoomScale);
    canvas.height = Math.floor(h * dpr * state.zoomScale);
    state.canvasCtx = canvas.getContext("2d");
    if (state.canvasCtx) state.canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function renderDummyPage(pageNum) {
    const canvas = document.getElementById("pdfCanvas");
    if (!canvas) return;
    const ctx = state.canvasCtx || canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const night = document.body.classList.contains("night-mode");
    const bg = night ? "#0F1923" : "#F5F0E8";
    const text = night ? "#E8DCC8" : "#1A3A5C";
    const muted = night ? "rgba(232,220,200,0.78)" : "rgba(26,58,92,0.70)";

    // Fond
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Bandeau
    ctx.fillStyle = night ? "rgba(74,142,194,0.16)" : "rgba(46,109,164,0.14)";
    ctx.fillRect(0, 0, w, Math.floor(140 * state.zoomScale));

    ctx.fillStyle = text;
    ctx.font = `${Math.floor(22 * state.zoomScale)}px "Playfair Display", serif`;
    const title = state.book?.title || "";
    ctx.fillText(title, Math.floor(34 * state.zoomScale), Math.floor(62 * state.zoomScale));

    ctx.fillStyle = muted;
    ctx.font = `${Math.floor(14 * state.zoomScale)}px "DM Sans", sans-serif`;
    ctx.fillText(`Lecture en ligne • IMSA IntelliBook`, Math.floor(34 * state.zoomScale), Math.floor(94 * state.zoomScale));

    // Contenu
    ctx.fillStyle = text;
    ctx.font = `${Math.floor(16 * state.zoomScale)}px "DM Sans", sans-serif`;
    const raw = state.dummyText[pageNum - 1] || "";
    const [p1, p2] = raw.split("\n\n");

    const x = Math.floor(34 * state.zoomScale);
    let y = Math.floor(210 * state.zoomScale);
    const maxWidth = Math.floor(w - 68 * state.zoomScale);

    if (p1) {
      wrapText(ctx, p1, x, y, maxWidth, Math.floor(22 * state.zoomScale));
      // Ajuste y selon lignes estimées
      y += Math.floor(120 * state.zoomScale);
    }
    ctx.fillStyle = night ? "rgba(232,220,200,0.92)" : "rgba(26,58,92,0.92)";
    if (p2) wrapText(ctx, p2, x, y, maxWidth, Math.floor(22 * state.zoomScale));

    // Footer
    ctx.fillStyle = muted;
    ctx.font = `${Math.floor(12 * state.zoomScale)}px "DM Sans", sans-serif`;
    ctx.fillText(`Page ${pageNum} • ${state.book?.author || ""}`, Math.floor(34 * state.zoomScale), Math.floor(h - 34 * state.zoomScale));
  }

  function renderPage(pageNum) {
    const total = state.totalPages || 1;
    const clamped = Math.max(1, Math.min(total, pageNum));
    state.currentPage = clamped;

    if (state.mode === "dummy") {
      setupCanvasSizing();
      renderDummyPage(clamped);
    }

    formatPageIndicator(clamped, total);
    updateProgress(state.bookId, clamped, total);
    // Marque/page list active
    document.querySelectorAll("#pageList button").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.getAttribute("data-page")) === clamped);
    });
  }

  function renderPageList(totalPages) {
    const wrap = document.getElementById("pageList");
    if (!wrap) return;
    wrap.innerHTML = "";
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "list-group-item list-group-item-action";
      btn.setAttribute("data-page", String(p));
      btn.textContent = `Page ${p}`;
      btn.addEventListener("click", () => renderPage(p));
      wrap.appendChild(btn);
    }
    const info = document.getElementById("readerPageCountInfo");
    if (info) info.textContent = `${totalPages} pages`;
  }

  function nextPage() {
    renderPage(state.currentPage + 1);
  }

  function prevPage() {
    renderPage(state.currentPage - 1);
  }

  async function initPDFViewer(bookId) {
    state.bookId = bookId;
    state.book = window.imsaUtils.getBookById(bookId);
    const viewer = document.getElementById("pdfViewer");
    if (viewer) viewer.setAttribute("data-book-id", bookId);

    if (coverContainer) {
      coverContainer.innerHTML = window.imsaUtils.renderBookCoverContainerHTML(state.book);
    }
    if (title) title.textContent = state.book?.title || "";
    if (author) author.textContent = state.book?.author || "";
    if (backLink) backLink.href = `livre.html?id=${encodeURIComponent(bookId)}`;

    // Avatar lecteur
    const avatar = document.getElementById("readerUserAvatar");
    if (avatar) {
      const userRaw = localStorage.getItem("imsa_user");
      if (userRaw) {
        try {
          const u = JSON.parse(userRaw);
          const parts = (u.fullname || u.fullName || u.nom || "").split(/\s+/).filter(Boolean);
          const ini = (parts[0]?.charAt(0) || "I") + (parts[1]?.charAt(0) || "M");
          avatar.textContent = ini.toUpperCase();
        } catch {
          avatar.textContent = "IM";
        }
      } else avatar.textContent = "IM";
    }

    // Night mode persistance
    const savedNight = localStorage.getItem(NIGHT_MODE_KEY) === "1";
    toggleNightMode(savedNight);

    // Chargement contenu (backend)
    const content = await fetchBookContent(bookId);
    if (content && content.pdfUrl) {
      // PDF réel : mode PDF.js
      state.mode = "pdf";
      state.totalPages = 214; // fallback si on ne connaît pas encore
      // On garde le fallback dummy pour ne pas bloquer la maquette.
      initDummyState(state.book);
    } else {
      initDummyState(state.book);
    }

    renderPageList(state.totalPages);

    const bookmark = getSavedJSON(`${STORAGE_BOOKMARK_PREFIX}${bookId}`);
    const progress = getSavedJSON(`${STORAGE_PROGRESS_PREFIX}${bookId}`);
    const desired = bookmark?.page || progress?.page || 1;
    renderPage(desired);
  }

  // --- Init UI / Events ---
  const state = {
    bookId: null,
    book: null,
    mode: "dummy",
    totalPages: 1,
    currentPage: 1,
    zoomScale: 1,
    canvasCtx: null,
    dummyText: []
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const bookId = getBookIdFromUrl();
    if (!bookId) {
      window.imsaToast && window.imsaToast("Livre introuvable (paramètre manquant).", "error");
      return;
    }

    await initPDFViewer(bookId);

    // Nav boutons
    document.getElementById("prevPageBtn")?.addEventListener("click", prevPage);
    document.getElementById("nextPageBtn")?.addEventListener("click", nextPage);
    document.getElementById("toolbarPrevBtn")?.addEventListener("click", prevPage);
    document.getElementById("toolbarNextBtn")?.addEventListener("click", nextPage);

    // Zoom
    document.querySelectorAll("[data-action='zoom']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const z = Number(btn.getAttribute("data-zoom") || 1);
        setZoom(z);
      });
    });

    // Mode nuit (double entrée)
    const nightBtns = [document.getElementById("nightModeBtn"), document.getElementById("toolbarNightBtn")].filter(Boolean);
    nightBtns.forEach((b) => b.addEventListener("click", () => toggleNightMode()));

    // Bookmark
    document.getElementById("bookmarkBtn")?.addEventListener("click", async () => {
      saveBookmark(state.bookId, state.currentPage);
      window.imsaToast && window.imsaToast(`Marque-page enregistré : page ${state.currentPage}.`, "success");
    });

    // Télécharger
    document.getElementById("downloadBtn")?.addEventListener("click", async () => {
      // BACKEND: GET /api/books/:id/download stub
      window.imsaToast && window.imsaToast("Téléchargement (démo) prêt pour backend.", "info");
    });

    // Reflow / resize: recalcul canvas
    window.addEventListener("resize", () => {
      renderPage(state.currentPage);
    }, { passive: true });
  });
})();

