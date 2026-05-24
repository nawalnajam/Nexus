require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const connectDB    = require('./config/db');
const authRoutes   = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const errorHandler = require('./middleware/errorHandler');

// ── Bootstrap DB ───────────────────────────────────────────────────────────
connectDB();

const app = express();

// ── Security & request middleware ──────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,                 // allow cookies (refresh token)
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Global rate limiter ────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use(limiter);

// Stricter limiter on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many auth requests, please try again later' },
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'Nexus API is running 🚀', env: process.env.NODE_ENV })
);

app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/profiles', profileRoutes);

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Central error handler ──────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀  Nexus API running on port ${PORT}  [${process.env.NODE_ENV}]`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;