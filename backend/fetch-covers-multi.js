// ════════════════════════════════════════════════════════════════════
// SCRIPT — Récupération des couvertures via APIs Multiples
// IMSA IntelliBook
// Usage : node fetch-covers-multi.js [--dry-run] [--limit 10]
// ════════════════════════════════════════════════════════════════════

require('dotenv').config();
const { Pool } = require('pg');
const coversService = require('./services/covers.service');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'imsa_intellibook',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Parser les arguments de ligne de commande
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null;

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     🖼️  Récupération des Couvertures - Mode Multi-API          ║
║     IMSA IntelliBook                                           ║
╠════════════════════════════════════════════════════════════════╣
║ Sources : Google Books + Open Library + Fallbacks             ║
║ Mode    : ${isDryRun ? '🔍 DRY-RUN (pas de mise à jour en BD)' : '💾 PRODUCTION (sauvegarde en BD)'}                  ║
${limit ? `║ Limite  : ${limit} livres` : '║ Limite  : aucune'}
╚════════════════════════════════════════════════════════════════╝
`);

async function fetchAllCovers() {
  try {
    // Récupérer tous les livres actifs
    let query = `
      SELECT id, legacy_id, isbn, isbn13, title, author, cover_url
      FROM books
      WHERE is_active = TRUE
      ORDER BY legacy_id
    `;
    if (limit) query += ` LIMIT ${limit}`;

    const { rows: books } = await pool.query(query);
    console.log(`📚 Total: ${books.length} livres à traiter\n`);

    if (books.length === 0) {
      console.log('✅ Aucun livre à traiter');
      await pool.end();
      return;
    }

    let stats = {
      total: books.length,
      cached: 0,        // Avaient déjà une couverture
      google_books: 0,  // Trouvée via Google Books
      open_library: 0,  // Trouvée via Open Library
      google_direct: 0, // Fallback Google Direct
      failed: 0,        // Introuvables
      errors: 0         // Erreurs API
    };

    // Préparer les livres pour le batch
    const booksForFetch = books.map(b => ({
      id: b.id,
      legacy_id: b.legacy_id,
      isbn: b.isbn13 || b.isbn,
      title: b.title,
      author: b.author,
      currentCoverUrl: b.cover_url
    }));

    // Récupérer les couvertures en batch (5 à la fois pour éviter de surcharger)
    const BATCH_SIZE = 5;
    for (let i = 0; i < booksForFetch.length; i += BATCH_SIZE) {
      const batch = booksForFetch.slice(i, i + BATCH_SIZE);
      console.log(`\n📖 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(booksForFetch.length / BATCH_SIZE)}`);
      console.log(`   Traitement des livres ${i + 1} à ${Math.min(i + BATCH_SIZE, booksForFetch.length)}...`);

      const results = await coversService.getCoversBatch(batch);

      // Traiter les résultats
      for (const result of results) {
        const bookData = batch.find(b => b.isbn === result.isbn);
        const book = books.find(b => b.id === bookData.id);

        process.stdout.write(`   ${bookData.legacy_id.padEnd(15)} — ${bookData.title.substring(0, 35).padEnd(35)} `);

        if (book.cover_url && book.cover_url.startsWith('http')) {
          process.stdout.write(`✅ EN CACHE\n`);
          stats.cached++;
        } else if (result.result) {
          const source = result.result.source;
          process.stdout.write(`✅ ${source.toUpperCase()}\n`);
          stats[source]++;

          if (!isDryRun) {
            await pool.query(
              'UPDATE books SET cover_url = $1, updated_at = NOW() WHERE id = $2',
              [result.result.url, bookData.id]
            );
          }
        } else if (result.error) {
          process.stdout.write(`❌ ERREUR: ${result.error.substring(0, 30)}\n`);
          stats.errors++;
        } else {
          process.stdout.write(`⚠️  NON TROUVÉE\n`);
          stats.failed++;
        }
      }
    }

    // Rapport final
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║                    📊 RAPPORT FINAL                            ║`);
    console.log(`╠════════════════════════════════════════════════════════════════╣`);
    console.log(`║ Total traité       : ${String(stats.total).padStart(6)}                                 ║`);
    console.log(`║ En cache (BD)      : ${String(stats.cached).padStart(6)}  ✅                            ║`);
    console.log(`║ Google Books       : ${String(stats.google_books).padStart(6)}  🔍                            ║`);
    console.log(`║ Open Library       : ${String(stats.open_library).padStart(6)}  📖                            ║`);
    console.log(`║ Google Direct      : ${String(stats.google_direct).padStart(6)}  🌐                            ║`);
    console.log(`║ Non trouvées       : ${String(stats.failed).padStart(6)}  ⚠️                             ║`);
    console.log(`║ Erreurs API        : ${String(stats.errors).padStart(6)}  ❌                             ║`);
    console.log(`╠════════════════════════════════════════════════════════════════╣`);
    console.log(`║ Taux de succès : ${(((stats.google_books + stats.open_library + stats.google_direct + stats.cached) / stats.total * 100).toFixed(1)).padStart(6)}%                             ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝`);

    if (isDryRun) {
      console.log(`\n⚠️  MODE DRY-RUN : Aucune mise à jour en base de données\n`);
    } else {
      console.log(`\n✅ Mise à jour complète ! Relancez le serveur:\n   npm run dev\n`);
    }

    // Afficher quelques exemples
    console.log(`\n📋 Exemples de couvertures mises à jour :`);
    const { rows: samples } = await pool.query(`
      SELECT legacy_id, title, cover_url
      FROM books
      WHERE is_active = TRUE AND cover_url IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 5
    `);

    if (samples.length > 0) {
      samples.forEach((b, idx) => {
        console.log(`\n  ${idx + 1}. ${b.legacy_id} — ${b.title}`);
        console.log(`     🔗 ${b.cover_url.substring(0, 80)}...`);
      });
    }

    await pool.end();
  } catch (err) {
    console.error('\n💥 Erreur fatale :', err.message);
    console.error(err);
    await pool.end();
    process.exit(1);
  }
}

fetchAllCovers();
