const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db/database');
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

// API Routes
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
