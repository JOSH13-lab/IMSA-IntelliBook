const API_BASE = 'http://localhost:5000/api';

// Rendre la fonction globale avec window.
window.loadAllBookCovers = async function() {
  const cards = document.querySelectorAll(
    '.book-card, [data-id], [data-book-id]'
  );

  cards.forEach(async (card) => {
    const bookId = card.dataset.id
                || card.dataset.bookId
                || card.getAttribute('data-id');

    if (!bookId) return;

    const img = card.querySelector('img');
    if (!img) return;

    try {
      const res  = await fetch(`${API_BASE}/books/${bookId}/cover`);
      const data = await res.json();
      if (data.success && data.coverUrl) {
        img.src = data.coverUrl;
        img.style.display = 'block';
        const fallback = card.querySelector(
          '.book-cover-fallback, .book-cover-placeholder'
        );
        if (fallback) fallback.style.display = 'none';
      }
    } catch(e) {
      console.warn('Cover failed:', bookId);
    }
  });
};

document.addEventListener('DOMContentLoaded', window.loadAllBookCovers);
