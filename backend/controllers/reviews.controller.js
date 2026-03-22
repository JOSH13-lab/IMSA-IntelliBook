const { query } = require('../config/db');

// POST /api/books/:id/reviews — Laisser un avis
// Connecté à : livre.html → formulaire avis
exports.createReview = async (req, res, next) => {
  try {
    const { id: book_id } = req.params;
    const { rating, title, content } = req.body;
    const user_id = req.user.id;

    const { rows } = await query(`
      INSERT INTO reviews (user_id, book_id, rating, title, content)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, book_id)
      DO UPDATE SET rating = $3, title = $4, content = $5, updated_at = NOW()
      RETURNING *
    `, [user_id, book_id, rating, title || null, content || null]);

    res.status(201).json({
      success: true,
      message: 'Avis publié avec succès. Merci !',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/books/:id/reviews — Avis d'un livre
exports.getBookReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      SELECT r.id, r.rating, r.title, r.content, r.created_at,
             u.fullname AS user_fullname, u.city AS user_city, u.avatar_url
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      WHERE (b.id = $1 OR b.legacy_id = $1) AND r.is_approved = TRUE
      ORDER BY r.created_at DESC
    `, [id]);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
