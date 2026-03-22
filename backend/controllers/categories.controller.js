const { query } = require('../config/db');

// GET /api/categories — Liste toutes les catégories
exports.getCategories = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/categories/:slug/books — Livres d'une catégorie
exports.getCategoryBooks = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT b.id, b.legacy_id, b.title, b.author, b.cover_url,
             b.year, b.average_rating, b.total_borrows, b.available_copies > 0 as is_available,
             b.summary, b.is_new, b.is_featured
      FROM books b
      JOIN categories c ON b.category_id = c.id
      WHERE c.slug = $1 AND b.deleted_at IS NULL AND b.is_active = TRUE
      ORDER BY b.is_featured DESC, b.average_rating DESC
    `, [req.params.slug]);

    if (!rows[0]) {
      // Vérifier si la catégorie existe
      const catCheck = await query('SELECT id FROM categories WHERE slug = $1', [req.params.slug]);
      if (!catCheck.rows[0]) {
        return res.status(404).json({ success: false, message: 'Catégorie introuvable.' });
      }
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
