module.exports = (err, req, res, next) => {
  console.error('❌ Erreur serveur :', err.message);

  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Erreur PostgreSQL
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({ success: false, message: 'Cette valeur existe déjà.' });
  }
  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({ success: false, message: 'Référence invalide.' });
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Erreur interne du serveur. Réessayez plus tard.'
  });
};
