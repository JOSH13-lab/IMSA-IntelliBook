// C'est ici que les vraies couvertures sont récupérées
// Ce service est appelé par books.controller.js

const axios = require('axios');

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes';
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

// Récupérer la couverture d'un livre via son ISBN
async function getCoverByISBN(isbn) {
  try {
    const url = `${GOOGLE_BOOKS_BASE}?q=isbn:${isbn}${API_KEY ? '&key=' + API_KEY : ''}`;
    const { data } = await axios.get(url, { timeout: 5000 });

    if (data.totalItems > 0) {
      const imageLinks = data.items[0]?.volumeInfo?.imageLinks;
      if (imageLinks) {
        // Retourner la meilleure qualité disponible
        return (
          imageLinks.extraLarge ||
          imageLinks.large ||
          imageLinks.medium ||
          imageLinks.thumbnail ||
          null
        );
      }
    }
    return null;
  } catch (err) {
    console.warn(`Couverture introuvable pour ISBN ${isbn}:`, err.message);
    return null;
  }
}

// Récupérer la couverture via le titre et l'auteur
async function getCoverByTitle(title, author) {
  try {
    const q = encodeURIComponent(`${title} ${author}`);
    const url = `${GOOGLE_BOOKS_BASE}?q=${q}${API_KEY ? '&key=' + API_KEY : ''}`;
    const { data } = await axios.get(url, { timeout: 5000 });

    if (data.totalItems > 0) {
      const imageLinks = data.items[0]?.volumeInfo?.imageLinks;
      if (imageLinks) {
        return (
          imageLinks.large ||
          imageLinks.medium ||
          imageLinks.thumbnail ||
          null
        );
      }
    }
    return null;
  } catch (err) {
    console.warn(`Couverture introuvable pour "${title}":`, err.message);
    return null;
  }
}

// URL directe Google Books (sans appel API — fonctionne toujours)
function getDirectCoverUrl(isbn) {
  if (!isbn) return null;
  return `https://books.google.com/books/content?vid=ISBN:${isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
}

module.exports = { getCoverByISBN, getCoverByTitle, getDirectCoverUrl };
