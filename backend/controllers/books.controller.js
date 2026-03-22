const { query }  = require('../config/db');
const coversService = require('../services/covers.service');

// GET /api/books — Liste avec filtres
// Connecté à : categories.html, index.html (carousels)
exports.getBooks = async (req, res, next) => {
  try {
    const {
      category, q, year_min, year_max, language,
      available, rating_min, sort = 'pertinence',
      page = 1, per_page = 20
    } = req.query;

    const { rows } = await query(`
      SELECT * FROM search_books($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [
      q || null,
      category || null,
      year_min ? parseInt(year_min) : null,
      year_max ? parseInt(year_max) : null,
      language || null,
      available !== undefined ? available === 'true' : null,
      rating_min ? parseFloat(rating_min) : null,
      sort,
      parseInt(page),
      parseInt(per_page)
    ]);

    const total = rows[0]?.total_count || 0;

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(total),
        page: parseInt(page),
        per_page: parseInt(per_page),
        total_pages: Math.ceil(total / per_page)
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/books/:id — Détail d'un livre
// Connecté à : livre.html?id=livre-001
exports.getBookById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Chercher par UUID ou par legacy_id ('livre-001')
    const { rows } = await query(`
      SELECT b.*, c.slug AS category_slug, c.name AS category_name,
             c.color_class, c.gradient
      FROM books b
      JOIN categories c ON b.category_id = c.id
      WHERE (b.id::text = $1 OR b.legacy_id = $1)
        AND b.deleted_at IS NULL
    `, [id]);

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Livre introuvable.'
      });
    }

    // Incrémenter view_count
    await query('UPDATE books SET view_count = view_count + 1 WHERE id::text = $1', [rows[0].id]);

    // Récupérer les avis
    const reviews = await query(`
      SELECT r.*, u.fullname AS user_fullname, u.city AS user_city, u.avatar_url
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.book_id = $1 AND r.is_approved = TRUE
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [rows[0].id]);

    // Livres similaires (même catégorie)
    const similar = await query(`
      SELECT id, legacy_id, title, author, cover_url, average_rating
      FROM books
      WHERE category_id = $1 AND id != $2
        AND deleted_at IS NULL AND is_active = TRUE
      ORDER BY average_rating DESC
      LIMIT 6
    `, [rows[0].category_id, rows[0].id]);

    res.json({
      success: true,
      data: {
        ...rows[0],
        reviews: reviews.rows,
        similar_books: similar.rows
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/books/:id/cover — Couverture via Google Books API
// C'est LA route qui résout le problème des images manquantes
exports.getBookCover = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      'SELECT isbn, isbn13, title, author, cover_url FROM books WHERE id::text = $1 OR legacy_id = $1',
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Livre introuvable.' });
    }

    const book = rows[0];

    // 1. Si on a déjà une URL de couverture en base → la retourner directement
    if (book.cover_url && book.cover_url.startsWith('http')) {
      return res.json({ success: true, coverUrl: book.cover_url });
    }

    // 2. Chercher via ISBN13 en priorité
    let coverUrl = null;
    if (book.isbn13) {
      coverUrl = await coversService.getCoverByISBN(book.isbn13);
    }

    // 3. Sinon via ISBN
    if (!coverUrl && book.isbn) {
      coverUrl = await coversService.getCoverByISBN(book.isbn);
    }

    // 4. Sinon via titre + auteur
    if (!coverUrl) {
      coverUrl = await coversService.getCoverByTitle(book.title, book.author);
    }

    // 5. URL directe Google Books (fallback garanti)
    if (!coverUrl && (book.isbn13 || book.isbn)) {
      coverUrl = coversService.getDirectCoverUrl(book.isbn13 || book.isbn);
    }

    // Sauvegarder en base pour éviter de refaire l'appel API
    if (coverUrl) {
      await query('UPDATE books SET cover_url = $1 WHERE id::text = $2', [coverUrl, rows[0].id]);
    }

    res.json({
      success: true,
      coverUrl: coverUrl || null,
      message: coverUrl ? 'Couverture trouvée' : 'Aucune couverture disponible'
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/books — Ajouter un livre (admin)
exports.createBook = async (req, res, next) => {
  try {
    const {
      legacy_id, title, author, category_id, isbn, isbn13,
      year, pages, language, format, summary, description,
      cover_url, publisher, tags, is_featured, is_new, total_copies
    } = req.body;

    // Si une image est uploadée
    let finalCoverUrl = cover_url;
    if (req.file) {
      finalCoverUrl = `/uploads/covers/${req.file.filename}`;
    }

    // Sinon récupérer automatiquement depuis Google Books
    if (!finalCoverUrl && (isbn || isbn13)) {
      finalCoverUrl = await coversService.getCoverByISBN(isbn13 || isbn)
                   || coversService.getDirectCoverUrl(isbn13 || isbn);
    }

    const { rows } = await query(`
      INSERT INTO books (
        legacy_id, title, author, category_id, isbn, isbn13,
        year, pages, language, format, summary, description,
        cover_url, publisher, tags, is_featured, is_new,
        total_copies, available_copies
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18)
      RETURNING *
    `, [
      legacy_id, title, author, category_id, isbn || null, isbn13 || null,
      year || null, pages || null, language || 'francais', format || 'pdf',
      summary, description || null, finalCoverUrl || null,
      publisher || null, tags || [], is_featured || false,
      is_new || false, total_copies || 3
    ]);

    // Mettre à jour le compteur de la catégorie
    await query(
      'UPDATE categories SET book_count = book_count + 1 WHERE id::text = $1',
      [category_id]
    );

    res.status(201).json({
      success: true,
      message: 'Livre ajouté avec succès.',
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/books/:id — Modifier un livre (admin)
exports.updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    if (req.file) {
      fields.cover_url = `/uploads/covers/${req.file.filename}`;
    }

    const setClauses = Object.keys(fields)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');

    const { rows } = await query(
      `UPDATE books SET ${setClauses}, updated_at = NOW() WHERE id::text = $1 RETURNING *`,
      [id, ...Object.values(fields)]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Livre introuvable.' });
    }

    res.json({ success: true, message: 'Livre mis à jour.', data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/books/:id — Soft delete (admin)
exports.deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(
      'UPDATE books SET deleted_at = NOW(), is_active = FALSE WHERE id::text = $1',
      [id]
    );
    res.json({ success: true, message: 'Livre supprimé.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/books/:id/read — Accès lecture (protégé)
// Connecté à : lire.html
exports.getBookContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      'SELECT id, title, file_url, preview_url, total_copies FROM books WHERE id::text = $1 OR legacy_id = $1',
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Livre introuvable.' });
    }

    // Vérifier que l'utilisateur a un emprunt actif
    const borrow = await query(`
      SELECT id FROM borrows
      WHERE user_id = $1 AND book_id = $2
        AND status IN ('en_cours', 'prolonge')
    `, [req.user.id, rows[0].id]);

    if (!borrow.rows[0] && req.user.user_type !== 'administrateur') {
      return res.status(403).json({
        success: false,
        message: 'Vous devez emprunter ce livre pour le lire.'
      });
    }

    res.json({
      success: true,
      data: {
        bookId: rows[0].id,
        title: rows[0].title,
        fileUrl: rows[0].file_url,    // URL PDF sécurisée
        previewUrl: rows[0].preview_url
      }
    });
  } catch (err) {
    next(err);
  }
};
