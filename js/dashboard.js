/* IMSA IntelliBook - Dashboard Admin */
(function () {
  const API = "http://localhost:5000/api";
  const state = {
    user: null,
    users: [],
    borrows: []
  };

  function token() {
    return localStorage.getItem("imsa_access_token");
  }

  function authHeaders(extra = {}) {
    return {
      Authorization: `Bearer ${token()}`,
      ...extra
    };
  }

  function toast(message, type = "success") {
    if (window.imsaToast) {
      window.imsaToast(message, type === "danger" ? "error" : type);
      return;
    }
    alert(message);
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Erreur serveur.");
    }
    return data;
  }

  async function requireAdmin() {
    if (!token()) {
      toast("Connectez-vous d'abord.", "warning");
      setTimeout(() => { window.location.href = "inscription.html"; }, 800);
      return false;
    }

    const data = await fetchJson(`${API}/auth/me`, { headers: authHeaders() });
    state.user = data.data;
    localStorage.setItem("imsa_user", JSON.stringify(state.user));

    if (state.user?.user_type !== "administrateur") {
      toast("Accès refusé. Administration uniquement.", "danger");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
      return false;
    }
    return true;
  }

  function renderStats(stats) {
    const map = {
      totalUsers: stats.total_users,
      activeBorrows: stats.active_borrows,
      totalBooks: stats.total_books,
      overdueBooks: stats.overdue_count
    };
    Object.entries(map).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value ?? 0);
    });
  }

  function initials(name) {
    return String(name || "US")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function renderUsers(users) {
    const tbody = document.getElementById("usersTbody");
    if (!tbody) return;
    tbody.innerHTML = users.map((u, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <span class="avatar avatar-sm rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold" style="width:36px;height:36px;">
            ${initials(u.fullname)}
          </span>
        </td>
        <td class="fw-semibold">${u.fullname}</td>
        <td>${u.email}</td>
        <td>${u.city || "—"}</td>
        <td>${u.user_type}</td>
        <td><span class="badge ${u.status === "actif" || u.status === "active" ? "bg-success" : "bg-secondary"}">${u.status || "—"}</span></td>
        <td>${u.total_borrows || 0}</td>
        <td>${u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "—"}</td>
        <td>
          <button class="btn btn-sm btn-info" data-action="view-user" data-user-id="${u.id}">Voir</button>
          <button class="btn btn-sm btn-danger" data-action="delete-user" data-user-id="${u.id}">Supprimer</button>
        </td>
      </tr>
    `).join("");
  }

  function renderBorrows(borrows) {
    const tbody = document.getElementById("borrowsTableBody");
    if (!tbody) return;
    tbody.innerHTML = borrows.map((b) => `
      <tr>
        <td>${b.user_fullname || b.fullname || "—"}</td>
        <td>${b.book_title || b.title || "—"}</td>
        <td>${b.status || "—"}</td>
        <td>${b.due_date ? new Date(b.due_date).toLocaleDateString("fr-FR") : "—"}</td>
        <td>${b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString("fr-FR") : "—"}</td>
      </tr>
    `).join("");
  }

  async function loadStats() {
    const data = await fetchJson(`${API}/users/dashboard/stats`, { headers: authHeaders() });
    renderStats(data.data);
    renderBorrows(data.data.recent_borrows || []);
  }

  async function loadUsers() {
    const data = await fetchJson(`${API}/users?page=1&per_page=15`, { headers: authHeaders() });
    state.users = data.data || [];
    renderUsers(state.users);
  }

  async function deleteUser(userId) {
    if (!confirm("Supprimer ce compte ?")) return;
    await fetchJson(`${API}/users/${userId}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    toast("Utilisateur supprimé.", "success");
    await loadUsers();
  }

  function showUserDetail(userId) {
    const user = state.users.find((entry) => entry.id === userId);
    const body = document.getElementById("userDetailBody");
    const modalEl = document.getElementById("userDetailModal");
    if (!user || !body || !modalEl) return;

    body.innerHTML = `
      <p><strong>ID :</strong> ${user.id}</p>
      <p><strong>Nom :</strong> ${user.fullname}</p>
      <p><strong>Email :</strong> ${user.email}</p>
      <p><strong>Type :</strong> ${user.user_type}</p>
      <p><strong>Ville :</strong> ${user.city || "—"}</p>
      <p><strong>Emprunts :</strong> ${user.total_borrows || 0}</p>
      <p><strong>Actifs :</strong> ${user.active_borrows || 0}</p>
    `;
    new bootstrap.Modal(modalEl).show();
  }

  async function createUser(form) {
    const payload = {
      fullname: form.get("fullname"),
      email: form.get("email"),
      phone: form.get("phone"),
      city: form.get("city"),
      usertype: form.get("usertype"),
      institution: form.get("institution"),
      password: form.get("password")
    };
    await fetchJson(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    toast("Utilisateur ajouté.", "success");
    await loadUsers();
  }

  async function createBook(form) {
    const payload = {
      title: form.get("title"),
      author: form.get("author"),
      category: form.get("category"),
      year: form.get("year"),
      summary: form.get("summary"),
      cover_url: form.get("cover_url"),
      available: form.get("available") ? true : false
    };
    await fetchJson(`${API}/books`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    toast("Livre ajouté.", "success");
  }

  function wireEvents() {
    document.body.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === "view-user") {
        showUserDetail(btn.dataset.userId);
      }
      if (action === "delete-user") {
        await deleteUser(btn.dataset.userId);
      }
    });

    document.getElementById("addUserBtn")?.addEventListener("click", () => {
      const modal = document.getElementById("userEditModal");
      if (modal) new bootstrap.Modal(modal).show();
    });

    document.getElementById("addBookBtn")?.addEventListener("click", () => {
      const modal = document.getElementById("bookAddModal");
      if (modal) new bootstrap.Modal(modal).show();
    });

    document.getElementById("adminUserForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await createUser(new FormData(e.currentTarget));
        bootstrap.Modal.getInstance(document.getElementById("userEditModal"))?.hide();
        e.currentTarget.reset();
      } catch (err) {
        toast(err.message, "danger");
      }
    });

    document.getElementById("addBookForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await createBook(new FormData(e.currentTarget));
        bootstrap.Modal.getInstance(document.getElementById("bookAddModal"))?.hide();
        e.currentTarget.reset();
      } catch (err) {
        toast(err.message, "danger");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const ok = await requireAdmin();
      if (!ok) return;
      wireEvents();
      await loadStats();
      await loadUsers();
    } catch (err) {
      toast(err.message, "danger");
    }
  });
})();
