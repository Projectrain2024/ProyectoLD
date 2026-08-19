const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db/database');
const { instructorAuth, generateToken } = require('./middleware/instructorAuth');
const sessionRoutes = require('./routes/sessions');
const participantRoutes = require('./routes/participants');
const voteRoutes = require('./routes/votes');
const resultRoutes = require('./routes/results');
const streamRoutes = require('./routes/stream');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with no-cache headers so Railway never serves stale files
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// ── Auth endpoint ────────────────────────────────────────────────────────────
// POST /api/auth/instructor  →  valida la contraseña y retorna un token firmado
app.post('/api/auth/instructor', (req, res) => {
  const { password } = req.body;
  const facilitatorPassword = process.env.FACILITATOR_PASSWORD;

  if (!facilitatorPassword) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[AUTH] FACILITATOR_PASSWORD no configurada en producción.');
      return res.status(503).json({
        success: false,
        error: 'El servidor no está configurado correctamente. Contacta al administrador.'
      });
    }
    // Solo en desarrollo local: permitir sin contraseña
    return res.json({ success: true, token: 'open', warning: 'FACILITATOR_PASSWORD no configurada (modo desarrollo).' });
  }

  if (!password || password !== facilitatorPassword) {
    return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
  }

  const token = generateToken(facilitatorPassword);
  res.json({ success: true, token });
});

// ── API Routes ────────────────────────────────────────────────────────────────
// La autenticación se aplica por-ruta dentro de cada router (ver cada routes/*.js).
// Rutas públicas y protegidas coexisten en los mismos routers.
app.use('/api/sessions', sessionRoutes);
app.use('/api/sessions', participantRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/sessions', voteRoutes);
app.use('/api/participants', resultRoutes);
app.use('/api/sessions', streamRoutes);
app.use('/api/sessions', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Instructor-Led Event Platform (LHH Colombia)',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/taxonomy', (req, res) => {
  try {
    const items = db.taxonomy.findAll();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPA fallback - serve index.html for all non-API routes, also with no-cache
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`Plataforma LHH Colombia ejecutandose en: http://localhost:${PORT}`);
    console.log(`=================================================`);
  });
}

module.exports = app;
