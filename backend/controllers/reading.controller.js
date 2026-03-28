const { query } = require('../config/db');

// ── GET /api/books/:id/read ──
// Accès lecture — vérifie emprunt actif
exports.getBookContent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Chercher le livre
    const bookResult = await query(
      `SELECT id, title, author, file_url, preview_url,
              total_copies, cover_url, legacy_id
       FROM books
       WHERE (id::text = $1 OR legacy_id = $1)
         AND is_active = TRUE`,
      [id]
    );

    if (!bookResult.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Livre introuvable.'
      });
    }

    const book = bookResult.rows[0];

    // Vérifier emprunt actif (sauf admin)
    if (req.user.user_type !== 'administrateur') {
      const borrow = await query(
        `SELECT id FROM borrows
         WHERE user_id = $1
           AND book_id = $2
           AND status IN ('en_cours', 'prolonge')`,
        [req.user.id, book.id]
      );

      if (!borrow.rows[0]) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez emprunter ce livre pour le lire en ligne.',
          must_borrow: true,
          book_id: book.legacy_id || book.id
        });
      }
    }

    // Récupérer la progression de lecture
    const progressResult = await query(
      `SELECT current_page, percent, bookmark_page, total_pages
       FROM reading_progress
       WHERE user_id = $1 AND book_id = $2`,
      [req.user.id, book.id]
    );

    res.json({
      success: true,
      data: {
        id:          book.id,
        legacy_id:   book.legacy_id,
        title:       book.title,
        author:      book.author,
        cover_url:   book.cover_url,
        file_url:    book.file_url || null,
        preview_url: book.preview_url || null,
        progress:    progressResult.rows[0] || { current_page: 1, percent: 0 }
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/reading-progress ──
// Sauvegarder la progression de lecture
exports.saveProgress = async (req, res, next) => {
  try {
    const {
      book_id, current_page, total_pages,
      percent, bookmark_page, last_position
    } = req.body;

    const user_id = req.user.id;

    // Chercher l'ID réel du livre
    const bookResult = await query(
      `SELECT id FROM books WHERE id::text = $1 OR legacy_id = $1`,
      [book_id]
    );

    if (!bookResult.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Livre introuvable.'
      });
    }

    const realBookId = bookResult.rows[0].id;
    const completed_at = percent >= 100 ? new Date() : null;

    const { rows } = await query(
      `INSERT INTO reading_progress
         (user_id, book_id, current_page, total_pages,
          percent, bookmark_page, last_position, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id, book_id)
       DO UPDATE SET
         current_page   = $3,
         total_pages    = COALESCE($4, reading_progress.total_pages),
         percent        = $5,
         bookmark_page  = COALESCE($6, reading_progress.bookmark_page),
         last_position  = COALESCE($7, reading_progress.last_position),
         last_read_at   = NOW(),
         sessions_count = reading_progress.sessions_count + 1,
         completed_at   = COALESCE($8, reading_progress.completed_at)
       RETURNING *`,
      [user_id, realBookId, current_page || 1,
       total_pages || null, percent || 0,
       bookmark_page || null,
       last_position ? JSON.stringify(last_position) : null,
       completed_at]
    );

    res.json({
      success: true,
      message: 'Progression sauvegardée.',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/reading-progress/:bookId ──
// Récupérer la progression d'un livre
exports.getProgress = async (req, res, next) => {
  try {
    const { bookId } = req.params;

    const bookResult = await query(
      `SELECT id FROM books WHERE id::text = $1 OR legacy_id = $1`,
      [bookId]
    );

    if (!bookResult.rows[0]) {
      return res.json({ success: true, data: null });
    }

    const { rows } = await query(
      `SELECT * FROM reading_progress
       WHERE user_id = $1 AND book_id = $2`,
      [req.user.id, bookResult.rows[0].id]
    );

    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    next(err);
  }
};
