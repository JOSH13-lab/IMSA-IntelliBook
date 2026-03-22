const { query, getClient } = require('../config/db');

// POST /api/borrows — Emprunter un livre
// Connecté à : livre.html → modal confirmation emprunt
exports.borrowBook = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { book_id } = req.body;
    const user_id = req.user.id;

    // Vérifier disponibilité
    const bookCheck = await client.query(
      'SELECT id, title, available_copies FROM books WHERE id = $1 OR legacy_id = $1 FOR UPDATE',
      [book_id]
    );

    if (!bookCheck.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Livre introuvable.' });
    }

    if (bookCheck.rows[0].available_copies <= 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Aucun exemplaire disponible pour ce livre.'
      });
    }

    // Vérifier emprunt actif existant
    const existing = await client.query(`
      SELECT id FROM borrows
      WHERE user_id = $1 AND book_id = $2 AND status IN ('en_cours','prolonge')
    `, [user_id, bookCheck.rows[0].id]);

    if (existing.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Vous avez déjà emprunté ce livre.'
      });
    }

    // Créer l'emprunt (due_date = +14 jours)
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 14);

    const { rows } = await client.query(`
      INSERT INTO borrows (user_id, book_id, due_date)
      VALUES ($1, $2, $3)
      RETURNING *, (SELECT title FROM books WHERE id = $2) AS book_title
    `, [user_id, bookCheck.rows[0].id, due_date]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `📚 Emprunt confirmé ! Retour avant le ${due_date.toLocaleDateString('fr-GA')}.`,
      data: rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// PUT /api/borrows/:id/extend — Prolonger un emprunt
// Connecté à : profil.html → onglet Historique → bouton Prolonger
exports.extendBorrow = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query(`
      SELECT * FROM borrows WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Emprunt introuvable.' });
    }

    if (rows[0].extension_count >= 2) {
      return res.status(409).json({
        success: false,
        message: 'Nombre maximum de prolongations atteint (2 fois).'
      });
    }

    if (rows[0].status !== 'en_cours') {
      return res.status(409).json({
        success: false,
        message: 'Seuls les emprunts en cours peuvent être prolongés.'
      });
    }

    const newDueDate = new Date(rows[0].due_date);
    newDueDate.setDate(newDueDate.getDate() + 7);

    const { rows: updated } = await query(`
      UPDATE borrows
      SET due_date = $1,
          status = 'prolonge',
          extension_count = extension_count + 1,
          extension_days = extension_days + 7,
          extended_at = NOW(),
          original_due_date = COALESCE(original_due_date, due_date)
      WHERE id = $2
      RETURNING *
    `, [newDueDate, id]);

    res.json({
      success: true,
      message: `Emprunt prolongé de 7 jours. Nouveau retour : ${newDueDate.toLocaleDateString('fr-GA')}.`,
      data: updated[0]
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id/borrows — Historique emprunts
// Connecté à : profil.html → onglet Historique
exports.getUserBorrows = async (req, res, next) => {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id;

    const { rows } = await query(`
      SELECT b.*,
             bk.title, bk.author, bk.cover_url, bk.legacy_id,
             c.name AS category_name, c.color_class
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      JOIN categories c ON bk.category_id = c.id
      WHERE b.user_id = $1
      ORDER BY b.borrowed_at DESC
    `, [userId]);

    // Mettre à jour les emprunts en retard automatiquement
    await query(`
      UPDATE borrows SET status = 'en_retard'
      WHERE user_id = $1
        AND status = 'en_cours'
        AND due_date < NOW()
    `, [userId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
