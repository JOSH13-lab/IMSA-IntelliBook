#!/usr/bin/env node
/**
 * ALL-IN-ONE FIX
 * Vérifie, remplit, et teste le système de couvertures
 * Usage: node all-in-one-fix.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'imsa_intellibook',
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

let stats = { total: 0, with_urls: 0, without_urls: 0, updated: 0 };

async function run() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║              🔥 ALL-IN-ONE FIX - Système de Couvertures             ║
║        Diagnostic complet + Remplissage + Vérification              ║
╚══════════════════════════════════════════════════════════════════════╝
  `);

  try {
    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: DIAGNOSTIC
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📊 PHASE 1: DIAGNOSTIC\n');

    const { rows: check } = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(cover_url) as with_urls,
        COUNT(CASE WHEN cover_url IS NULL OR cover_url = '' THEN 1 END) as without_urls
      FROM books 
      WHERE is_active = TRUE
    `);

    stats.total = parseInt(check[0].total);
    stats.with_urls = parseInt(check[0].with_urls);
    stats.without_urls = parseInt(check[0].without_urls);

    console.log(`   Total livres: ${stats.total}`);
    console.log(`   ✅ Avec URLs: ${stats.with_urls} (${(stats.with_urls/stats.total*100).toFixed(1)}%)`);
    console.log(`   ❌ Sans URLs: ${stats.without_urls} (${(stats.without_urls/stats.total*100).toFixed(1)}%)`);

    if (stats.with_urls === stats.total) {
      console.log('\n   ✅ Base complète! Pas besoin de remplir');
      console.log('   → Rafraîchir le navigateur (Ctrl+F5)\n');
      await pool.end();
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: REMPLISSAGE DES URLs
    // ═══════════════════════════════════════════════════════════════
    console.log('\n🔧 PHASE 2: REMPLISSAGE DES URLs\n');

    const { rows: books } = await pool.query(`
      SELECT id, legacy_id, isbn, isbn13, title
      FROM books 
      WHERE is_active = TRUE
      AND (cover_url IS NULL OR cover_url = '')
      ORDER BY legacy_id
    `);

    console.log(`   À traiter: ${books.length} livres\n`);

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      const isbn = book.isbn13 || book.isbn;

      let coverUrl;
      if (isbn) {
        coverUrl = `https://books.google.com/books/content?vid=ISBN:${isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
      } else {
        coverUrl = `https://books.google.com/books/content?q=intitle:${encodeURIComponent(book.title)}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
      }

      try {
        await pool.query(
          'UPDATE books SET cover_url = $1 WHERE id::text = $2',
          [coverUrl, book.id]
        );
        stats.updated++;

        if ((i + 1) % 50 === 0 || i === books.length - 1) {
          console.log(`   ✅ ${i + 1}/${books.length} traités (${((i+1)/books.length*100).toFixed(0)}%)`);
        }
      } catch (err) {
        console.log(`   ❌ Erreur pour ${book.legacy_id}: ${err.message}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: VÉRIFICATION
    // ═══════════════════════════════════════════════════════════════
    console.log('\n✅ PHASE 3: VÉRIFICATION\n');

    const { rows: verification } = await pool.query(`
      SELECT COUNT(*) as total, COUNT(cover_url) as with_urls
      FROM books 
      WHERE is_active = TRUE
    `);

    const finalTotal = parseInt(verification[0].total);
    const finalWithUrls = parseInt(verification[0].with_urls);

    console.log(`   Total: ${finalTotal}`);
    console.log(`   Avec URLs: ${finalWithUrls}/${finalTotal} (${(finalWithUrls/finalTotal*100).toFixed(1)}%)`);

    // Afficher quelques exemples
    console.log('\n   📋 Exemples d\'URLs créées:');
    const { rows: examples } = await pool.query(`
      SELECT legacy_id, title, cover_url
      FROM books 
      WHERE is_active = TRUE
      AND cover_url IS NOT NULL
      LIMIT 3
    `);

    examples.forEach((ex, i) => {
      console.log(`   ${i+1}. ${ex.legacy_id}`);
      console.log(`      ${ex.cover_url.substring(0, 80)}...`);
    });

    // ═══════════════════════════════════════════════════════════════
    // PHASE 4: RÉSUMÉ ET PROCHAINES ÉTAPES
    // ═══════════════════════════════════════════════════════════════
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                            📊 RÉSUMÉ                                ║
╚══════════════════════════════════════════════════════════════════════╝

  ✅ Avant:  ${stats.with_urls} URLs / ${stats.total} livres
  ✅ Après:  ${finalWithUrls} URLs / ${finalTotal} livres
  ✅ Mises à jour: ${stats.updated}

  ${finalWithUrls === finalTotal ? '🎉 SUCCÈS! BASE COMPLÈTE!' : '⚠️  ' + (finalTotal - finalWithUrls) + ' livres sans URL'}

╔══════════════════════════════════════════════════════════════════════╗
║                       📲 PROCHAINES ÉTAPES                         ║
╚══════════════════════════════════════════════════════════════════════╝

  1️⃣  NAVIGATEUR:
     Appuyer sur: Ctrl + Shift + Delete (vider le cache)
     Puis: Ctrl + F5 (rafraîchir)

  2️⃣  LES COUVERTURES DEVRAIENT S'AFFICHER! ✨

  Si ça ne marche pas:
     → Fermer complètement le navigateur
     → Rouvrir: http://localhost:5500/index.html
     → Attendre 3 secondes pour le chargement

═══════════════════════════════════════════════════════════════════════
    `);

  } catch (err) {
    console.error('\n❌ ERREUR CRITIQUE:', err.message);
    console.error('\n📋 Vérifier:');
    console.error('   1. PostgreSQL est en cours d\'exécution');
    console.error('   2. Les crédentials dans .env sont corrects');
    console.error('   3. La base imsa_intellibook existe');
  } finally {
    await pool.end();
  }
}

run();
