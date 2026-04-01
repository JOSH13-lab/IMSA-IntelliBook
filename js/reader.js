/* IMSA IntelliBook - Lecteur en Ligne */
(function () {
  const API = "http://localhost:5000/api";
  const API_ORIGIN = API.replace(/\/api\/?$/, "");
  const state = {
    book: null,
    currentPage: 1,
    totalPages: 1,
    zoom: 1
  };

  function token() {
    return localStorage.getItem("imsa_access_token");
  }

  function authHeaders() {
    return {
      Authorization: `Bearer ${token()}`
    };
  }

  function getBookId() {
    return new URLSearchParams(window.location.search).get("id");
  }

  function absoluteFileUrl(url) {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  function pageIndicatorText() {
    return `Page ${state.currentPage} / ${state.totalPages}`;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function updateIndicators() {
    setText("pageIndicator", pageIndicatorText());
    setText("toolbarPageText", pageIndicatorText());
    setText("readerPageCountInfo", `${state.totalPages} pages`);
    const bar = document.getElementById("readerProgressBar");
    if (bar) {
      const percent = Math.max(0, Math.min(100, Math.round((state.currentPage / Math.max(1, state.totalPages)) * 100)));
      bar.style.width = `${percent}%`;
    }
    renderPageList();
  }

  function renderPageList() {
    const list = document.getElementById("pageList");
    if (!list) return;
    list.innerHTML = Array.from({ length: state.totalPages }, (_, index) => {
      const page = index + 1;
      return `
        <button type="button" class="list-group-item list-group-item-action ${page === state.currentPage ? "active" : ""}" data-page-jump="${page}">
          Page ${page}
        </button>
      `;
    }).join("");
  }

  function renderBookInfo(book) {
    setText("readerBookTitle", book.title || "Livre");
    setText("readerBookAuthor", book.author || "");
    setText("readerBookCoverFallbackTitle", book.title || "Livre");
    setText("readerBookCoverFallbackAuthor", book.author || "");
    document.title = `${book.title} - Lecture`;

    const cover = document.getElementById("readerBookCoverImg");
    const coverUrl = window.imsaUtils?.resolvePreferredCoverUrl
      ? window.imsaUtils.resolvePreferredCoverUrl(book)
      : book.cover_url;
    if (cover && coverUrl) {
      cover.src = coverUrl;
      cover.alt = book.title || "Couverture";
    }

    const backLink = document.getElementById("backToBookLink");
    if (backLink) backLink.href = `livre.html?id=${encodeURIComponent(book.legacy_id || book.id)}`;
  }

  function showMessage(html) {
    const viewer = document.getElementById("pdfViewer");
    if (!viewer) return;
    viewer.innerHTML = `<div class="alert alert-warning">${html}</div>`;
  }

  async function saveProgress() {
    if (!state.book || !token()) return;
    const percent = Math.round((state.currentPage / Math.max(1, state.totalPages)) * 100);
    try {
      await fetch(`${API}/reading-progress`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          book_id: state.book.legacy_id || state.book.id,
          current_page: state.currentPage,
          total_pages: state.totalPages,
          percent,
          bookmark_page: state.currentPage
        })
      });
    } catch {}
  }

  function renderDemoReader() {
    const viewer = document.getElementById("pdfViewer");
    if (!viewer) return;
    state.totalPages = 12;
    viewer.innerHTML = `
      <div class="p-4 mx-auto" style="max-width:780px;line-height:1.9;">
        <h2>${state.book.title}</h2>
        <p class="text-muted">${state.book.author || ""}</p>
        <p>Le PDF de ce livre n'est pas encore disponible. Ajoutez un <code>file_url</code> valide au livre pour ouvrir le document complet ici.</p>
      </div>
    `;
    updateIndicators();
  }

  async function renderPdfPage(pdf, pageNumber) {
    const page = await pdf.getPage(pageNumber);
    const canvas = document.getElementById("pdfCanvas");
    if (!canvas) return;
    const viewport = page.getViewport({ scale: 1.3 * state.zoom });
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    state.currentPage = pageNumber;
    updateIndicators();
    saveProgress();
  }

  async function initPdfReader(url) {
    if (typeof pdfjsLib === "undefined") {
      renderDemoReader();
      return;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    try {
      const pdf = await pdfjsLib.getDocument(url).promise;
      state.totalPages = pdf.numPages || 1;
      updateIndicators();
      await renderPdfPage(pdf, Math.min(state.currentPage, state.totalPages));

      document.getElementById("prevPageBtn")?.addEventListener("click", () => {
        if (state.currentPage > 1) renderPdfPage(pdf, state.currentPage - 1);
      });
      document.getElementById("nextPageBtn")?.addEventListener("click", () => {
        if (state.currentPage < state.totalPages) renderPdfPage(pdf, state.currentPage + 1);
      });
      document.getElementById("toolbarPrevBtn")?.addEventListener("click", () => {
        if (state.currentPage > 1) renderPdfPage(pdf, state.currentPage - 1);
      });
      document.getElementById("toolbarNextBtn")?.addEventListener("click", () => {
        if (state.currentPage < state.totalPages) renderPdfPage(pdf, state.currentPage + 1);
      });
      document.body.addEventListener("click", (e) => {
        const jump = e.target.closest("[data-page-jump]");
        if (jump) renderPdfPage(pdf, Number(jump.dataset.pageJump));
        const zoomBtn = e.target.closest("[data-action='zoom']");
        if (zoomBtn) {
          state.zoom = Number(zoomBtn.dataset.zoom || 1);
          renderPdfPage(pdf, state.currentPage);
        }
      });
    } catch {
      renderDemoReader();
    }
  }

  function wireStaticActions() {
    document.getElementById("nightModeBtn")?.addEventListener("click", () => document.body.classList.toggle("night-mode"));
    document.getElementById("toolbarNightBtn")?.addEventListener("click", () => document.body.classList.toggle("night-mode"));
    document.getElementById("bookmarkBtn")?.addEventListener("click", saveProgress);
    document.getElementById("downloadBtn")?.addEventListener("click", () => {
      const fileUrl = absoluteFileUrl(state.book?.file_url || state.book?.preview_url);
      if (!fileUrl) {
        showMessage("Aucun PDF disponible pour ce livre.");
        return;
      }
      window.open(fileUrl, "_blank", "noopener");
    });
  }

  async function loadBook() {
    const bookId = getBookId();
    if (!bookId) {
      showMessage("Aucun livre sélectionné.");
      return;
    }
    if (!token()) {
      showMessage(`Connectez-vous pour lire ce livre. <a href="inscription.html">Connexion</a>`);
      return;
    }

    const res = await fetch(`${API}/books/${bookId}/read`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) {
      if (data.must_borrow) {
        showMessage(`Vous devez d'abord emprunter ce livre. <a href="livre.html?id=${encodeURIComponent(data.book_id || bookId)}">Retour à la fiche</a>`);
        return;
      }
      showMessage(data.message || "Lecture impossible.");
      return;
    }

    state.book = data.data;
    state.currentPage = Math.max(1, Number(data.data.progress?.current_page || 1));
    renderBookInfo(state.book);
    const fileUrl = absoluteFileUrl(state.book.file_url || state.book.preview_url);
    if (fileUrl) {
      await initPdfReader(fileUrl);
    } else {
      renderDemoReader();
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    wireStaticActions();
    await loadBook();
  });
})();
