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
    let coverData = null;
    if (book.isbn13) {
      coverData = await coversService.getCoverByISBN(book.isbn13, book.title, book.author);
    }

    // 3. Sinon via ISBN
    if (!coverData && book.isbn) {
      coverData = await coversService.getCoverByISBN(book.isbn, book.title, book.author);
    }

    // 4. Sinon via titre + auteur
    if (!coverData) {
      coverData = await coversService.getCoverByTitle(book.title, book.author);
    }

    let coverUrl = coverData?.url || null;

    // Sauvegarder en base pour éviter de refaire l'appel API
    if (coverUrl) {
      await query('UPDATE books SET cover_url = $1 WHERE id::text = $2', [coverUrl, rows[0].id]);
    }

    res.json({
      success: true,
      coverUrl: coverUrl || null,
      source: coverData?.source || null,
      message: coverUrl ? 'Couverture trouvée' : 'Aucune couverture disponible'
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/books/batch/covers — Récupérer plusieurs couvertures en une requête
// Endpoint optimisé pour charger les couvertures d'une liste de livres
// Body: { books: [ { id, isbn, isbn13, title, author }, ... ] }
exports.getBooksCoversBatch = async (req, res, next) => {
  try {
    const { bookIds } = req.body;

    if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un tableau de book IDs: { bookIds: ["id1", "id2", ...] }'
      });
    }

    // Limiter à 50 livres par requête
    if (bookIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 livres par requête'
      });
    }

    // Récupérer les livres depuis la BD
    const placeholders = bookIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows: books } = await query(
      `SELECT id, legacy_id, isbn, isbn13, title, author, cover_url FROM books 
       WHERE id::text IN (${placeholders}) OR legacy_id IN (${placeholders})`,
      [...bookIds, ...bookIds]
    );

    if (books.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun livre trouvé'
      });
    }

    // Préparer les requêtes pour le service de couvertures
    const booksToFetch = books
      .filter(b => !b.cover_url || !b.cover_url.startsWith('http'))
      .map(b => ({
        id: b.id,
        isbn: b.isbn13 || b.isbn,
        title: b.title,
        author: b.author
      }));

    // Récupérer les couvertures en parallèle
    let results = [];
    if (booksToFetch.length > 0) {
      results = await coversService.getCoversBatch(booksToFetch);
    }

    // Construire la réponse
    const response = {
      success: true,
      total: books.length,
      covers: []
    };

    for (const book of books) {
      // Si on a déjà une URL en base
      if (book.cover_url && book.cover_url.startsWith('http')) {
        response.covers.push({
          id: book.id,
          legacy_id: book.legacy_id,
          coverUrl: book.cover_url,
          source: 'cached',
          cached: true
        });
      } else {
        // Sinon chercher dans les résultats du batch
        const result = results.find(r => r.isbn === (book.isbn13 || book.isbn));
        if (result?.result) {
          const coverUrl = result.result.url;
          // Sauvegarder en base pour les prochaines fois
          await query('UPDATE books SET cover_url = $1 WHERE id::text = $2', [coverUrl, book.id]);

          response.covers.push({
            id: book.id,
            legacy_id: book.legacy_id,
            coverUrl: coverUrl,
            source: result.result.source,
            quality: result.result.quality,
            cached: false
          });
        } else {
          response.covers.push({
            id: book.id,
            legacy_id: book.legacy_id,
            coverUrl: null,
            source: null,
            cached: false
          });
        }
      }
    }

    res.json(response);
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

// GET /api/books/:id/read — DEPRECATED: Use reading.controller.js instead
// This function is kept for reference only and is NOT exported
// All routes now use reading.controller.js getBookContent
const _getBookContentDeprecated = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT id, title, author, file_url, preview_url, total_copies, 
              cover_url, legacy_id
       FROM books WHERE id::text = $1 OR legacy_id = $1
       AND is_active = TRUE`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Livre introuvable.' });
    }

    const book = rows[0];

    // Vérifier que l'utilisateur a un emprunt actif (sauf admin)
    if (req.user.user_type !== 'administrateur') {
      const borrow = await query(`
        SELECT id FROM borrows
        WHERE user_id = $1 AND book_id = $2
          AND status IN ('en_cours', 'prolonge')
      `, [req.user.id, book.id]);

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
