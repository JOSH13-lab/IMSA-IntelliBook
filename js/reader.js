/* IMSA IntelliBook - Lecteur en Ligne */

const API = 'http://localhost:5000/api';

function getToken()   { return localStorage.getItem('imsa_access_token'); }
function isLoggedIn() { return !!getToken(); }
function getBookId()  { return new URLSearchParams(window.location.search).get('id'); }

let currentPage  = 1;
let totalPages   = 1;
let bookData     = null;
let saveInterval = null;

// ── Initialisation ──
document.addEventListener('DOMContentLoaded', async () => {
  const bookId = getBookId();
  if (!bookId) {
    showMessage('Aucun livre sélectionné.', 'danger');
    return;
  }

  if (!isLoggedIn()) {
    showMessage(
      'Connectez-vous pour lire ce livre. ' +
      '<a href="inscription.html" class="btn btn-primary btn-sm ms-2">Se connecter</a>',
      'warning'
    );
    return;
  }

  await loadBook(bookId);
});

// ── Charger le livre ──
async function loadBook(bookId) {
  try {
    showLoader(true);

    const res = await fetch(`${API}/books/${bookId}/read`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    const data = await res.json();

    if (!data.success) {
      if (data.must_borrow) {
        showMessage(
          `Vous devez d'abord emprunter ce livre pour le lire. ` +
          `<a href="livre.html?id=${data.book_id}" class="btn btn-warning btn-sm ms-2">` +
          `Emprunter</a>`,
          'warning'
        );
      } else {
        showMessage(data.message, 'danger');
      }
      showLoader(false);
      return;
    }

    bookData = data.data;

    // Afficher les infos du livre
    updateBookInfo(bookData);

    // Restaurer la progression
    if (bookData.progress && bookData.progress.current_page > 1) {
      currentPage = bookData.progress.current_page;
    }

    // Initialiser le lecteur
    if (bookData.file_url) {
      initPDFReader(bookData.file_url);
    } else {
      initDemoReader(bookData);
    }

    // Sauvegarder toutes les 30 secondes
    saveInterval = setInterval(() => saveProgress(), 30000);

    showLoader(false);
  } catch (err) {
    showMessage('Erreur de connexion au serveur.', 'danger');
    showLoader(false);
  }
}

// ── Afficher les infos du livre ──
function updateBookInfo(book) {
  const titleEl = document.getElementById('bookTitle');
  const authorEl = document.getElementById('bookAuthor');
  const coverEl = document.getElementById('bookCoverSidebar');

  if (titleEl)  titleEl.textContent  = book.title;
  if (authorEl) authorEl.textContent = book.author;
  if (coverEl && book.cover_url) {
    coverEl.src = book.cover_url;
    coverEl.alt = book.title;
  }
  document.title = `${book.title} — IMSA IntelliBook`;
}

// ── Lecteur PDF avec PDF.js ──
function initPDFReader(pdfUrl) {
  if (typeof pdfjsLib === 'undefined') {
    initDemoReader(bookData);
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
    totalPages = pdf.numPages;
    updatePageInfo();
    renderPDFPage(pdf, currentPage);

    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderPDFPage(pdf, currentPage); }
    });

    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderPDFPage(pdf, currentPage); }
    });
  }).catch(() => initDemoReader(bookData));
}

function renderPDFPage(pdf, pageNum) {
  pdf.getPage(pageNum).then(page => {
    const canvas  = document.getElementById('pdfCanvas');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: 1.4 });
    canvas.height = viewport.height;
    canvas.width  = viewport.width;
    page.render({ canvasContext: context, viewport });
    updatePageInfo();
    updateProgressBar();
    saveProgress();
  });
}

// ── Lecteur demo (sans PDF) ──
function initDemoReader(book) {
  const content = document.getElementById('readerContent');
  if (!content) return;

  totalPages = 20;

  content.innerHTML = `
    <div class="reader-demo p-4" style="max-width:780px;margin:0 auto;font-family:'Georgia',serif;line-height:1.9;font-size:1.05rem;">
      <h2 style="font-family:'Playfair Display',serif;color:#1A3A5C;margin-bottom:1.5rem;">
        ${book.title}
      </h2>
      <p style="color:#6B7280;font-style:italic;margin-bottom:2rem;">
        ${book.author}
      </p>
      <div id="pageContent"></div>
    </div>
  `;

  renderDemoPage(currentPage, book);

  document.getElementById('prevPageBtn')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderDemoPage(currentPage, book);
      updatePageInfo();
      updateProgressBar();
      saveProgress();
    }
  });

  document.getElementById('nextPageBtn')?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderDemoPage(currentPage, book);
      updatePageInfo();
      updateProgressBar();
      saveProgress();
    }
  });

  updatePageInfo();
  updateProgressBar();
}

function renderDemoPage(page, book) {
  const el = document.getElementById('pageContent');
  if (!el) return;
  el.innerHTML = `
    <p style="text-indent:2em;">
      Vous lisez actuellement <strong>${book.title}</strong> de <em>${book.author}</em>.
      Page ${page} sur ${totalPages}. Ce contenu de démonstration représente
      l'aperçu du livre. Pour accéder au contenu complet en PDF,
      le fichier doit être uploadé par l'administrateur via le dashboard.
    </p>
    <p style="text-indent:2em;margin-top:1.5rem;">
      Ce livre fait partie du catalogue IMSA IntelliBook, la bibliothèque
      numérique officielle de l'Institut Multimédia et Sciences Appliquées
      de Libreville, Gabon. Retrouvez des milliers d'ouvrages africains
      et gabonais disponibles gratuitement pour les étudiants de l'IMSA.
    </p>
    <p style="text-indent:2em;margin-top:1.5rem;color:#9CA3AF;font-style:italic;">
      — Page ${page} / ${totalPages} —
    </p>
  `;
}

// ── Sauvegarder la progression ──
async function saveProgress() {
  if (!bookData || !isLoggedIn()) return;
  const percent = Math.round((currentPage / totalPages) * 100);
  try {
    await fetch(`${API}/reading-progress`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        book_id:     bookData.legacy_id || bookData.id,
        current_page: currentPage,
        total_pages:  totalPages,
        percent
      })
    });
  } catch(e) {}
}

// ── Marque-page ──
document.getElementById('bookmarkBtn')?.addEventListener('click', async () => {
  if (!bookData) return;
  localStorage.setItem(`imsa_bookmark_${bookData.id}`, currentPage);
  showReaderToast(`🔖 Marque-page placé à la page ${currentPage}`);
  try {
    await fetch(`${API}/reading-progress`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        book_id:      bookData.legacy_id || bookData.id,
        current_page: currentPage,
        bookmark_page: currentPage
      })
    });
  } catch(e) {}
});

// ── Mode nuit ──
document.getElementById('nightModeBtn')?.addEventListener('click', () => {
  document.body.classList.toggle('night-mode');
  const btn = document.getElementById('nightModeBtn');
  if (btn) {
    const isNight = document.body.classList.contains('night-mode');
    btn.innerHTML = isNight ? '☀️ Mode jour' : '🌙 Mode nuit';
    localStorage.setItem('imsa_night_mode', isNight);
  }
});

// Restaurer mode nuit
if (localStorage.getItem('imsa_night_mode') === 'true') {
  document.body.classList.add('night-mode');
}

// ── Utilitaires ──
function updatePageInfo() {
  const el = document.getElementById('pageInfo');
  if (el) el.textContent = `Page ${currentPage} / ${totalPages}`;
}

function updateProgressBar() {
  const bar = document.getElementById('readingProgressBar');
  const pct = Math.round((currentPage / totalPages) * 100);
  if (bar) {
    bar.style.width = `${pct}%`;
    bar.setAttribute('aria-valuenow', pct);
  }
}

function showLoader(show) {
  const loader = document.getElementById('readerLoader');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

function showMessage(html, type) {
  const container = document.getElementById('readerContent') ||
                    document.querySelector('.reader-content');
  if (container) {
    container.innerHTML = `
      <div class="alert alert-${type} m-4" role="alert">
        ${html}
      </div>
    `;
  }
}

function showReaderToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'position-fixed bottom-0 start-50 translate-middle-x mb-4';
  toast.style.zIndex = '9999';
  toast.innerHTML = `
    <div class="toast show text-white fw-semibold px-4 py-2 rounded-pill"
         style="background:#1A3A5C;">
      ${msg}
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Nettoyage
window.addEventListener('beforeunload', () => {
  if (saveInterval) clearInterval(saveInterval);
  saveProgress();
});

