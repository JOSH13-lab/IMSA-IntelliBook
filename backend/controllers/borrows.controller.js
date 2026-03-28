const { query, getClient } = require('../config/db');

// ── POST /api/borrows ──
// Emprunter un livre (utilisateur connecté)
exports.borrowBook = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { book_id } = req.body;
    const user_id = req.user.id;

    if (!book_id) {
      return res.status(400).json({
        success: false,
        message: 'book_id est requis.'
      });
    }

    // Chercher le livre par UUID ou legacy_id
    const bookResult = await client.query(
      `SELECT id, title, available_copies
       FROM books
       WHERE (id::text = $1 OR legacy_id = $1)
         AND is_active = TRUE
       FOR UPDATE`,
      [book_id]
    );

    if (!bookResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Livre introuvable.'
      });
    }

    const book = bookResult.rows[0];

    if (book.available_copies <= 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Aucun exemplaire disponible pour ce livre.'
      });
    }

    // Vérifier emprunt actif existant
    const existing = await client.query(
      `SELECT id FROM borrows
       WHERE user_id = $1 AND book_id = $2
         AND status IN ('en_cours', 'prolonge')`,
      [user_id, book.id]
    );

    if (existing.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Vous avez déjà emprunté ce livre.'
      });
    }

    // Créer l'emprunt — due_date = +14 jours
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 14);

    const borrowResult = await client.query(
      `INSERT INTO borrows (user_id, book_id, due_date, status)
       VALUES ($1, $2, $3, 'en_cours')
       RETURNING *`,
      [user_id, book.id, due_date]
    );

    // Décrémenter available_copies
    await client.query(
      `UPDATE books
       SET available_copies = available_copies - 1,
           active_borrows   = active_borrows + 1,
           total_borrows    = total_borrows + 1
       WHERE id = $1`,
      [book.id]
    );

    // Mettre à jour compteurs utilisateur
    await client.query(
      `UPDATE users
       SET active_borrows = active_borrows + 1,
           total_borrows  = total_borrows + 1
       WHERE id = $1`,
      [user_id]
    );

    await client.query('COMMIT');

    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    const dateRetour = due_date.toLocaleDateString('fr-FR', options);

    res.status(201).json({
      success: true,
      message: `📚 Emprunt confirmé ! Retour avant le ${dateRetour}.`,
      data: {
        ...borrowResult.rows[0],
        book_title: book.title,
        due_date_formatted: dateRetour
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ── PUT /api/borrows/:id/extend ──
// Prolonger un emprunt de 7 jours (max 2 fois)
exports.extendBorrow = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM borrows WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Emprunt introuvable.'
      });
    }

    const borrow = result.rows[0];

    if (borrow.extension_count >= 2) {
      return res.status(409).json({
        success: false,
        message: 'Nombre maximum de prolongations atteint (2 fois).'
      });
    }

    if (!['en_cours', 'prolonge'].includes(borrow.status)) {
      return res.status(409).json({
        success: false,
        message: 'Seuls les emprunts en cours peuvent être prolongés.'
      });
    }

    const newDueDate = new Date(borrow.due_date);
    newDueDate.setDate(newDueDate.getDate() + 7);

    const updated = await query(
      `UPDATE borrows
       SET due_date        = $1,
           status          = 'prolonge',
           extension_count = extension_count + 1,
           extension_days  = extension_days + 7,
           extended_at     = NOW(),
           original_due_date = COALESCE(original_due_date, due_date)
       WHERE id = $2
       RETURNING *`,
      [newDueDate, id]
    );

    const dateRetour = newDueDate.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    res.json({
      success: true,
      message: `Emprunt prolongé de 7 jours. Nouveau retour : ${dateRetour}.`,
      data: updated.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/borrows/:id/return ──
// Retourner un livre
exports.returnBook = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const result = await client.query(
      `SELECT b.*, bk.id AS book_uuid
       FROM borrows b
       JOIN books bk ON b.book_id = bk.id
       WHERE b.id = $1 AND b.user_id = $2
         AND b.status IN ('en_cours', 'prolonge', 'en_retard')`,
      [id, req.user.id]
    );

    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Emprunt introuvable ou déjà retourné.'
      });
    }

    const borrow = result.rows[0];

    await client.query(
      `UPDATE borrows
       SET status = 'rendu', returned_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await client.query(
      `UPDATE books
       SET available_copies = available_copies + 1,
           active_borrows = GREATEST(active_borrows - 1, 0)
       WHERE id = $1`,
      [borrow.book_uuid]
    );

    await client.query(
      `UPDATE users
       SET active_borrows = GREATEST(active_borrows - 1, 0)
       WHERE id = $1`,
      [req.user.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Livre retourné avec succès. Merci !'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ── GET /api/borrows/me ──
// Mes emprunts (utilisateur connecté)
exports.getMyBorrows = async (req, res, next) => {
  try {
    // Mettre à jour les emprunts en retard
    await query(
      `UPDATE borrows
       SET status = 'en_retard'
       WHERE user_id = $1
         AND status = 'en_cours'
         AND due_date < NOW()`,
      [req.user.id]
    );

    const { rows } = await query(
      `SELECT b.*,
              bk.title, bk.author, bk.cover_url,
              bk.legacy_id AS book_legacy_id,
              c.name AS category_name, c.color_class
       FROM borrows b
       JOIN books bk ON b.book_id = bk.id
       JOIN categories c ON bk.category_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.borrowed_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.getUserBorrows = async (req, res, next) => {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id;

    await query(
      `UPDATE borrows
       SET status = 'en_retard'
       WHERE user_id = $1
         AND status = 'en_cours'
         AND due_date < NOW()`,
      [userId]
    );

    const { rows } = await query(
      `SELECT b.*,
              bk.title, bk.author, bk.cover_url,
              bk.legacy_id AS book_legacy_id,
              c.name AS category_name, c.color_class
       FROM borrows b
       JOIN books bk ON b.book_id = bk.id
       JOIN categories c ON bk.category_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.borrowed_at DESC`,
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/borrows/active ──
// Vérifier si un livre est emprunté activement
exports.checkActiveBorrow = async (req, res, next) => {
  try {
    const { book_id } = req.query;

    const { rows } = await query(
      `SELECT id, status, due_date
       FROM borrows
       WHERE user_id = $1
         AND (book_id::text = $2 OR
              book_id IN (SELECT id FROM books WHERE legacy_id = $2))
         AND status IN ('en_cours', 'prolonge')`,
      [req.user.id, book_id]
    );

    res.json({
      success: true,
      has_active_borrow: rows.length > 0,
      borrow: rows[0] || null
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/borrows (admin) ──
// Tous les emprunts pour le dashboard admin
exports.getAllBorrows = async (req, res, next) => {
  try {
    const { status, page = 1, per_page = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(per_page);

    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      where += ` AND b.status = $${params.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM borrows b ${where}`, params
    );

    const { rows } = await query(
      `SELECT b.*,
              u.fullname AS user_fullname, u.email AS user_email,
              bk.title AS book_title, bk.author AS book_author,
              bk.cover_url
       FROM borrows b
       JOIN users u  ON b.user_id  = u.id
       JOIN books bk ON b.book_id = bk.id
       ${where}
       ORDER BY b.borrowed_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, per_page, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        per_page: parseInt(per_page)
      }
    });
  } catch (err) {
    next(err);
  }
};
