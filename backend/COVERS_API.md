# 📚 API Documentation - Covers Service

## Overview
Ce document décrit l'intégration complète du système de récupération de couvertures de livres via multiples APIs externes (Google Books, Open Library).

## Architecture

```
Frontend (HTML/JS)
    ↓
JavaScript API Batch Calls
    ↓
POST /api/books/batch/covers  ou  GET /api/books/{id}/cover
    ↓
Node.js Backend (Express)
    ↓
covers.service.js (Multi-API Strategy)
    ├─ Google Books API (Primaire)
    ├─ Open Library (Fallback)
    └─ Google Direct URL (Fallback garanti)
    ↓
PostgreSQL Database
    └─ Cache en cover_url
```

## Endpoints API

### 1. GET `/api/books/:id/cover` - Récupérer UNE couverture

**Description:** Récupère la couverture d'un livre spécifique

**Parameters:**
- `id` (path) : UUID ou legacy_id du livre (ex: `livre-001`)

**Response:**
```json
{
  "success": true,
  "coverUrl": "https://books.google.com/books/content?vid=ISBN:...",
  "source": "google_books",
  "message": "Couverture trouvée"
}
```

**Example:**
```bash
curl http://localhost:5000/api/books/livre-001/cover
```

---

### 2. POST `/api/books/batch/covers` - Récupérer PLUSIEURS couvertures ⚡ RECOMMANDÉ

**Description:** Récupère les couvertures de plusieurs livres en une seule requête (optimisé)

**Parameters:**
- `bookIds` (body, array) : Liste d'IDs ou legacy_ids

**Request Body:**
```json
{
  "bookIds": ["livre-001", "livre-002", "livre-003"]
}
```

**Response:**
```json
{
  "success": true,
  "total": 3,
  "covers": [
    {
      "id": "uuid-1",
      "legacy_id": "livre-001",
      "coverUrl": "https://...",
      "source": "google_books",
      "quality": "high",
      "cached": false
    },
    {
      "id": "uuid-2",
      "legacy_id": "livre-002",
      "coverUrl": "https://...",
      "source": "open_library",
      "quality": "medium",
      "cached": true
    },
    {
      "id": "uuid-3",
      "legacy_id": "livre-003",
      "coverUrl": null,
      "source": null,
      "cached": false
    }
  ]
}
```

**Limitations:**
- Maximum 50 livres par requête
- Recommandé: 20 livres par batch

**Example:**
```bash
curl -X POST http://localhost:5000/api/books/batch/covers \
  -H "Content-Type: application/json" \
  -d '{"bookIds": ["livre-001", "livre-002"]}'
```

---

## Sources de Couvertures (Fallback Strategy)

### 1️⃣ **Google Books API** (Source Primaire)
- **Qualité:** ⭐⭐⭐⭐⭐ Excellente (extraLarge, Large, Medium)
- **Fiabilité:** ⭐⭐⭐⭐⭐ Très fiable
- **Limitation:** Rate limiting sans clé API
- **Clé API:** `GOOGLE_BOOKS_API_KEY` (optionnel, recommandé)

### 2️⃣ **Open Library API** (Fallback Principal)
- **Qualité:** ⭐⭐⭐⭐ Bonne (Medium)
- **Fiabilité:** ⭐⭐⭐⭐⭐ Très fiable
- **Limitation:** Parfois pas d'image très grande
- **Coût:** Gratuit (pas de clé API nécessaire)

### 3️⃣ **Google Direct URL** (Fallback Garanti)
- **Qualité:** ⭐⭐⭐ Bonne (peut être placeholder)
- **Fiabilité:** ⭐⭐⭐⭐⭐ Fonctionne toujours
- **Format:** `https://books.google.com/books/content?vid=ISBN:...`
- **Coût:** Gratuit

---

## Configuration (.env)

```bash
# Google Books API (Optionnel)
GOOGLE_BOOKS_API_KEY=YOUR_KEY_HERE

# Open Library (Gratuit, pas de config nécessaire)
# Mais on peut ajouter un rate limiter si besoin
```

**Obtenir une clé API Google Books:**
1. Aller sur https://console.developers.google.com
2. Créer un projet
3. Activer "Books API"
4. Créer une clé API (Browser/Server)
5. Ajouter à `.env`

---

## Scripts de Synchronisation

### `node fetch-covers-multi.js`

Synchronise les couvertures de TOUS les livres en base de données.

**Options:**
- `--dry-run` : Tester sans sauvegarder
- `--limit N` : Traiter seulement N livres

**Exemples:**
```bash
# Test (pas de mise à jour)
node fetch-covers-multi.js --dry-run

# Traiter seulement 10 livres
node fetch-covers-multi.js --limit 10

# Production complète
node fetch-covers-multi.js
```

**Output:**
```
╔════════════════════════════════════════════════════════════════╗
║     🖼️  Récupération des Couvertures - Mode Multi-API          ║
║     IMSA IntelliBook                                           ║
╠════════════════════════════════════════════════════════════════╣
║ Sources : Google Books + Open Library + Fallbacks             ║
║ Mode    : 💾 PRODUCTION (sauvegarde en BD)                     ║
╚════════════════════════════════════════════════════════════════╝

📚 Total: 150 livres à traiter

📖 Batch 1/4
   Traitement des livres 1 à 5...
   livre-001      — Le Seigneur des Anneaux... ✅ GOOGLE_BOOKS
   livre-002      — Harry Potter... ✅ OPEN_LIBRARY
   ...

╔════════════════════════════════════════════════════════════════╗
║                    📊 RAPPORT FINAL                            ║
╠════════════════════════════════════════════════════════════════╣
║ Total traité       :    150                                    ║
║ En cache (BD)      :     45  ✅                                ║
║ Google Books       :     85  🔍                                ║
║ Open Library       :     15  📖                                ║
║ Google Direct      :      5  🌐                                ║
║ Non trouvées       :      0  ⚠️                                ║
║ Erreurs API        :      0  ❌                                ║
╠════════════════════════════════════════════════════════════════╣
║ Taux de succès : 100.0%                                        ║
╚════════════════════════════════════════════════════════════════╝
```

---

## Frontend Integration

### Chargement Simple (Une couverture)
```javascript
// Auto dans main.js
loadBookCover(bookId, imgElement);
```

### Chargement en Batch (Recommandé)
```javascript
// Auto dans main.js
const bookIds = ['livre-001', 'livre-002', 'livre-003'];
await loadCoversBatch(bookIds, elements);
```

### Retry Automatique
Si la couverture échoue la première fois, le système réessaye automatiquement 3 fois avant d'afficher le fallback.

---

## Performance

### Benchmark
- **Single request:** ~200ms
- **Batch 20 livres:** ~800ms (bande passante limitée par Open Library)
- **Cache hit:** <5ms

### Recommandations
- Utiliser toujours le batch endpoint pour >3 livres
- Grouper par 20 livres max
- Implémenter lazy loading des images
- Servir les images en HTTPS seulement

---

## Dépannage

### ❌ "Image not available" (placeholder)
- **Cause:** Aucune couverture trouvée sur les 3 sources
- **Solution:** Vérifier l'ISBN en base, utiliser une image par défaut

### ❌ "Timeout" (API lente)
- **Cause:** Rate limiting ou serveur distant lent
- **Solution:** Réduire la taille du batch, ajouter des délais

### ❌ "HTTP 404 Not Found"
- **Cause:** Livre n'existe pas en base
- **Solution:** Vérifier l'ID fourni

### ✅ "Network Error"
- **Cause:** Perte de connexion réseau
- **Solution:** Frontend réessaye automatiquement 3 fois

---

## Statistiques & Monitoring

### Voir les couvertures en cache
```sql
SELECT legacy_id, title, cover_url
FROM books
WHERE cover_url IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

### Compter les couvertures manquantes
```sql
SELECT COUNT(*) as missing
FROM books
WHERE is_active = TRUE AND (cover_url IS NULL OR cover_url = '');
```

### Vérifier les sources
```sql
SELECT 
  CASE 
    WHEN cover_url LIKE '%books.google.com%' THEN 'Google Books'
    WHEN cover_url LIKE '%covers.openlibrary.org%' THEN 'Open Library'
    WHEN cover_url LIKE '/uploads/%' THEN 'Uploaded'
    ELSE 'Unknown'
  END as source,
  COUNT(*) as count
FROM books
WHERE is_active = TRUE AND cover_url IS NOT NULL
GROUP BY source;
```

---

## Support des ISBNs

### ISBN-10 et ISBN-13
Tous les endpoints supportent les deux formats:
- **ISBN-10:** 0451045300 (The Great Gatsby)
- **ISBN-13:** 978-0-451-04530-7 (même livre)

### Validation
```javascript
function isValidISBN(isbn) {
  const clean = isbn.replace(/[^0-9X]/g, '');
  return clean.length === 10 || clean.length === 13;
}
```

---

## Roadmap Futur

- [ ] Support ISBN.io API
- [ ] Cache HTTP Headers (ETag, Cache-Control)
- [ ] Webhook notifications pour batch completion
- [ ] API pour télécharger des images localement
- [ ] Compression et optimisation des images
- [ ] Support du formats WebP

---

## Support & Contacts

**Pour des questions:**
- Consulter les logs: `/backend/error.txt`
- Vérifier `.env` pour les clés API
- Lancer en mode dry-run pour tester

**Erreurs courantes:**
- Vérifier que PostgreSQL est actif
- Vérifier la connexion Internet pour les APIs externes
- S'assurer que `covers.service.js` est correct

---

**Dernière mise à jour:** Mars 2026
**Mainteneur:** IMSA IntelliBook Team
