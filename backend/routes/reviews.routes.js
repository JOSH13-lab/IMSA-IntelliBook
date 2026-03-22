const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/reviews.controller');

router.post('/books/:id/reviews', auth, ctrl.createReview);  // POST /api/books/:id/reviews
router.get('/books/:id/reviews',       ctrl.getBookReviews); // GET  /api/books/:id/reviews

module.exports = router;
