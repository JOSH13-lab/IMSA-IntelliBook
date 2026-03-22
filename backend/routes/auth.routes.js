const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/auth.controller');

router.post('/register', ctrl.register);   // POST /api/auth/register
router.post('/login',    ctrl.login);      // POST /api/auth/login
router.post('/logout',   auth, ctrl.logout); // POST /api/auth/logout
router.get('/me',        auth, ctrl.getMe);  // GET  /api/auth/me

module.exports = router;
