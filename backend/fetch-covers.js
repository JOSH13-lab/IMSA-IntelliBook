// ============================================================
//  SCRIPT — Récupération des vraies couvertures via Google Books API
//  IMSA IntelliBook
//  Usage : node fetch-covers.js
//
//  Ce script interroge l'API JSON de Google Books pour trouver
//  la vraie URL de couverture de chaque livre en base.
//  Sans cette étape, Google retourne "image not available".
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

// Délai entre les requêtes pour eviter le rate-limiting Google
const DELAY_MS = 300;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Interroge l'API JSON Google Books et retourne la meilleure URL de couverture.
 * Retourne null si aucune couverture trouvée.
 */
async function fetchCoverFromGoogle(title, author, isbn = null) {
  try {
    // Stratégie 1 : recherche par ISBN (la plus précise)
    if (isbn) {
      const isbnUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1&fields=items(volumeInfo(imageLinks))`;
      const res = await fetch(isbnUrl);
      if (res.ok) {
        const data = await res.json();
        const img = data?.items?.[0]?.volumeInfo?.imageLinks;
        if (img) {
          // Priorité : extraLarge > large > medium > thumbnail
          const url = img.extraLarge || img.large || img.medium || img.thumbnail || img.smallThumbnail;
          if (url) {
            // Forcer HTTPS et zoom=1 pour meilleure qualité
            return url.replace('http://', 'https://').replace('&zoom=1', '').replace('zoom=5', 'zoom=1') + '&zoom=1';
          }
        }
      }
    }

    // Stratégie 2 : recherche par titre + auteur
    const q = `${title} ${author}`.trim();
    const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=3&fields=items(volumeInfo(title,authors,imageLinks))&langRestrict=fr`;
    const res2 = await fetch(searchUrl);
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2?.items?.length > 0) {
        // Chercher la meilleure correspondance par titre
        for (const item of data2.items) {
          const img = item?.volumeInfo?.imageLinks;
          if (img) {
            const url = img.extraLarge || img.large || img.medium || img.thumbnail || img.smallThumbnail;
            if (url) {
              return url.replace('http://', 'https://').replace('&zoom=1', '') + '&zoom=1';
            }
          }
        }
      }
    }

    // Stratégie 3 : recherche sans restriction de langue
    const searchUrl2 = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=5&fields=items(volumeInfo(title,authors,imageLinks))`;
    const res3 = await fetch(searchUrl2);
    if (res3.ok) {
      const data3 = await res3.json();
      if (data3?.items?.length > 0) {
        for (const item of data3.items) {
          const img = item?.volumeInfo?.imageLinks;
          if (img) {
            const url = img.extraLarge || img.large || img.medium || img.thumbnail || img.smallThumbnail;
            if (url) {
              return url.replace('http://', 'https://').replace('&zoom=1', '') + '&zoom=1';
            }
          }
        }
      }
    }

    return null;
  } catch (err) {
    console.error(`  ⚠️  Erreur réseau pour "${title}" :`, err.message);
    return null;
  }
}

async function fetchCovers() {
  console.log('\n🖼️  Récupération des couvertures via Google Books JSON API');
  console.log('═'.repeat(60));
  console.log('⏱️  Délai entre requêtes : ' + DELAY_MS + 'ms (pour éviter le blocage)\n');

  const { rows: books } = await pool.query(`
    SELECT id, legacy_id, title, author, isbn, cover_url
    FROM books
    WHERE is_active = TRUE
    ORDER BY legacy_id
  `);

  console.log(`📚 ${books.length} livres à traiter...\n`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const book of books) {
    process.stdout.write(`  🔍 ${book.legacy_id} — ${book.title.substring(0, 40).padEnd(40)} `);

    const newCoverUrl = await fetchCoverFromGoogle(book.title, book.author, book.isbn);

    if (newCoverUrl && newCoverUrl !== book.cover_url) {
      await pool.query(
        'UPDATE books SET cover_url = $1, updated_at = NOW() WHERE id = $2',
        [newCoverUrl, book.id]
      );
      process.stdout.write(`✅ Couverture trouvée\n`);
      updated++;
    } else if (!newCoverUrl) {
      // Fallback : utiliser une URL de format open library si Google échoue
      const openLibUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn || ''}-L.jpg`;
      process.stdout.write(`⚠️  Non trouvé sur Google\n`);
      notFound++;
    } else {
      process.stdout.write(`⏭️  Inchangé\n`);
    }

    await sleep(DELAY_MS);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Mis à jour  : ${updated} livres`);
  console.log(`⚠️  Non trouvés : ${notFound} livres`);
  console.log(`❌ Erreurs     : ${errors}`);
  console.log('═'.repeat(60));

  // Aperçu des résultats
  console.log('\n📋 Exemples de couvertures mises à jour :');
  const { rows: samples } = await pool.query(`
    SELECT legacy_id, title, cover_url
    FROM books
    WHERE cover_url NOT LIKE '%books.google.com/books/content?q=%'
      AND is_active = TRUE
    ORDER BY legacy_id
    LIMIT 10
  `);

  if (samples.length === 0) {
    console.log('  (Aucun livre avec couverture mise à jour via l\'API JSON)');
  } else {
    samples.forEach(b => {
      console.log(`\n  📖 ${b.legacy_id} — ${b.title}`);
      console.log(`     🔗 ${b.cover_url}`);
    });
  }

  console.log('\n✅ Terminé ! Relance le serveur : npm run dev');
  console.log('   Puis recharge le site pour voir les couvertures.\n');

  await pool.end();
}

fetchCovers().catch(err => {
  console.error('\n💥 Erreur fatale :', err.message);
  process.exit(1);
});
