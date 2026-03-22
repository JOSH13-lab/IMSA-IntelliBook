const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/borrows.controller');

router.post('/',            auth, ctrl.borrowBook);       // POST /api/borrows
router.put('/:id/extend',   auth, ctrl.extendBorrow);     // PUT  /api/borrows/:id/extend
router.get('/user/:id',     auth, ctrl.getUserBorrows);   // GET  /api/users/:id/borrows

module.exports = router;
