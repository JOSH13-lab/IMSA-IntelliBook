/* IMSA IntelliBook - Dashboard Admin */
(function () {
  // --- Stubs API (backend-ready) ---
  async function getUsers() {
    try {
      // BACKEND: GET /api/users
      return sampleUsers;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  async function updateUser(userId, formData) {
    try {
      // BACKEND: PUT /api/users/:id
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, error: err };
    }
  }

  async function deleteUser(userId) {
    try {
      // BACKEND: DELETE /api/users/:id
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, error: err };
    }
  }

  async function borrowBook(bookId) {
    try {
      // BACKEND: POST /api/borrows
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, error: err };
    }
  }

  async function addBook(formData) {
    try {
      // BACKEND: POST /api/books
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, error: err };
    }
  }

  // --- Données de démonstration ---
  const sampleUsers = [
    { id: "usr-001", fullName: "Olive Magnanga", email: "o.magnanga@ub.ga", city: "Libreville", type: "Étudiante", status: "Actif", borrows: 12, joined: "2025-02-12" },
    { id: "usr-002", fullName: "Jean-B. Moussavou", email: "jb.moussavou@lycee-leon.ga", city: "Libreville", type: "Enseignant", status: "Actif", borrows: 8, joined: "2024-11-05" },
    { id: "usr-003", fullName: "Christelle Ondo", email: "c.ondo@irsh.ga", city: "Franceville", type: "Chercheuse", status: "Actif", borrows: 24, joined: "2025-01-22" },
    { id: "usr-004", fullName: "Pierre-A. Nzamba", email: "p.nzamba@gmail.com", city: "Port-Gentil", type: "Professionnel", status: "Inactif", borrows: 3, joined: "2024-08-16" },
    { id: "usr-005", fullName: "Aminata Koumba", email: "a.koumba@imsa.ga", city: "Libreville", type: "Étudiante", status: "Actif", borrows: 17, joined: "2024-09-21" },
    { id: "usr-006", fullName: "Rodrigue Bouanga", email: "r.bouanga@omg.ga", city: "Oyem", type: "Lecteur", status: "Actif", borrows: 6, joined: "2025-03-02" },
    { id: "usr-007", fullName: "Laure-Ines Obiang", email: "l.obiang@ub.ga", city: "Libreville", type: "Étudiante", status: "Actif", borrows: 21, joined: "2024-12-11" },
    { id: "usr-008", fullName: "Donatien Mboumba", email: "d.mboumba@lycee.ga", city: "Mouila", type: "Enseignant", status: "Inactif", borrows: 2, joined: "2024-10-03" },
    { id: "usr-009", fullName: "Sylvie Nkoghe", email: "s.nkoghe@recherche.ga", city: "Libreville", type: "Chercheuse", status: "Actif", borrows: 33, joined: "2025-01-07" },
    { id: "usr-010", fullName: "Éric Bekale", email: "e.bekale@petro.ga", city: "Port-Gentil", type: "Professionnel", status: "Actif", borrows: 5, joined: "2025-02-01" },
    { id: "usr-011", fullName: "Nadège Ovono", email: "n.ovono@gmail.com", city: "Libreville", type: "Lectrice", status: "Actif", borrows: 9, joined: "2024-07-27" },
    { id: "usr-012", fullName: "Frank Nguema", email: "f.nguema@ingenierie.ga", city: "Franceville", type: "Professionnel", status: "Inactif", borrows: 1, joined: "2024-06-08" },
    { id: "usr-013", fullName: "Doris Idiata", email: "d.idiata@irsh.ga", city: "Libreville", type: "Chercheuse", status: "Actif", borrows: 41, joined: "2025-02-18" },
    { id: "usr-014", fullName: "Bertrand Mouketou", email: "b.mouketou@ub.ga", city: "Libreville", type: "Étudiant", status: "Actif", borrows: 14, joined: "2024-12-20" },
    { id: "usr-015", fullName: "Patricia Leyama", email: "p.leyama@imsa.ga", city: "Libreville", type: "Enseignante", status: "Actif", borrows: 7, joined: "2025-01-29" }
  ];

  // --- Helpers ---
  function initials(name) {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    const a = (parts[0] || "").charAt(0) || "I";
    const b = (parts[1] || parts[0] || "").charAt(0) || "M";
    return (a + b).toUpperCase();
  }

  function typeMatchesFilter(userType, filter) {
    if (filter === "Tous") return true;
    const u = (userType || "").toLowerCase();
    if (filter === "Étudiants") return u.includes("étudiant");
    if (filter === "Enseignants") return u.includes("enseign");
    if (filter === "Chercheurs") return u.includes("cherche");
    if (filter === "Professionnels") return u.includes("professionnel");
    if (filter === "Lecteurs") return u.includes("lecteur") || u.includes("lectrice");
    return true;
  }

  function statusBadge(status) {
    if ((status || "").toLowerCase() === "actif") return `<span class="badge text-bg-success">Actif</span>`;
    return `<span class="badge text-bg-secondary">Inactif</span>`;
  }

  // --- Rendu table ---
  let state = {
    page: 1,
    perPage: 15,
    filterType: "Tous",
    q: ""
  };

  function getFilteredUsers(users) {
    return users.filter((u) => {
      if (!typeMatchesFilter(u.type, state.filterType)) return false;
      if (state.q) {
        const hay = `${u.fullName} ${u.email} ${u.city} ${u.type}`.toLowerCase();
        if (!hay.includes(state.q.toLowerCase())) return false;
      }
      return true;
    });
  }

  function renderUsers() {
    const tbody = document.getElementById("usersTbody");
    const rangeText = document.getElementById("usersRangeText");
    if (!tbody || !rangeText) return;

    const users = getFilteredUsers(sampleUsers);
    const total = users.length;
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    state.page = Math.min(state.page, pages);

    const start = (state.page - 1) * state.perPage;
    const slice = users.slice(start, start + state.perPage);

    tbody.innerHTML = "";
    slice.forEach((u, idx) => {
      const rowIndex = start + idx + 1;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="fw-semibold">${rowIndex}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="testi-avatar" style="width:36px;height:36px;font-size:12px;">${initials(u.fullName)}</div>
            <div class="small text-muted d-none d-sm-block">—</div>
          </div>
        </td>
        <td class="fw-semibold">${u.fullName}</td>
        <td><a href="#" class="text-decoration-none">${u.email}</a></td>
        <td>${u.city}</td>
        <td>${u.type}</td>
        <td>${statusBadge(u.status)}</td>
        <td>${u.borrows}</td>
        <td>${u.joined}</td>
        <td>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-blue-dark" data-action="view" data-user-id="${u.id}" aria-label="Voir">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button type="button" class="btn btn-sm btn-orange-outline" data-action="edit" data-user-id="${u.id}" aria-label="Modifier">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-user-id="${u.id}" aria-label="Supprimer">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    const end = Math.min(total, start + slice.length);
    rangeText.textContent = `Affichage de ${start + 1} à ${end} sur ${total} utilisateurs`;

    renderPagination(pages);
    renderItemsPerPageText(total);
  }

  function renderItemsPerPageText(total) {
    const el = document.getElementById("itemsPerPageText");
    if (!el) return;
    el.textContent = total ? `—` : "—";
  }

  function renderPagination(pages) {
    const ul = document.getElementById("adminPagination");
    if (!ul) return;
    ul.innerHTML = "";

    const current = state.page;
    const addBtn = (label, page, disabled = false, active = false) => {
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
        renderUsers();
      });
      li.appendChild(a);
      ul.appendChild(li);
    };

    addBtn("Préc.", Math.max(1, current - 1), current <= 1);
    const maxButtons = 5;
    const start = Math.max(1, current - Math.floor(maxButtons / 2));
    const end = Math.min(pages, start + maxButtons - 1);
    for (let p = start; p <= end; p++) addBtn(String(p), p, false, p === current);
    addBtn("Suiv.", Math.min(pages, current + 1), current >= pages);
  }

  // --- Modales ---
  function getUserById(userId) {
    return sampleUsers.find((u) => u.id === userId) || null;
  }

  function renderUserDetail(user) {
    const body = document.getElementById("userDetailBody");
    if (!body) return;

    const allBooks = window.imsaUtils.getAllBooks();
    const picks = [];
    for (let i = 0; i < allBooks.length && picks.length < 3; i++) {
      picks.push(allBooks[(i + user.id.length) % allBooks.length]);
    }

    const borrowsHtml = picks
      .map((b, idx) => `<li class="list-group-item d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <div style="width:44px;border-radius:10px;overflow:hidden;flex-shrink:0;">
            ${window.imsaUtils.renderBookCoverContainerHTML(b)}
          </div>
          <div>
            <div class="fw-semibold">${window.imsaUtils.escapeHtml(b.title)}</div>
            <div class="small text-muted">${window.imsaUtils.escapeHtml(b.author)}</div>
          </div>
        </div>
        <span class="badge bg-orange">${idx === 0 ? "Dernier" : "Récemment"}</span>
      </li>`)
      .join("");

    body.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-md-5">
          <div class="p-4 admin-card h-100">
            <div class="d-flex align-items-center gap-3">
              <div class="testi-avatar" style="width:56px;height:56px;font-size:16px;">${initials(user.fullName)}</div>
              <div>
                <div class="fw-bold fs-5">${window.imsaUtils.escapeHtml(user.fullName)}</div>
                <div class="text-muted">${window.imsaUtils.escapeHtml(user.email)}</div>
              </div>
            </div>
            <div class="mt-3">
              <div class="mb-1 text-muted small">Ville</div>
              <div class="fw-semibold">${window.imsaUtils.escapeHtml(user.city)}</div>
              <div class="mb-1 text-muted small mt-2">Type</div>
              <div class="fw-semibold">${window.imsaUtils.escapeHtml(user.type)}</div>
              <div class="mb-1 text-muted small mt-2">Statut</div>
              <div>${statusBadge(user.status)}</div>
              <div class="mt-3">
                <div class="text-muted small mb-1">Emprunts</div>
                <div class="fw-bold fs-4">${user.borrows}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-7">
          <div class="p-4 admin-card h-100">
            <h4 class="h6 mb-3">Historique (3 derniers emprunts)</h4>
            <ul class="list-group list-group-flush">${borrowsHtml}</ul>
            <div class="mt-3 text-muted small">
              <i class="fa-solid fa-triangle-exclamation me-2"></i>Les données ci-dessus sont des exemples.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function fillEditForm(user) {
    const title = document.getElementById("userEditModalTitle");
    if (title) title.textContent = "Modifier l'utilisateur";

    document.getElementById("adminFullname").value = user.fullName;
    document.getElementById("adminEmail").value = user.email;
    document.getElementById("adminPhone").value = "+241 01 23 45 67";
    document.getElementById("adminCity").value = user.city;
    document.getElementById("adminUsertype").value = user.type;
    document.getElementById("adminInstitution").value = "IMSA";
  }

  // Actions (view/edit/delete)
  async function viewUser(userId) {
    const user = getUserById(userId);
    if (!user) return;
    renderUserDetail(user);
    const modal = new bootstrap.Modal(document.getElementById("userDetailModal"));
    modal.show();
  }

  async function editUser(userId) {
    const user = getUserById(userId);
    if (!user) return;
    fillEditForm(user);
    const modal = new bootstrap.Modal(document.getElementById("userEditModal"));
    modal.show();

    const form = document.getElementById("adminUserForm");
    if (form) {
      form.dataset.userId = userId;
    }
  }

  async function deleteUserById(userId) {
    const user = getUserById(userId);
    if (!user) return;
    const ok = window.confirm(`Supprimer "${user.fullName}" ?`);
    if (!ok) return;
    await deleteUser(userId);
    window.imsaToast && window.imsaToast("Utilisateur supprimé (démo).", "success");
    renderUsers();
  }

  // Catalog mini table
  function renderCatalogMini() {
    const tbody = document.getElementById("catalogTbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const allBooks = window.imsaUtils.getAllBooks();
    const picks = allBooks.slice(0, 8);
    picks.forEach((b) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div style="width:52px;border-radius:10px;overflow:hidden;">
            ${window.imsaUtils.renderBookCoverContainerHTML(b)}
          </div>
        </td>
        <td class="fw-semibold">${window.imsaUtils.escapeHtml(b.title)}</td>
        <td>${window.imsaUtils.escapeHtml(b.author)}</td>
        <td>${window.imsaUtils.escapeHtml(window.imsaUtils.categoryLabel(b.categoryKey))}</td>
        <td>${Math.floor(Number(b.ratingCount || 0) / 10)} </td>
        <td>${b.availableCount > 0 ? `<span class="badge text-bg-success">Oui</span>` : `<span class="badge text-bg-secondary">Non</span>`}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function wireCatalogAddBook() {
    const btn = document.getElementById("addBookBtn");
    const modalEl = document.getElementById("bookAddModal");
    if (!btn || !modalEl) return;
    btn.addEventListener("click", () => new bootstrap.Modal(modalEl).show());

    const form = document.getElementById("addBookForm");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      data.available = !!data.available || data.available === "on" || data.available === "true";
      await addBook(data);
      window.imsaToast && window.imsaToast("Livre ajouté (démo).", "success");
      // Dans cette démo, on ne modifie pas data.js.
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
    });
  }

  // --- Init ---
  document.addEventListener("DOMContentLoaded", async () => {
    const users = await getUsers();
    if (!users.length) return;

    // Recherche
    const search = document.getElementById("adminSearchInput");
    if (search) {
      search.addEventListener("input", () => {
        state.q = search.value || "";
        state.page = 1;
        renderUsers();
      });
    }

    // Pilles types
    document.querySelectorAll("[data-user-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-user-type");
        state.filterType = t;
        document.querySelectorAll(".filter-user-pill").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.page = 1;
        renderUsers();
      });
    });

    renderUsers();
    renderCatalogMini();
    wireCatalogAddBook();

    // Actions table (view/edit/delete)
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action][data-user-id]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const userId = btn.getAttribute("data-user-id");
      if (!userId || !action) return;

      if (action === "view") return viewUser(userId);
      if (action === "edit") return editUser(userId);
      if (action === "delete") return deleteUserById(userId);
    });

    // Submit form user edit
    const form = document.getElementById("adminUserForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userId = form.dataset.userId || "usr-new";
        const data = Object.fromEntries(new FormData(form).entries());
        await updateUser(userId, data);
        window.imsaToast && window.imsaToast("Enregistré (démo).", "success");
        const modalEl = document.getElementById("userEditModal");
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
        renderUsers();
      });
    }

    // Export CSV stub
    const exportBtn = document.getElementById("exportCsvBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        window.imsaToast && window.imsaToast("Export CSV (démo) prêt pour backend.", "info");
      });
    }
  });
})();

