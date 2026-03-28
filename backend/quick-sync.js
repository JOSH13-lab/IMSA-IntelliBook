#!/usr/bin/env node
// QUICK SYNC - Récupère les couvertures rapidement avec Google Direct

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'imsa_intellibook',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function quickSync() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║      QUICK SYNC - Google Direct URLs (Rapide & Garanti)   ║
╚════════════════════════════════════════════════════════════╝
  `);

  try {
    // Récupérer les livres sans couverture mais avec ISBN
    console.log('\n📚 Récupération des livres sans couverture...');
    const { rows: books } = await pool.query(`
      SELECT id, legacy_id, isbn, isbn13, title
      FROM books 
      WHERE is_active = TRUE 
      AND (cover_url IS NULL OR cover_url = '')
      AND (isbn13 IS NOT NULL OR isbn IS NOT NULL)
      ORDER BY legacy_id
    `);

    console.log(`   Trouvé: ${books.length} livres à traiter\n`);

    if (books.length === 0) {
      console.log('✅ Tous les livres ont une couverture!');
      await pool.end();
      return;
    }

    // Générer les URLs Google Direct pour chacun
    console.log('🔄 Génération des URLs Google Direct...\n');

    let updated = 0;
    for (const book of books) {
      const isbn = book.isbn13 || book.isbn;
      if (!isbn) continue;

      const coverUrl = `https://books.google.com/books/content?vid=ISBN:${isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;

      try {
        await pool.query(
          'UPDATE books SET cover_url = $1 WHERE id::text = $2',
          [coverUrl, book.id]
        );
        updated++;
        console.log(`   ✅ ${book.legacy_id}: ${book.title}`);
      } catch (err) {
        console.log(`   ❌ ${book.legacy_id}: ${err.message}`);
      }
    }

    console.log(`\n📊 Résultats:`);
    console.log(`   ✅ Mises à jour: ${updated}/${books.length}`);
    console.log(`\n💡 Les couvertures vont se charger depuis Google Direct`);
    console.log(`   Rafraîchir le navigateur (Ctrl+F5) pour voir les changements`);

  } catch (err) {
    console.error('❌ ERREUR:', err.message);
  } finally {
    await pool.end();
  }
}

quickSync();
