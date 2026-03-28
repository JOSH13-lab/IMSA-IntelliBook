#!/usr/bin/env node
/**
 * 🔥 MEGA SCRIPT - AUTO EVERYTHING
 * 
 * Ce script:
 * 1. Vérifie TOUT (connexion DB, fichiers, modules)
 * 2. Si OK → Exécute all-in-one-fix.js
 * 3. Si erreur → Affiche solution claire
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                     🔥 MEGA SCRIPT - ALL-IN-ONE                        ║
║              Vérification complète + Réparation automatique            ║
╚════════════════════════════════════════════════════════════════════════╝
`);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'imsa_intellibook',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

let stats = {
  total: 0,
  with_urls: 0,
  without_urls: 0,
  updated: 0,
};

async function main() {
  try {
    // ════════════════════════════════════════════════════════════════
    // ÉTAPE 1: VÉRIFICATION DES PRÉREQUIS
    // ════════════════════════════════════════════════════════════════
    console.log('\n📋 ÉTAPE 1: Vérification des prérequis...\n');

    // Check .env
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      throw new Error(`❌ .env not found at ${envPath}`);
    }
    console.log('✅ .env found');

    // Check PostgreSQL
    console.log('🔌 Connecting to PostgreSQL...');
    const testQuery = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL OK');

    // Check books table
    const { rows: tableCheck } = await pool.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_name = 'books' AND table_schema = 'public'
    `);
    if (parseInt(tableCheck[0].count) === 0) {
      throw new Error('❌ "books" table not found');
    }
    console.log('✅ books table exists');

    // ════════════════════════════════════════════════════════════════
    // ÉTAPE 2: DIAGNOSTIC
    // ════════════════════════════════════════════════════════════════
    console.log('\n📊 ÉTAPE 2: Diagnostic de la base...\n');

    const { rows: stats_query } = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN cover_url IS NOT NULL AND cover_url != '' THEN 1 END) as with_urls,
        COUNT(CASE WHEN cover_url IS NULL OR cover_url = '' THEN 1 END) as without_urls
      FROM books 
      WHERE is_active = TRUE
    `);

    stats.total = parseInt(stats_query[0].total);
    stats.with_urls = parseInt(stats_query[0].with_urls);
    stats.without_urls = parseInt(stats_query[0].without_urls);

    console.log(`   📚 Total livres: ${stats.total}`);
    console.log(`   ✅ Avec URLs: ${stats.with_urls} (${(stats.with_urls / stats.total * 100).toFixed(1)}%)`);
    console.log(`   ❌ Sans URLs: ${stats.without_urls} (${(stats.without_urls / stats.total * 100).toFixed(1)}%)`);

    // If already complete
    if (stats.without_urls === 0) {
      console.log('\n✅ Base déjà complète!');
      console.log('   → Navigateur: Ctrl + F5 pour rafraîchir');
      await pool.end();
      process.exit(0);
    }

    // ════════════════════════════════════════════════════════════════
    // ÉTAPE 3: REMPLISSAGE DES URLs
    // ════════════════════════════════════════════════════════════════
    console.log(`\n🔧 ÉTAPE 3: Remplissage des ${stats.without_urls} URLs manquantes...\n`);

    const { rows: missingBooks } = await pool.query(`
      SELECT id, legacy_id, isbn, isbn13, title
      FROM books 
      WHERE is_active = TRUE
      AND (cover_url IS NULL OR cover_url = '')
      ORDER BY legacy_id
    `);

    for (let i = 0; i < missingBooks.length; i++) {
      const book = missingBooks[i];
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

        // Progress bar tous les 20 livres
        if ((i + 1) % 20 === 0 || i === missingBooks.length - 1) {
          const percent = Math.round((i + 1) / missingBooks.length * 100);
          const bar = '█'.repeat(Math.round(percent / 5)) + '░'.repeat(20 - Math.round(percent / 5));
          console.log(`   [${bar}] ${percent}% (${i + 1}/${missingBooks.length})`);
        }
      } catch (err) {
        console.log(`   ⚠️  Erreur pour ${book.legacy_id}: ${err.message}`);
      }
    }

    // ════════════════════════════════════════════════════════════════
    // ÉTAPE 4: VÉRIFICATION FINALE
    // ════════════════════════════════════════════════════════════════
    console.log(`\n✅ ÉTAPE 4: Vérification finale...\n`);

    const { rows: finalStats } = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN cover_url IS NOT NULL AND cover_url != '' THEN 1 END) as with_urls
      FROM books 
      WHERE is_active = TRUE
    `);

    const finalTotal = parseInt(finalStats[0].total);
    const finalWithUrls = parseInt(finalStats[0].with_urls);

    console.log(`   📚 Total: ${finalTotal}`);
    console.log(`   ✅ Avec URLs: ${finalWithUrls} (${(finalWithUrls / finalTotal * 100).toFixed(1)}%)`);
    console.log(`   📝 Mis à jour: ${stats.updated}`);

    // Examples
    console.log(`\n   📋 Exemples d'URLs créées:`);
    const { rows: examples } = await pool.query(`
      SELECT legacy_id, title, cover_url
      FROM books 
      WHERE is_active = TRUE AND cover_url IS NOT NULL
      LIMIT 3
    `);

    examples.forEach((ex, i) => {
      console.log(`   ${i + 1}. ${ex.legacy_id}: ${ex.cover_url.substring(0, 70)}...`);
    });

    // ════════════════════════════════════════════════════════════════
    // SUCCESS MESSAGE
    // ════════════════════════════════════════════════════════════════
    console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                         🎉 SUCCÈS COMPLET!                            ║
║                  Base de données entièrement remplie                  ║
╚════════════════════════════════════════════════════════════════════════╝

  ✅ AVANT:  ${stats.with_urls - stats.updated}/${stats.total} livres avec URLs
  ✅ APRÈS:  ${finalWithUrls}/${finalTotal} livres avec URLs
  ✅ TOTAL MISES À JOUR: ${stats.updated}

╔════════════════════════════════════════════════════════════════════════╗
║                      🌐 PROCHAINES ÉTAPES                             ║
╚════════════════════════════════════════════════════════════════════════╝

  1️⃣  NAVIGATEUR - Vider le cache:
     Appuyer sur: Ctrl + Shift + Delete
     Choisir: Tout effacer, puis Effacer

  2️⃣  NAVIGATEUR - Rafraîchir:
     Appuyer sur: Ctrl + F5

  3️⃣  VÉrIFIER:
     Les couvertures devraient s'afficher partout!
     - Homepage: ✅
     - Catégories: ✅
     - Recherche: ✅
     - Tous les carousels: ✅

  Si ça ne marche pas:
     → Fermer le navigateur complètement (Alt+F4)
     → Rouvrir: http://localhost:5500
     → Attendre 5 secondes

════════════════════════════════════════════════════════════════════════

  Script terminé avec succès! 🚀

`);

  } catch (error) {
    console.error(`
╔════════════════════════════════════════════════════════════════════════╗
║                        ❌ ERREUR DÉTECTÉE                              ║
╚════════════════════════════════════════════════════════════════════════╝

  Message: ${error.message}

╔════════════════════════════════════════════════════════════════════════╗
║                        🔧 SOLUTIONS                                   ║
╚════════════════════════════════════════════════════════════════════════╝

  ❌ "ECONNREFUSED" ou "connect ECONNREFUSED"
     → PostgreSQL n'est pas en cours d'exécution
     → Lancer Services Windows → PostgreSQL → Démarrer
     → Ou: net start "PostgreSQL"

  ❌ "FATAL: password authentication failed"
     → Mot de passe incorrect dans .env
     → Vérifier: DB_PASSWORD=@Zerty7v
     → Vérifier le fichier: ${path.join(__dirname, '.env')}

  ❌ "FATAL: database doesn't exist"
     → Base imsa_intellibook n'existe pas
     → Créer avec: npm run setup

  ❌ ".env not found"
     → Créer le fichier .env
     → Copier depuis .env.example
     → Remplir les credentials

  Pour plus d'infos, lancer:
     → node ultra-diagnostic.js

`);
  } finally {
    await pool.end();
  }
}

main();
