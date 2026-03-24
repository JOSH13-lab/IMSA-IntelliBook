// ============================================================
//  SCRIPT — Mise à jour des couvertures dans PostgreSQL
//  IMSA IntelliBook
//  Usage : node update-covers.js
// ============================================================

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'imsa_intellibook',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

// ── Générer la meilleure URL de couverture pour un ISBN ──
function getCoverUrl(isbn, title, author) {
  if (!isbn) {
    // Pas d'ISBN → recherche par titre/auteur Google Books
    const q = encodeURIComponent(`${title} ${author}`);
    return `https://books.google.com/books/content?q=${q}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
  }
  // ISBN disponible → URL directe Google Books (la plus fiable)
  return `https://books.google.com/books/content?vid=ISBN:${isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
}

async function updateCovers() {
  console.log('\n🖼️  Mise à jour des couvertures — IMSA IntelliBook');
  console.log('═'.repeat(50));

  // Récupérer tous les livres
  const { rows: books } = await pool.query(`
    SELECT id, legacy_id, title, author, isbn, cover_url
    FROM books
    WHERE is_active = TRUE
    ORDER BY legacy_id
  `);

  console.log(`📚 ${books.length} livres à traiter...\n`);

  let updated = 0;
  let skipped = 0;

  for (const book of books) {
    const newCoverUrl = getCoverUrl(book.isbn, book.title, book.author);

    // Mettre à jour uniquement si l'URL a changé
    if (book.cover_url !== newCoverUrl) {
      await pool.query(
        'UPDATE books SET cover_url = $1, updated_at = NOW() WHERE id = $2',
        [newCoverUrl, book.id]
      );
      console.log(`✅ ${book.legacy_id} — ${book.title}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Mis à jour : ${updated} livres`);
  console.log(`⏭️  Inchangés  : ${skipped} livres`);
  console.log('═'.repeat(50));

  // Vérification — afficher 5 exemples
  console.log('\n📋 Exemples de couvertures en base :');
  const { rows: samples } = await pool.query(`
    SELECT legacy_id, title, cover_url
    FROM books
    ORDER BY legacy_id
    LIMIT 5
  `);

  samples.forEach(b => {
    console.log(`\n  📖 ${b.legacy_id} — ${b.title}`);
    console.log(`     🔗 ${b.cover_url}`);
  });

  console.log('\n✅ Terminé ! Relance le serveur : npm run dev');
  console.log('═'.repeat(50) + '\n');

  await pool.end();
}

updateCovers().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
