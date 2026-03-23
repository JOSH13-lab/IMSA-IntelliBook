/**
 * SCRIPT DE RÉCUPÉRATION DES COUVERTURES
 * IMSA IntelliBook — Backend
 * 
 * Ce script parcourt tous les livres de la base de données,
 * récupère la "vraie" URL de couverture via l'API Google Books,
 * et met à jour la base de données.
 * 
 * Usage : node backend/scripts/update-covers.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query, pool } = require('../config/db');
const coversService = require('../services/covers.service');

// Petit délai pour éviter de se faire bannir par l'API Google (Rate Limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updateAllCovers() {
  console.log('\n🚀 Lancement de la mise à jour des couvertures...');
  console.log('═'.repeat(60));

  try {
    // 1. Récupérer tous les livres actifs
    const { rows: books } = await query(
      'SELECT id, legacy_id, title, author, isbn, isbn13 FROM books WHERE deleted_at IS NULL AND is_active = TRUE'
    );

    console.log(`📚 ${books.length} livres trouvés en base.`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const book of books) {
      process.stdout.write(`📖 Traitement : [${book.legacy_id}] ${book.title}... `);

      try {
        let coverUrl = null;

        // Tenter par ISBN13
        if (book.isbn13) {
          coverUrl = await coversService.getCoverByISBN(book.isbn13);
        }

        // Tenter par ISBN si pas trouvé
        if (!coverUrl && book.isbn) {
          coverUrl = await coversService.getCoverByISBN(book.isbn);
        }

        // Tenter par Titre + Auteur si pas trouvé
        if (!coverUrl) {
          coverUrl = await coversService.getCoverByTitle(book.title, book.author);
        }

        // Fallback : URL directe Google Books (si on a un ISBN)
        if (!coverUrl && (book.isbn13 || book.isbn)) {
          coverUrl = coversService.getDirectCoverUrl(book.isbn13 || book.isbn);
        }

        if (coverUrl) {
          // Mettre à jour en base
          await query(
            'UPDATE books SET cover_url = $1, updated_at = NOW() WHERE id = $2',
            [coverUrl, book.id]
          );
          console.log('✅ MAJ OK');
          updatedCount++;
        } else {
          console.log('⚠️  Non trouvé');
          skippedCount++;
        }

        // Attendre un peu pour respecter le rate limit (200ms)
        await delay(200);

      } catch (err) {
        console.log(`❌ Erreur : ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('🏁 RÉSUMÉ DE L\'OPÉRATION');
    console.log('═'.repeat(60));
    console.log(`✅ Mis à jour : ${updatedCount}`);
    console.log(`⚠️  Ignorés     : ${skippedCount}`);
    console.log(`❌ Erreurs     : ${errorCount}`);
    console.log(`📊 Total       : ${books.length}`);
    console.log('═'.repeat(60) + '\n');

  } catch (err) {
    console.error('💥 Erreur fatale lors de la mise à jour :', err.message);
  } finally {
    // Fermer le pool de connexion
    await pool.end();
  }
}

// Lancer le script
updateAllCovers();
