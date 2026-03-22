const { query } = require('../config/db');
const bcrypt    = require('bcryptjs');

// GET /api/users — Liste tous les utilisateurs (admin)
// Connecté à : utilisateurs.html → tableau dashboard
exports.getUsers = async (req, res, next) => {
  try {
    const { search, type, status, page = 1, per_page = 15 } = req.query;
    const offset = (page - 1) * per_page;

    let whereClause = 'WHERE deleted_at IS NULL';
    const params = [];
    let paramIdx = 1;

    if (search) {
      whereClause += ` AND (fullname ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (type)   { whereClause += ` AND user_type = $${paramIdx++}`;  params.push(type); }
    if (status) { whereClause += ` AND status = $${paramIdx++}`;     params.push(status); }

    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await query(`
      SELECT id, fullname, email, phone, city, user_type, status,
             total_borrows, active_borrows, avatar_url, created_at
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, per_page, offset]);

    res.json({
      success: true,
      data: rows,
      pagination: { total, page: parseInt(page), per_page: parseInt(per_page),
                    total_pages: Math.ceil(total / per_page) }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id — Détail utilisateur
exports.getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id;

    const { rows } = await query(`
      SELECT id, fullname, email, phone, city, institution, user_type,
             status, avatar_url, total_borrows, active_borrows,
             total_reviews, total_favorites,
             email_notif_new_books, email_notif_due_date, email_notif_reco,
             created_at, last_login_at
      FROM users WHERE id = $1 AND deleted_at IS NULL
    `, [userId]);

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id — Modifier un utilisateur
exports.updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id;
    const { fullname, phone, city, institution,
            email_notif_new_books, email_notif_due_date, email_notif_reco } = req.body;

    const { rows } = await query(`
      UPDATE users
      SET fullname = COALESCE($1, fullname),
          phone    = COALESCE($2, phone),
          city     = COALESCE($3, city),
          institution = COALESCE($4, institution),
          email_notif_new_books = COALESCE($5, email_notif_new_books),
          email_notif_due_date  = COALESCE($6, email_notif_due_date),
          email_notif_reco      = COALESCE($7, email_notif_reco),
          updated_at = NOW()
      WHERE id = $8
      RETURNING id, fullname, email, phone, city, institution, user_type
    `, [fullname, phone, city, institution,
        email_notif_new_books, email_notif_due_date, email_notif_reco,
        userId]);

    res.json({ success: true, message: 'Profil mis à jour.', data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/:id — Soft delete
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(
      "UPDATE users SET deleted_at = NOW(), status = 'inactif' WHERE id = $1",
      [id]
    );
    res.json({ success: true, message: 'Utilisateur supprimé.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id/recommendations — Recommandations
// Connecté à : profil.html → onglet Recommandations
exports.getRecommendations = async (req, res, next) => {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id;
    const { rows } = await query(
      'SELECT * FROM get_recommendations($1, 6)',
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
