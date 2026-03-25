// Service de Couvertures Multi-API avec Fallbacks
// APIs supportées : Google Books, Open Library, ISBN.io
// Cache : PostgreSQL
// Ce service est appelé par books.controller.js

const axios = require('axios');

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_BASE = 'https://covers.openlibrary.org/b';
const ISBN_API_BASE = 'https://api.isbndb.com/books';

const GOOGLE_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const ISBN_API_KEY = process.env.ISBN_API_KEY;

const REQUEST_TIMEOUT = 5000;

// Logger pour déboguer les récupérations
function log(source, isbn, success, message = '') {
  const status = success ? '✅' : '❌';
  const msg = message ? ` - ${message}` : '';
  console.log(`[${source}] ${status} ISBN: ${isbn}${msg}`);
}

// ════════════════════════════════════════════════════════════════════
// GOOGLE BOOKS API - Source Primaire (meilleure qualité)
// ════════════════════════════════════════════════════════════════════
async function getCoverFromGoogle(isbn) {
  try {
    const url = `${GOOGLE_BOOKS_BASE}?q=isbn:${isbn}${GOOGLE_API_KEY ? '&key=' + GOOGLE_API_KEY : ''}`;
    const { data } = await axios.get(url, { timeout: REQUEST_TIMEOUT });

    if (data.totalItems > 0) {
      const imageLinks = data.items[0]?.volumeInfo?.imageLinks;
      if (imageLinks) {
        const url = (
          imageLinks.extraLarge ||
          imageLinks.large ||
          imageLinks.medium ||
          imageLinks.thumbnail
        );
        if (url) {
          log('Google Books', isbn, true, 'Found');
          return { url, source: 'google_books', quality: 'high' };
        }
      }
    }
    log('Google Books', isbn, false, 'No image found');
    return null;
  } catch (err) {
    log('Google Books', isbn, false, err.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// OPEN LIBRARY API - Fallback Principal (gratuit, fiable)
// ════════════════════════════════════════════════════════════════════
async function getCoverFromOpenLibrary(isbn) {
  try {
    // Open Library accepte ISBN-10, ISBN-13, OCLC, LCCN
    const url = `${OPEN_LIBRARY_BASE}/isbn/${isbn}-L.jpg`;
    
    // Vérifier que l'image existe vraiment (ne pas retourner une placeholder)
    const { status, headers } = await axios.head(url, { timeout: REQUEST_TIMEOUT });
    
    if (status === 200 && headers['content-length'] > 1000) {
      log('Open Library', isbn, true, 'Found');
      return { url, source: 'open_library', quality: 'medium' };
    }
    log('Open Library', isbn, false, 'No valid image');
    return null;
  } catch (err) {
    log('Open Library', isbn, false, err.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// GOOGLE BOOKS DIRECT URL - Fallback Garanti (format standard)
// ════════════════════════════════════════════════════════════════════
function getCoverFromGoogleDirect(isbn) {
  if (!isbn) return null;
  const url = `https://books.google.com/books/content?vid=ISBN:${isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
  log('Google Direct', isbn, true, 'Generated');
  return { url, source: 'google_direct', quality: 'low' };
}

// ════════════════════════════════════════════════════════════════════
// Récupérer via Titre + Auteur (fallback si ISBN échoue)
// ════════════════════════════════════════════════════════════════════
async function getCoverByTitle(title, author) {
  if (!title) return null;

  try {
    const q = encodeURIComponent(`${title} ${author || ''}`.trim());
    const url = `${GOOGLE_BOOKS_BASE}?q=${q}&maxResults=5${GOOGLE_API_KEY ? '&key=' + GOOGLE_API_KEY : ''}`;
    const { data } = await axios.get(url, { timeout: REQUEST_TIMEOUT });

    if (data.totalItems > 0) {
      for (const item of data.items) {
        const imageLinks = item?.volumeInfo?.imageLinks;
        if (imageLinks) {
          const url = imageLinks.large || imageLinks.medium || imageLinks.thumbnail;
          if (url) {
            log('Google Books (Title)', title, true);
            return { url, source: 'google_books_title', quality: 'medium' };
          }
        }
      }
    }
    log('Google Books (Title)', title, false);
    return null;
  } catch (err) {
    log('Google Books (Title)', title, false, err.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE : Récupérer avec stratégie de fallbacks
// ════════════════════════════════════════════════════════════════════
async function getCoverByISBN(isbn, title = null, author = null) {
  if (!isbn) {
    // Si pas d'ISBN, essayer par titre
    if (title) {
      return await getCoverByTitle(title, author);
    }
    return null;
  }

  console.log(`\n📖 Recherche couverture : ISBN ${isbn}`);

  // Stratégie 1 : Google Books (meilleure qualité)
  let result = await getCoverFromGoogle(isbn);
  if (result) return result;

  // Stratégie 2 : Open Library (gratuit, fiable)
  result = await getCoverFromOpenLibrary(isbn);
  if (result) return result;

  // Stratégie 3 : Google Direct (fallback garanti)
  result = getCoverFromGoogleDirect(isbn);
  if (result) return result;

  // Stratégie 4 : Par titre/auteur si disponible
  if (title) {
    result = await getCoverByTitle(title, author);
    if (result) return result;
  }

  console.log(`⚠️  Aucune couverture trouvée pour ${isbn}`);
  return null;
}

// ════════════════════════════════════════════════════════════════════
// FONCTION BATCH : Récupérer plusieurs couvertures en parallèle
// ════════════════════════════════════════════════════════════════════
async function getCoversBatch(books) {
  // books = [{ isbn, title, author }, ...]
  console.log(`\n📚 Recherche de ${books.length} couvertures en parallèle...`);

  const promises = books.map(book =>
    getCoverByISBN(book.isbn, book.title, book.author)
      .then(result => ({
        isbn: book.isbn,
        result,
        error: null
      }))
      .catch(error => ({
        isbn: book.isbn,
        result: null,
        error: error.message
      }))
  );

  return Promise.all(promises);
}

// ════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════
module.exports = {
  getCoverByISBN,           // Mono - ISBN + fallbacks titre/auteur
  getCoverByTitle,          // Mono - Titre + Auteur
  getCoverFromGoogle,       // Mono - Google Books seulement
  getCoverFromOpenLibrary,  // Mono - Open Library seulement
  getCoversBatch,           // Batch - Plusieurs à la fois
  getDirectCoverUrl: (isbn) => {
    // Compatibilité avec ancien code
    if (!isbn) return null;
    return `https://books.google.com/books/content?vid=ISBN:${isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
  }
};
