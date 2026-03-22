require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');
const rateLimit  = require('express-rate-limit');

const { pool }   = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes       = require('./routes/auth.routes');
const usersRoutes      = require('./routes/users.routes');
const booksRoutes      = require('./routes/books.routes');
const categoriesRoutes = require('./routes/categories.routes');
const borrowsRoutes    = require('./routes/borrows.routes');
const favoritesRoutes  = require('./routes/favorites.routes');
const reviewsRoutes    = require('./routes/reviews.routes');
const readingRoutes    = require('./routes/reading.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Sécurité ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Pour les images
}));

// ── CORS ── Autorise le front-end à appeler l'API
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting (anti-spam) ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Trop de requêtes. Réessayez dans 15 minutes.' }
});
app.use('/api/', limiter);

// Limite stricte pour l'auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives de connexion.' }
});

// ── Body parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ──
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Fichiers statiques (images uploadées) ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Route de santé ──
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      message: 'IMSA IntelliBook API opérationnelle',
      database: 'PostgreSQL connecté ✅',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur base de données' });
  }
});

// ── Routes API ──
app.use('/api/auth',             authLimiter, authRoutes);
app.use('/api/users',            usersRoutes);
app.use('/api/books',            booksRoutes);
app.use('/api/categories',       categoriesRoutes);
app.use('/api/borrows',          borrowsRoutes);
app.use('/api/favorites',        favoritesRoutes);
app.use('/api/reviews',          reviewsRoutes);
app.use('/api/reading-progress', readingRoutes);

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route introuvable : ${req.method} ${req.originalUrl}`
  });
});

// ── Gestionnaire d'erreurs global ──
app.use(errorHandler);

// ── Démarrage ──
app.listen(PORT, () => {
  console.log(`\n🚀 IMSA IntelliBook API démarrée`);
  console.log(`📡 Port     : http://localhost:${PORT}`);
  console.log(`🏥 Santé    : http://localhost:${PORT}/api/health`);
  console.log(`🌍 Env      : ${process.env.NODE_ENV}`);
  console.log(`📚 Base     : ${process.env.DB_NAME}\n`);
});

module.exports = app;
