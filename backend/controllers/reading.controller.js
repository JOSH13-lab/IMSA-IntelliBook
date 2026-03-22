const { query } = require('../config/db');

// POST /api/reading-progress — Sauvegarder la progression
// Connecté à : lire.html → sauvegarde automatique
exports.saveProgress = async (req, res, next) => {
  try {
    const { book_id, current_page, total_pages, percent, bookmark_page, last_position } = req.body;
    const user_id = req.user.id;

    const completed_at = percent >= 100 ? new Date() : null;

    const { rows } = await query(`
      INSERT INTO reading_progress
        (user_id, book_id, current_page, total_pages, percent, bookmark_page, last_position, completed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id, book_id)
      DO UPDATE SET
        current_page  = $3,
        total_pages   = COALESCE($4, reading_progress.total_pages),
        percent       = $5,
        bookmark_page = COALESCE($6, reading_progress.bookmark_page),
        last_position = COALESCE($7, reading_progress.last_position),
        last_read_at  = NOW(),
        completed_at  = COALESCE($8, reading_progress.completed_at),
        sessions_count = reading_progress.sessions_count + 1
      RETURNING *
    `, [user_id, book_id, current_page, total_pages, percent, bookmark_page, last_position, completed_at]);

    res.json({ success: true, message: 'Progression sauvegardée.', data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/reading-progress/:bookId — Récupérer la progression
exports.getProgress = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT * FROM reading_progress
      WHERE user_id = $1 AND book_id = $2
    `, [req.user.id, req.params.bookId]);

    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    next(err);
  }
};
