// TEST API - Vérifier que l'API retourne bien les couvertures

const API_BASE = 'http://localhost:5000/api';

async function testAPI() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           TEST API - Vérification des Couvertures         ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Test 1: Single book
  console.log('1️⃣  Test - Récupérer UNE couverture');
  try {
    const res = await fetch(`${API_BASE}/books/livre-001/cover`);
    const data = await res.json();
    console.log('   Réponse:', JSON.stringify(data, null, 2));
    if (data.coverUrl) {
      console.log('   ✅ Couverture trouvée\n');
    } else {
      console.log('   ❌ Pas de couverture retournée\n');
    }
  } catch (err) {
    console.log('   ❌ ERREUR:', err.message, '\n');
  }

  // Test 2: Batch
  console.log('2️⃣  Test - Batch de 5 livres');
  try {
    const res = await fetch(`${API_BASE}/books/batch/covers`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        bookIds: ['livre-001', 'livre-002', 'livre-003', 'livre-004', 'livre-005']
      })
    });
    const data = await res.json();
    console.log('   Réponse:', JSON.stringify(data, null, 2));
    
    if (data.covers) {
      const withUrl = data.covers.filter(c => c.coverUrl).length;
      console.log(`   ✅ Trouvé ${withUrl}/${data.covers.length} couvertures\n`);
    }
  } catch (err) {
    console.log('   ❌ ERREUR:', err.message, '\n');
  }

  // Test 3: Vérifier si l'API est accessible
  console.log('3️⃣  Test - Santé de l\'API');
  try {
    const res = await fetch(`${API_BASE}/books`);
    if (res.ok) {
      console.log('   ✅ API accessible et responsive\n');
    } else {
      console.log(`   ❌ API retourne ${res.status}\n`);
    }
  } catch (err) {
    console.log('   ❌ API NOT RESPONDING:', err.message);
    console.log('   Solution: Lancer le backend avec: npm run dev\n');
  }
}

testAPI();
