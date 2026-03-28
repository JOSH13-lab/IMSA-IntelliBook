/* IMSA IntelliBook - Dashboard Admin (Phase 2) */

const API = 'http://localhost:5000/api';

function getToken()   { return localStorage.getItem('imsa_access_token'); }
function isLoggedIn() { return !!getToken(); }
function getUser()    { 
  const raw = localStorage.getItem('imsa_user');
  try { return JSON.parse(raw); } catch { return null; }
}

let dashboardState = {
  currentPage: 1,
  perPage: 15,
  stats: null,
  users: [],
  borrows: [],
  filter: 'all'
};

// ── Vérifier accès admin ──
document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    showDashToast('Connectez-vous d\'abord.', 'warning');
    setTimeout(() => window.location.href = 'inscription.html', 1500);
    return;
  }

  const user = getUser();
  if (user.user_type !== 'administrateur') {
    showDashToast('Accès refusé. Administration uniquement.', 'danger');
    setTimeout(() => window.location.href = 'index.html', 2000);
    return;
  }

  await loadDashboardStats();
  await loadUsers();
  await loadBorrows();
});

// ── Récupérer stats ──
async function loadDashboardStats() {
  try {
    const res = await fetch(`${API}/users/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (data.success) {
      dashboardState.stats = data.data;
      renderStats(data.data);
    }
  } catch(e) { console.error(e); }
}

// ── Récupérer utilisateurs ──
async function loadUsers() {
  try {
    const res = await fetch(`${API}/users?page=${dashboardState.currentPage}&per_page=${dashboardState.perPage}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (data.success) {
      dashboardState.users = data.data;
      renderUsers(data.data);
    }
  } catch(e) { console.error(e); }
}

// ── Récupérer emprunts ──
async function loadBorrows() {
  try {
    let status = dashboardState.filter;
    if (status === 'all') status = '';
    const url = status 
      ? `${API}/borrows?status=${status}&page=1&per_page=20`
      : `${API}/borrows?page=1&per_page=20`;
    
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (data.success) {
      dashboardState.borrows = data.data;
      renderBorrows(data.data);
    }
  } catch(e) { console.error(e); }
}

// ── Rendu stats ──
function renderStats(stats) {
  const updateEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '0';
  };

  updateEl('totalUsers', stats.total_users);
  updateEl('activeBorrows', stats.active_borrows);
  updateEl('overdueBooks', stats.overdue_count);
  updateEl('totalBooks', stats.total_books);
}

// ── Rendu utilisateurs ──
function renderUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <span class="avatar avatar-sm rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold">
            ${getInitials(u.fullname)}
          </span>
          <div>
            <div class="fw-semibold">${u.fullname}</div>
            <small class="text-muted">${u.email}</small>
          </div>
        </div>
      </td>
      <td>${u.user_type}</td>
      <td><span class="badge ${u.user_status === 'active' ? 'bg-success' : 'bg-secondary'}">${u.user_status}</span></td>
      <td>${u.total_borrows || 0}</td>
      <td>
        <button class="btn btn-sm btn-info" onclick="viewUserDetail('${u.id}')">Voir</button>
        <button class="btn btn-sm btn-danger" onclick="deleteUserConfirm('${u.id}')">Supprimer</button>
      </td>
    </tr>
  `).join('');
}

// ── Rendu emprunts ──
function renderBorrows(borrows) {
  const tbody = document.getElementById('borrowsTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = borrows.map(b => `
    <tr>
      <td>${b.user_fullname}</td>
      <td>${b.book_title}</td>
      <td><span class="badge badge-${getStatusColor(b.status)}">${b.status}</span></td>
      <td>${new Date(b.due_date).toLocaleDateString('fr-FR')}</td>
      <td>${new Date(b.borrowed_at).toLocaleDateString('fr-FR')}</td>
    </tr>
  `).join('');
}

// ── Supprimer user ──
async function deleteUserConfirm(userId) {
  if (!confirm('Êtes-vous sûr? Cette action est irréversible.')) return;
  
  try {
    const res = await fetch(`${API}/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (data.success) {
      showDashToast('Utilisateur supprimé.', 'success');
      await loadUsers();
    } else {
      showDashToast(data.message || 'Erreur.', 'danger');
    }
  } catch(e) {
    showDashToast('Erreur réseau.', 'danger');
  }
}

// ── Voir détail user ──
function viewUserDetail(userId) {
  const user = dashboardState.users.find(u => u.id === userId);
  if (!user) return;
  const modal = document.getElementById('userDetailModal');
  if (modal) {
    document.getElementById('userDetailContent').innerHTML = `
      <p><strong>ID:</strong> ${user.id}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Type:</strong> ${user.user_type}</p>
      <p><strong>Emprunts actifs:</strong> ${user.active_borrows || 0}</p>
      <p><strong>Total emprunts:</strong> ${user.total_borrows || 0}</p>
    `;
    new bootstrap.Modal(modal).show();
  }
}

// Utilitaires
function getInitials(name) {
  const parts = (name || '').split(' ').filter(Boolean);
  return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || 'S')).toUpperCase();
}

function getStatusColor(status) {
  const colors = {
    'en_cours': 'info',
    'prolonge': 'warning',
    'rendu': 'success',
    'en_retard': 'danger'
  };
  return colors[status] || 'secondary';
}

function showDashToast(msg, type) {
  const toast = document.createElement('div');
  toast.className = 'position-fixed top-0 start-50 translate-middle-x mt-3';
  toast.style.zIndex = '9999';
  const colors = {
    success: '#198754',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#0dcaf0'
  };
  toast.innerHTML = `
    <div class="toast show text-white fw-semibold px-4 py-3"
         style="background:${colors[type] || colors.success};border-radius:6px;">
      ${msg}
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

