const router  = require('express').Router();
const auth    = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const ctrl    = require('../controllers/users.controller');
const fav     = require('../controllers/favorites.controller');
const borrow  = require('../controllers/borrows.controller');

router.get('/dashboard/stats', auth, isAdmin, ctrl.getDashboardStats);  // Dashboard stats
router.get('/',              auth, isAdmin, ctrl.getUsers);       // GET    /api/users
router.get('/:id',           auth, ctrl.getUserById);             // GET    /api/users/:id
router.put('/:id',           auth, ctrl.updateUser);              // PUT    /api/users/:id
router.delete('/:id',        auth, ctrl.deleteUser);              // DELETE /api/users/:id

router.get('/:id/borrows',   auth, borrow.getUserBorrows);
router.get('/:id/favorites', auth, fav.getUserFavorites);         // GET    /api/users/:id/favorites
router.get('/:id/recommendations', auth, ctrl.getRecommendations);

module.exports = router;
