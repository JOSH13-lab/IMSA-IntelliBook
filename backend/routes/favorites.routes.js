const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/favorites.controller');

router.post('/',  auth, ctrl.toggleFavorite);       // POST   /api/favorites
router.delete('/',auth, ctrl.toggleFavorite);       // DELETE /api/favorites

module.exports = router;
