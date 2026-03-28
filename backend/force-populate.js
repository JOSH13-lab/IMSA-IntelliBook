#!/usr/bin/env node
// FORCE POPULATE - Crée les URLs de couvertures directement (garantie 100%)

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'imsa_intellibook',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function forcePopulate() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   FORCE POPULATE - Remplir TOUS les cover_url (GARANTIE)  ║
║   Utilise Google Direct URL pour 100% de couverture       ║
╚════════════════════════════════════════════════════════════╝
  `);

  try {
    // Récupérer TOUS les livres actifs
    console.log('\n📚 Récupération de tous les livres actifs...');
    const { rows: books } = await pool.query(`
      SELECT id, legacy_id, isbn, isbn13, title, author
      FROM books 
      WHERE is_active = TRUE
      ORDER BY legacy_id
    `);

    console.log(`   Trouvé: ${books.length} livres\n`);

    let updated = 0;
    let skipped = 0;

    console.log('🔄 Génération des URLs...\n');

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      const isbn = book.isbn13 || book.isbn;

      if (!isbn) {
        console.log(`   ⚠️  ${book.legacy_id}: Pas d'ISBN, URL générée par titre`);
        const searchUrl = `https://books.google.com/books/content?q=intitle:${encodeURIComponent(book.title)}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
        try {
          await pool.query(
            'UPDATE books SET cover_url = $1 WHERE id::text = $2',
            [searchUrl, book.id]
          );
          updated++;
        } catch (err) {
          console.log(`      ❌ Erreur: ${err.message}`);
          skipped++;
        }
        continue;
      }

      // ISBN-based URL (meilleur fallback)
      const coverUrl = `https://books.google.com/books/content?vid=ISBN:${isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;

      try {
        await pool.query(
          'UPDATE books SET cover_url = $1 WHERE id::text = $2',
          [coverUrl, book.id]
        );
        updated++;
        
        if ((i + 1) % 20 === 0) {
          console.log(`   ✅ ${i + 1}/${books.length} traités...`);
        }
      } catch (err) {
        console.log(`   ❌ ${book.legacy_id}: ${err.message}`);
        skipped++;
      }
    }

    console.log(`\n📊 RÉSULTATS:`);
    console.log(`   ✅ Mises à jour: ${updated}/${books.length}`);
    console.log(`   ⚠️  Erreurs: ${skipped}`);

    // Vérifier que tout a marché
    const { rows: verification } = await pool.query(`
      SELECT COUNT(*), COUNT(cover_url) FROM books WHERE is_active = TRUE
    `);
    const withUrls = verification[0].count_1;
    const total = verification[0].count;

    console.log(`\n✅ VÉRIFICATION:`);
    console.log(`   ${withUrls}/${total} livres ont maintenant une couverture URL`);
    console.log(`   Taux: ${(withUrls/total*100).toFixed(1)}%`);

    if (withUrls === total) {
      console.log(`\n🎉 SUCCÈS! TOUS les livres ont une URL de couverture!`);
      console.log(`\n📲 Prochaine étape:`);
      console.log(`   1. Rafraîchir le navigateur (Ctrl+F5)`);
      console.log(`   2. Les couvertures devraient s'afficher!\n`);
    } else {
      console.log(`\n⚠️  ${total - withUrls} livres n'ont pas d'URL`);
    }

  } catch (err) {
    console.error('❌ ERREUR CRITIQUE:', err.message);
  } finally {
    await pool.end();
  }
}

forcePopulate();
