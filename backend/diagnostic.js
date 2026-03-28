// SCRIPT DE DIAGNOSTIC - Node.js
// Utilisation: node diagnostic.js

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'imsa_intellibook',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function diagnose() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        DIAGNOSTIC DES COUVERTURES DE LIVRES               ║
║        Vérification complète de la base de données         ║
╚════════════════════════════════════════════════════════════╝
  `);

  try {
    // 1. Vérifier la connexion
    console.log('1️⃣  Test de connexion à la base...');
    const connTest = await pool.query('SELECT 1');
    console.log('   ✅ Connexion OK\n');

    // 2. Compter les livres
    console.log('2️⃣  Statistiques des livres:');
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(cover_url) as avec_cover,
        COUNT(CASE WHEN cover_url IS NULL THEN 1 END) as sans_cover,
        COUNT(CASE WHEN isbn IS NULL OR isbn = '' THEN 1 END) as sans_isbn,
        COUNT(CASE WHEN isbn13 IS NULL OR isbn13 = '' THEN 1 END) as sans_isbn13
      FROM books 
      WHERE is_active = TRUE
    `);
    const stats = statsResult.rows[0];
    console.log(`   Total livres actifs: ${stats.total}`);
    console.log(`   ✅ Avec couverture: ${stats.avec_cover} (${(stats.avec_cover/stats.total*100).toFixed(1)}%)`);
    console.log(`   ❌ Sans couverture: ${stats.sans_cover} (${(stats.sans_cover/stats.total*100).toFixed(1)}%)`);
    console.log(`   ⚠️  Sans ISBN: ${stats.sans_isbn}`);
    console.log(`   ⚠️  Sans ISBN13: ${stats.sans_isbn13}\n`);

    // 3. Voir les premières couvertures
    console.log('3️⃣  Première couvertures trouvées:');
    const coversResult = await pool.query(`
      SELECT 
        legacy_id, 
        title, 
        isbn13, 
        cover_url,
        CASE 
          WHEN cover_url LIKE '%openlibrary%' THEN 'Open Library'
          WHEN cover_url LIKE '%books.google.com%' THEN 'Google Books'
          ELSE 'Other'
        END as source
      FROM books 
      WHERE is_active = TRUE AND cover_url IS NOT NULL
      LIMIT 5
    `);
    
    if (coversResult.rows.length === 0) {
      console.log('   ❌ AUCUNE COUVERTURE TROUVÉE EN BASE!');
    } else {
      coversResult.rows.forEach((row, i) => {
        console.log(`   ${i+1}. ${row.legacy_id}: ${row.title}`);
        console.log(`      ISBN13: ${row.isbn13}`);
        console.log(`      Source: ${row.source}`);
        console.log(`      URL: ${row.cover_url.substring(0, 60)}...`);
      });
    }
    console.log('');

    // 4. Vérifier les URLs invalides
    console.log('4️⃣  Vérifier les URLs invalides:');
    const invalidResult = await pool.query(`
      SELECT COUNT(*) as count FROM books 
      WHERE is_active = TRUE 
      AND cover_url IS NOT NULL 
      AND cover_url = ''
    `);
    console.log(`   URLs vides: ${invalidResult.rows[0].count}\n`);

    // 5. Distribution par source
    console.log('5️⃣  Distribution des sources de couverture:');
    const sourceResult = await pool.query(`
      SELECT 
        CASE 
          WHEN cover_url LIKE '%openlibrary%' THEN 'Open Library'
          WHEN cover_url LIKE '%books.google.com%' THEN 'Google Books'
          WHEN cover_url LIKE '%covers%' THEN 'Covers (génériques)'
          ELSE 'Other'
        END as source,
        COUNT(*) as count
      FROM books 
      WHERE is_active = TRUE AND cover_url IS NOT NULL
      GROUP BY source
      ORDER BY count DESC
    `);
    
    sourceResult.rows.forEach(row => {
      console.log(`   ${row.source}: ${row.count}`);
    });
    console.log('');

    // 6. Chercher les livres sans couverture ET avec ISBN
    console.log('6️⃣  Livres SANS couverture mais AVEC ISBN (cibles pour sync):');
    const noCoversResult = await pool.query(`
      SELECT legacy_id, title, isbn13, isbn
      FROM books 
      WHERE is_active = TRUE 
      AND (cover_url IS NULL OR cover_url = '')
      AND (isbn13 IS NOT NULL OR isbn IS NOT NULL)
      LIMIT 5
    `);
    
    if (noCoversResult.rows.length === 0) {
      console.log('   ✅ Aucun! Tous les livres avec ISBN ont une couverture\n');
    } else {
      console.log(`   ${noCoversResult.rows.length} livres à synchroniser:`);
      noCoversResult.rows.forEach((row, i) => {
        console.log(`   ${i+1}. ${row.legacy_id}: ${row.title}`);
        console.log(`      ISBN13: ${row.isbn13 || 'N/A'}, ISBN: ${row.isbn || 'N/A'}`);
      });
      console.log('');
    }

    // 7. Résumé
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║ RÉSUMÉ ET RECOMMANDATIONS                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    if (stats.avec_cover === 0) {
      console.log('\n❌ AUCUNE COUVERTURE EN BASE!');
      console.log('   Action: Exécuter node fetch-covers-multi.js');
    } else if (stats.avec_cover / stats.total < 0.5) {
      console.log(`\n⚠️  SEULEMENT ${(stats.avec_cover/stats.total*100).toFixed(1)}% des couvertures`);
      console.log('   Action: Lancer node fetch-covers-multi.js pour compléter');
    } else {
      console.log(`\n✅ ${(stats.avec_cover/stats.total*100).toFixed(1)}% des couvertures en base`);
      console.log('   Status: BON! Les couvertures devraient s\'afficher');
    }

    console.log('\n');

  } catch (err) {
    console.error('❌ ERREUR:', err.message);
  } finally {
    await pool.end();
  }
}

diagnose();
