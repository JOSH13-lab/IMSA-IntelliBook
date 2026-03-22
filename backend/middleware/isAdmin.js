module.exports = (req, res, next) => {
  if (req.user && req.user.user_type === 'administrateur') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Accès réservé aux administrateurs IMSA.'
  });
};
