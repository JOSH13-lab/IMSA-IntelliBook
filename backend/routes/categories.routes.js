const router = require('express').Router();
const ctrl   = require('../controllers/categories.controller');

router.get('/', ctrl.getCategories);                // GET /api/categories
router.get('/:slug/books', ctrl.getCategoryBooks);  // GET /api/categories/:slug/books

module.exports = router;
