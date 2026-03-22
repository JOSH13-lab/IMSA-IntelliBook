/* IMSA IntelliBook - Profil Utilisateur */
(function () {
  const BORROWS_KEY = "imsa_user_borrows";
  const FAVORITES_KEY = "imsa_user_favorites";
  const NIGHT_LS = "imsa_reader_night";

  function toastFallback(message, type = "info") {
    if (window.imsaToast) return window.imsaToast(message, type);
    alert(message);
  }

  async function getRecommendations(userId) {
    // BACKEND: GET /api/users/:id/recommendations
    return [];
  }

  async function removeFavorite(bookId, userId) {
    // BACKEND: DELETE /api/users/:id/favorites/:bookId
    return { ok: true };
  }

  async function extendBorrow(borrowId) {
    // BACKEND: PUT /api/borrows/:id/extend
    return { ok: true };
  }

  async function updateProfile(userId, formData) {
    // BACKEND: PUT /api/users/:id
    return { ok: true };
  }

  async function changePassword(data) {
    // BACKEND: PUT /api/auth/password
    return { ok: true };
  }

  async function deleteAccount(userId) {
    // BACKEND: DELETE /api/users/:id
    return { ok: true };
  }

  function getUserSession() {
    const raw = localStorage.getItem("imsa_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function initialsFromName(name) {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    const a = (parts[0] || "I").charAt(0);
    const b = (parts[1] || parts[0] || "M").charAt(0);
    return `${a}${b}`.toUpperCase();
  }

  function formatDateISO(d) {
    const date = d instanceof Date ? d : new Date(d);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function buildSampleBorrows(userId) {
    const allBooks = window.imsaUtils.getAllBooks();
    const start = new Date();
    const borrows = [];

    for (let i = 0; i < 10; i++) {
      const b = allBooks[(i * 7 + userId.length) % allBooks.length];
      const borrowedAt = new Date(start.getTime() - (i + 3) * 86400000);
      const dueAt = new Date(borrowedAt.getTime() + (7 + (i % 3)) * 86400000);
      const isLate = dueAt.getTime() < Date.now() - 2 * 86400000;
      const status = isLate ? "En retard" : i < 3 ? "En cours" : "Rendu";

      borrows.push({
        id: `bor-${userId}-${i + 1}`,
        bookId: b.id,
        borrowedAt: formatDateISO(borrowedAt),
        dueAt: formatDateISO(dueAt),
        status
      });
    }
    return borrows;
  }

  function buildSampleFavorites(userId) {
    const allBooks = window.imsaUtils.getAllBooks();
    const favs = [];
    for (let i = 0; i < 5; i++) favs.push(allBooks[(i * 11 + userId.length) % allBooks.length].id);
    return favs;
  }

  function buildSampleRecommendations(userId) {
    const allBooks = window.imsaUtils.getAllBooks();
    const borrows = getStoredBorrows() || [];
    const favSet = new Set(getStoredFavorites() || []);
    const seen = new Set();
    const out = [];

    const likedCategories = new Set(borrows.map((x) => window.imsaUtils.getBookById(x.bookId)?.categoryKey).filter(Boolean));
    for (let i = 0; out.length < 6 && i < allBooks.length; i++) {
      const b = allBooks[(i * 5 + userId.length) % allBooks.length];
      if (favSet.has(b.id)) continue;
      if (seen.has(b.id)) continue;
      if (likedCategories.size && !likedCategories.has(b.categoryKey)) continue;
      seen.add(b.id);
      const reasonBook = borrows[0] ? window.imsaUtils.getBookById(borrows[0].bookId) : allBooks[0];
      out.push({
        bookId: b.id,
        reason: `Parce que vous avez aimé ${reasonBook?.title || "un livre"}`
      });
    }
    return out;
  }

  function getStoredBorrows() {
    const raw = localStorage.getItem(BORROWS_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setStoredBorrows(borrows) {
    localStorage.setItem(BORROWS_KEY, JSON.stringify(borrows));
  }

  function getStoredFavorites() {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setStoredFavorites(favs) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  }

  function renderProfile(user) {
    const fullname = user.fullname || user.fullName || "Lecteur";
    const type = user.usertype || user.usertype || "Lecteur";
    const city = user.city || "Libreville";
    const joined = user.joined || user.joinedAt || "2025-01-01";

    document.getElementById("profileFullname").textContent = fullname;
    document.getElementById("profileCity").textContent = city;
    document.getElementById("profileMemberSince").textContent = `Membre depuis ${joined}`;
    document.getElementById("profileAvatar").textContent = initialsFromName(fullname);

    const badge = document.getElementById("profileTypeBadge");
    if (badge) badge.textContent = type;
  }

  function renderBorrows(borrows) {
    const tbody = document.getElementById("borrowsTbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    borrows.forEach((br) => {
      const b = window.imsaUtils.getBookById(br.bookId);
      const tr = document.createElement("tr");
      if ((br.status || "").toLowerCase().includes("retard")) tr.classList.add("overdue-row");
      tr.innerHTML = `
        <td>
          <div style="width:44px;border-radius:10px;overflow:hidden;">
            ${window.imsaUtils.renderBookCoverContainerHTML(b)}
          </div>
        </td>
        <td class="fw-semibold">${window.imsaUtils.escapeHtml(b.title)}</td>
        <td class="text-muted small">${window.imsaUtils.escapeHtml(b.author)}</td>
        <td class="text-muted small">${window.imsaUtils.escapeHtml(br.borrowedAt)}</td>
        <td class="text-muted small">${window.imsaUtils.escapeHtml(br.dueAt)}</td>
        <td>${br.status.includes("retard") ? `<span class="badge text-bg-orange">En retard</span>` : br.status === "En cours" ? `<span class="badge text-bg-warning">En cours</span>` : `<span class="badge text-bg-secondary">Rendu</span>`}</td>
        <td>
          ${br.status === "En cours" ? `<button class="btn btn-orange-outline btn-sm" data-action="extend-borrow" data-borrow-id="${br.id}">Prolonger</button>` : `<span class="text-muted small">—</span>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderFavorites(favIds) {
    const grid = document.getElementById("favoritesGrid");
    if (!grid) return;
    grid.innerHTML = "";
    favIds.forEach((id) => {
      const b = window.imsaUtils.getBookById(id);
      const col = document.createElement("div");
      col.className = "col-12 col-md-6 col-lg-4";
      col.innerHTML = `
        <div class="card book-card h-100 position-relative p-2">
           <button class="btn btn-sm btn-light position-absolute top-0 end-0 m-3 rounded-circle text-danger shadow-sm z-3" 
                   data-action="remove-favorite" data-book-id="${b.id}" title="Retirer des favoris">
             <i class="fa-solid fa-heart"></i>
           </button>
           <div class="card-body p-0 d-flex flex-column">
             ${window.imsaUtils.renderBookCoverContainerHTML(b)}
             <div class="p-3">
               <h3 class="fw-bold h6 mb-1">${window.imsaUtils.escapeHtml(b.title)}</h3>
               <p class="text-muted small mb-0">${window.imsaUtils.escapeHtml(b.author)}</p>
               <a href="livre.html?id=${encodeURIComponent(b.id)}" class="btn btn-orange-outline btn-sm w-100 mt-3">Voir la fiche</a>
             </div>
           </div>
        </div>
      `;
      grid.appendChild(col);
    });
  }

  function renderRecommendations(recos) {
    const grid = document.getElementById("recoGrid");
    if (!grid) return;
    grid.innerHTML = "";
    recos.forEach((r) => {
      const b = window.imsaUtils.getBookById(r.bookId);
      const col = document.createElement("div");
      col.className = "col-12 col-md-6";
      col.innerHTML = `
        <div class="card book-card p-3 h-100">
          <div class="d-flex gap-3">
            <div style="width:100px;flex:0 0 100px;overflow:hidden;border-radius:10px;">
              ${window.imsaUtils.renderBookCoverContainerHTML(b)}
            </div>
            <div class="flex-grow-1">
              <span class="badge ${window.imsaUtils.categoryBadgeClass(b.categoryKey)} mb-2">${window.imsaUtils.categoryLabel(b.categoryKey)}</span>
              <h4 class="fw-bold h6 mb-1">${window.imsaUtils.escapeHtml(b.title)}</h4>
              <p class="text-muted small mb-1">${window.imsaUtils.escapeHtml(b.author)}</p>
              <div class="text-muted small fst-italic mb-3"><i class="fa-solid fa-wand-magic-sparkles text-orange me-1"></i>${window.imsaUtils.escapeHtml(r.reason)}</div>
              <a href="livre.html?id=${encodeURIComponent(b.id)}" class="btn btn-blue-dark btn-sm px-4">Consulter</a>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(col);
    });
  }

  function renderStatsFromData(borrows, favs) {
    // Démo: stats simples
    const borrowedCount = borrows.length;
    const inProgress = borrows.filter((b) => b.status === "En cours").length;
    document.getElementById("statBorrowed").textContent = String(borrowedCount);
    document.getElementById("statInProgress").textContent = String(inProgress);
    document.getElementById("statFavorites").textContent = String(favs.length);
  }

  function checkAuthOrRedirect() {
    const user = getUserSession();
    if (user) return user;

    toastFallback("Veuillez vous inscrire ou vous connecter pour accéder à votre profil.", "error");
    window.location.href = "inscription.html";
    return null;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const user = checkAuthOrRedirect();
    if (!user) return;
    const userId = user.id || user.email || user.fullname || "usr-demo";

    // borrows
    let borrows = getStoredBorrows();
    if (!borrows) {
      borrows = buildSampleBorrows(userId);
      setStoredBorrows(borrows);
    }

    let favorites = getStoredFavorites();
    if (!favorites) {
      favorites = buildSampleFavorites(userId);
      setStoredFavorites(favorites);
    }

    const recommendations = buildSampleRecommendations(userId);

    renderProfile(user);
    renderBorrows(borrows);
    renderFavorites(favorites);
    renderRecommendations(recommendations);
    renderStatsFromData(borrows, favorites);

    // Actions: retirer favori, prolonger
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");

      if (action === "remove-favorite") {
        const bookId = btn.getAttribute("data-book-id");
        favorites = (getStoredFavorites() || []).filter((x) => x !== bookId);
        setStoredFavorites(favorites);
        await removeFavorite(bookId, userId);
        renderFavorites(favorites);
        toastFallback("Favori retiré.", "success");
      }

      if (action === "extend-borrow") {
        const borrowId = btn.getAttribute("data-borrow-id");
        await extendBorrow(borrowId);
        toastFallback("Prolongation enregistrée (démo).", "success");
      }
    });

    // Modifier profil
    const modalEl = document.getElementById("profileEditModal");
    const editBtn = document.getElementById("editProfileBtn");
    const saveBtn = document.getElementById("saveProfileEditBtn");
    if (editBtn && modalEl && saveBtn) {
      const modal = new bootstrap.Modal(modalEl);
      editBtn.addEventListener("click", () => {
        document.getElementById("editName").value = user.fullname || user.fullName || "";
        document.getElementById("editEmail").value = user.email || "";
        document.getElementById("editPhone").value = user.phone || "+241 01 23 45 67";
        document.getElementById("editCity").value = user.city || "";
        document.getElementById("editInstitution").value = user.institution || "IMSA";
        document.getElementById("editUsertype").value = user.usertype || "";
        modal.show();
      });

      saveBtn.addEventListener("click", async () => {
        const form = document.getElementById("profileEditForm");
        const data = Object.fromEntries(new FormData(form).entries());
        await updateProfile(userId, data);
        localStorage.setItem("imsa_user", JSON.stringify({ ...user, ...data }));
        modal.hide();
        renderProfile({ ...user, ...data });
        toastFallback("Profil mis à jour.", "success");
      });
    }

    // Déconnexion
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      localStorage.removeItem("imsa_user");
      window.location.href = "index.html";
    });

    // Paramètres
    document.getElementById("settingsForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(e.target).entries());
      await updateProfile(userId, formData);
      localStorage.setItem("imsa_user", JSON.stringify({ ...user, ...formData }));
      toastFallback("Paramètres enregistrés (démo).", "success");
    });

    // Remplissage settings form
    const setName = document.getElementById("setName");
    if (setName) {
      document.getElementById("setName").value = user.fullname || user.fullName || "";
      document.getElementById("setEmail").value = user.email || "";
      document.getElementById("setPhone").value = user.phone || "+241 01 23 45 67";
      document.getElementById("setCity").value = user.city || "";
      document.getElementById("setInstitution").value = user.institution || "IMSA";
      document.getElementById("setUsertype").value = user.usertype || "";
    }

    // Supprimer compte
    const deleteBtn = document.getElementById("deleteAccountBtn");
    const deleteModalEl = document.getElementById("deleteAccountModal");
    const confirmDeleteBtn = document.getElementById("confirmDeleteAccountBtn");
    if (deleteBtn && deleteModalEl && confirmDeleteBtn) {
      const modal = new bootstrap.Modal(deleteModalEl);
      deleteBtn.addEventListener("click", () => modal.show());
      confirmDeleteBtn.addEventListener("click", async () => {
        await deleteAccount(userId);
        localStorage.removeItem("imsa_user");
        toastFallback("Compte supprimé (démo).", "success");
        window.location.href = "index.html";
      });
    }
  });
})();

