const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Accès refusé. Token manquant.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifier que l'utilisateur existe encore
    const { rows } = await query(
      'SELECT id, fullname, email, user_type, status FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.userId]
    );

    if (!rows[0]) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur introuvable ou supprimé.'
      });
    }

    if (rows[0].status === 'suspendu') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est suspendu. Contactez imsa-intellibook.ga.'
      });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expirée. Reconnectez-vous.' });
    }
    return res.status(401).json({ success: false, message: 'Token invalide.' });
  }
};
