const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/reading.controller');

router.post('/',           auth, ctrl.saveProgress);  // POST /api/reading-progress
router.get('/:bookId',     auth, ctrl.getProgress);   // GET  /api/reading-progress/:bookId

module.exports = router;
