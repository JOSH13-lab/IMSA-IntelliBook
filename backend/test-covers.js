// ════════════════════════════════════════════════════════════════════
// TEST CLIENT — Vérifier le système de couvertures
// ════════════════════════════════════════════════════════════════════
// Usage: node test-covers.js

const http = require('http');

const API_BASE = 'http://localhost:5000/api';

// Couleurs pour terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  log('cyan', `
╔═══════════════════════════════════════════════════════════════╗
║        🧪 TEST CLIENT - Système de Couvertures              ║
║        IMSA IntelliBook                                      ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  let passed = 0;
  let failed = 0;

  // Test 1: Health check
  log('blue', '\n📡 Test 1: Health Check');
  try {
    const res = await request('GET', '/health');
    if (res.status === 200 && res.body.success) {
      log('green', '  ✅ API opérationnelle');
      passed++;
    } else {
      log('red', '  ❌ API non opérationnelle');
      failed++;
    }
  } catch (e) {
    log('red', `  ❌ Erreur: ${e.message}`);
    log('yellow', '  💡 Le serveur backend doit être lancé: npm run dev');
    failed++;
  }

  // Test 2: Récupérer un livre
  log('blue', '\n📚 Test 2: Récupérer un livre');
  try {
    const res = await request('GET', '/books');
    if (res.status === 200 && res.body.success) {
      const book = res.body.data[0];
      if (book) {
        log('green', `  ✅ Livre trouvé: ${book.legacy_id} - ${book.title}`);
        log('cyan', `     ISBN: ${book.isbn13 || book.isbn || 'N/A'}`);
        log('cyan', `     Cover URL: ${book.cover_url ? '✅ Oui' : '❌ Non'}`);
        passed++;

        // Test 3: Endpoint single cover
        log('blue', '\n🖼️  Test 3: GET /books/:id/cover');
        try {
          const coverRes = await request('GET', `/books/${book.legacy_id}/cover`);
          if (coverRes.status === 200 && coverRes.body.success) {
            log('green', '  ✅ Cover endpoint fonctionne');
            if (coverRes.body.coverUrl) {
              log('green', '  ✅ Couverture trouvée');
              log('cyan', `     Source: ${coverRes.body.source || 'cached'}`);
            } else {
              log('yellow', '  ⚠️  Pas de couverture trouvée (normal si ISBN invalide)');
            }
            passed++;
          } else {
            log('red', `  ❌ Erreur HTTP ${coverRes.status}`);
            failed++;
          }
        } catch (e) {
          log('red', `  ❌ Erreur: ${e.message}`);
          failed++;
        }

        // Test 4: Endpoint batch covers
        log('blue', '\n📦 Test 4: POST /books/batch/covers');
        try {
          const batchRes = await request('POST', '/books/batch/covers', {
            bookIds: [book.legacy_id]
          });
          if (batchRes.status === 200 && batchRes.body.success) {
            log('green', '  ✅ Batch endpoint fonctionne');
            const cover = batchRes.body.covers[0];
            log('cyan', `     ID: ${cover.id || cover.legacy_id}`);
            log('cyan', `     Source: ${cover.source || 'cached'}`);
            log('cyan', `     Cached: ${cover.cached ? 'Yes' : 'No'}`);
            if (cover.coverUrl) {
              log('green', `     URL: ${cover.coverUrl.substring(0, 80)}...`);
            }
            passed++;
          } else {
            log('red', `  ❌ Erreur HTTP ${batchRes.status}`);
            log('yellow', `     Message: ${batchRes.body?.message}`);
            failed++;
          }
        } catch (e) {
          log('red', `  ❌ Erreur: ${e.message}`);
          failed++;
        }

        // Test 5: Batch avec 3 livres
        log('blue', '\n📚 Test 5: Batch avec plusieurs livres');
        try {
          const books = res.body.data.slice(0, 3).map(b => b.legacy_id);
          log('cyan', `   Livres testés: ${books.join(', ')}`);

          const batchRes = await request('POST', '/books/batch/covers', {
            bookIds: books
          });
          if (batchRes.status === 200 && batchRes.body.success) {
            log('green', `  ✅ Batch de ${books.length} livres traité`);
            const success = batchRes.body.covers.filter(c => c.coverUrl).length;
            log('cyan', `     Couvertures trouvées: ${success}/${books.length}`);
            passed++;
          } else {
            log('red', `  ❌ Erreur HTTP ${batchRes.status}`);
            failed++;
          }
        } catch (e) {
          log('red', `  ❌ Erreur: ${e.message}`);
          failed++;
        }
      } else {
        log('yellow', '  ⚠️  Aucun livre en base de données');
        failed++;
      }
    } else {
      log('red', `  ❌ Erreur HTTP ${res.status}`);
      failed++;
    }
  } catch (e) {
    log('red', `  ❌ Erreur: ${e.message}`);
    failed++;
  }

  // Rapport final
  log('cyan', `
╔═══════════════════════════════════════════════════════════════╗
║                    📊 RÉSULTATS                              ║
╠═══════════════════════════════════════════════════════════════╣
║ Tests réussis  : ${String(passed).padStart(2)} ✅                              ║
║ Tests échoués  : ${String(failed).padStart(2)} ❌                              ║
║ Total          : ${String(passed + failed).padStart(2)}                              ║
╠═══════════════════════════════════════════════════════════════╣
║ Taux de succès : ${(((passed / (passed + failed)) * 100).toFixed(0)).padStart(3)}%                             ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  if (failed === 0) {
    log('green', '🎉 Tous les tests sont passés! Le système est prêt.\\n');
  } else {
    log('yellow', '⚠️  Certains tests ont échoué. Vérifier les logs ci-dessus.\\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  log('red', `❌ Erreur critique: ${err.message}`);
  process.exit(1);
});
