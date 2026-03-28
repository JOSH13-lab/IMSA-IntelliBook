const router  = require('express').Router();
const auth    = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const upload  = require('../middleware/upload');
const ctrl    = require('../controllers/books.controller');
const readCtrl = require('../controllers/reading.controller');

router.get('/',                 ctrl.getBooks);              // GET  /api/books
router.get('/:id',              ctrl.getBookById);            // GET  /api/books/:id
router.get('/:id/cover',        ctrl.getBookCover);           // GET  /api/books/:id/cover
router.post('/batch/covers',    ctrl.getBooksCoversBatch);    // POST /api/books/batch/covers ← NOUVEAU
router.get('/:id/read',         auth, readCtrl.getBookContent);   // GET  /api/books/:id/read (Phase 2 reader)

router.post('/',                auth, isAdmin, upload.single('cover'), ctrl.createBook);
router.put('/:id',              auth, isAdmin, upload.single('cover'), ctrl.updateBook);
router.delete('/:id',           auth, isAdmin, ctrl.deleteBook);

module.exports = router;
