const { query } = require('../config/db');

// POST /api/favorites — Ajouter/retirer un favori (toggle)
// Connecté à : livre.html → bouton ❤️ Favoris
exports.toggleFavorite = async (req, res, next) => {
  try {
    const { book_id } = req.body;
    const user_id = req.user.id;

    const existing = await query(
      'SELECT id FROM favorites WHERE user_id = $1 AND book_id = $2',
      [user_id, book_id]
    );

    if (existing.rows[0]) {
      await query('DELETE FROM favorites WHERE user_id = $1 AND book_id = $2', [user_id, book_id]);
      return res.json({ success: true, favorited: false, message: 'Retiré des favoris.' });
    } else {
      await query('INSERT INTO favorites (user_id, book_id) VALUES ($1, $2)', [user_id, book_id]);
      return res.json({ success: true, favorited: true, message: 'Ajouté aux favoris ❤️' });
    }
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id/favorites — Favoris d'un utilisateur
// Connecté à : profil.html → onglet Favoris
exports.getUserFavorites = async (req, res, next) => {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id;
    const { rows } = await query(`
      SELECT b.id, b.legacy_id, b.title, b.author, b.cover_url,
             b.average_rating, b.year, c.name AS category_name, c.color_class,
             f.created_at AS favorited_at
      FROM favorites f
      JOIN books b ON f.book_id = b.id
      JOIN categories c ON b.category_id = c.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `, [userId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
