const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../config/db');

// Générer les tokens JWT
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
}

// POST /api/auth/register
// Connecté à : inscription.html → form#registerForm
exports.register = async (req, res, next) => {
  try {
    const { fullname, email, phone, city, usertype, institution, password } = req.body;

    // Vérifier si email déjà utilisé
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows[0]) {
      return res.status(409).json({
        success: false,
        message: 'Cette adresse e-mail est déjà utilisée.'
      });
    }

    // Hasher le mot de passe
    const password_hash = await bcrypt.hash(password, 12);

    // Insérer l'utilisateur
    const { rows } = await query(`
      INSERT INTO users (fullname, email, phone, city, institution, user_type, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, fullname, email, city, user_type, status, created_at
    `, [
      fullname.trim(),
      email.toLowerCase().trim(),
      phone || null,
      city || 'Libreville',
      institution || null,
      usertype || 'lecteur',
      password_hash
    ]);

    const user = rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Sauvegarder refresh token
    await query(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '30 days')
    `, [user.id, refreshToken]);

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès ! Bienvenue sur IMSA IntelliBook.',
      data: { user, accessToken, refreshToken }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
// Connecté à : inscription.html → bouton "Se connecter"
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { rows } = await query(`
      SELECT id, fullname, email, password_hash, user_type, status,
             avatar_url, city, institution
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
    `, [email.toLowerCase().trim()]);

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect.'
      });
    }

    if (user.status === 'suspendu') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est suspendu. Contactez contact@imsa-intellibook.ga.'
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      // Incrémenter failed_login_count
      await query(
        'UPDATE users SET failed_login_count = failed_login_count + 1 WHERE id = $1',
        [user.id]
      );
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect.'
      });
    }

    // Mettre à jour last_login_at + réinitialiser failed_login_count
    await query(
      'UPDATE users SET last_login_at = NOW(), failed_login_count = 0 WHERE id = $1',
      [user.id]
    );

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Sauvegarder refresh token
    await query(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address)
      VALUES ($1, $2, NOW() + INTERVAL '30 days', $3)
    `, [user.id, refreshToken, req.ip]);

    // Ne pas envoyer le hash du mot de passe
    delete user.password_hash;

    res.json({
      success: true,
      message: `Bienvenue ${user.fullname} !`,
      data: { user, accessToken, refreshToken }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me — Profil de l'utilisateur connecté
exports.getMe = async (req, res) => {
  const { rows } = await query(`
    SELECT id, fullname, email, phone, city, institution, user_type,
           status, avatar_url, total_borrows, active_borrows,
           total_reviews, total_favorites, created_at
    FROM users WHERE id = $1
  `, [req.user.id]);

  res.json({ success: true, data: rows[0] });
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
        [refreshToken]
      );
    }
    res.json({ success: true, message: 'Déconnexion réussie.' });
  } catch (err) {
    next(err);
  }
};
