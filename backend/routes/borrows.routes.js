const router  = require('express').Router();
const auth    = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const ctrl    = require('../controllers/borrows.controller');

router.post('/',             auth, ctrl.borrowBook);       // Emprunter
router.get('/me',            auth, ctrl.getMyBorrows);     // Mes emprunts
router.get('/active',        auth, ctrl.checkActiveBorrow);// Vérif emprunt actif
router.put('/:id/extend',    auth, ctrl.extendBorrow);     // Prolonger
router.put('/:id/return',    auth, ctrl.returnBook);       // Retourner
router.get('/',              auth, isAdmin, ctrl.getAllBorrows); // Admin

module.exports = router;
