const express = require('express');
const router = express.Router();
const db = require('../db/database');
const platformEvents = require('../services/EventEmitter');
const { instructorAuth } = require('../middleware/instructorAuth');

// GET /api/sessions/:id/stream - SSE real-time stream endpoint (R14, R15)
router.get('/:id/stream', (req, res) => {
  const sessionId = req.params.id;
  const session = db.sessions.findOne({ id: sessionId });

  if (!session) {
    return res.status(404).json({ success: false, error: 'Sesi�n no encontrada' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  // Send initial state snapshot (incluye pilares y emergentes para el panel en vivo)
  const sendInitialSnapshot = () => {
    const participants = db.participants.find({ session_id: sessionId });
    const votes = db.votes.find({ session_id: sessionId });

    // Agregar votos por pilar y emergentes
    const pilaresData = { personal: {}, equipos: {}, desempenio: {}, estrategia: {} };
    const emergentesData = {};
    votes.forEach(v => {
      const pKey = v.pilar.toLowerCase();
      if (pKey === 'emergente') {
        if (!emergentesData[v.dolor]) {
          emergentesData[v.dolor] = { count: 0, source_pilar: v.source_pilar || null };
        }
        emergentesData[v.dolor].count += (v.count || 1);
      } else if (pilaresData[pKey]) {
        pilaresData[pKey][v.dolor] = (pilaresData[pKey][v.dolor] || 0) + (v.count || 1);
      }
    });

    const pilares = {};
    Object.keys(pilaresData).forEach(pKey => {
      const sorted = Object.entries(pilaresData[pKey])
        .map(([nombre, count]) => ({ nombre, count }))
        .sort((a, b) => b.count - a.count);
      pilares[pKey] = { total_votes: sorted.reduce((s, i) => s + i.count, 0), top_dolores: sorted };
    });

    const emergentes = Object.entries(emergentesData)
      .map(([nombre, { count, source_pilar }]) => ({ nombre, count, source_pilar }))
      .sort((a, b) => b.count - a.count);

    const data = {
      session,
      participant_count: participants.length,
      participants: participants.map(p => ({
        id: p.id,
        company_name: p.company_name,
        sector: p.sector,
        employee_count: p.employee_count,
        created_at: p.created_at,
        votes_count: db.votes.find({ participant_id: p.id }).length,
        completed: db.votes.find({ participant_id: p.id }).length >= 4
      })),
      total_votes: votes.reduce((acc, v) => acc + (v.count || 1), 0),
      pilares,
      emergentes
    };

    res.write(`event: snapshot\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendInitialSnapshot();

  // Listener for dynamic updates
  const eventHandler = (payload) => {
    res.write(`event: ${payload.type}\ndata: ${JSON.stringify(payload.data)}\n\n`);
  };

  platformEvents.on(`session:${sessionId}`, eventHandler);

  // Keep-alive heartbeat every 15s
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    platformEvents.removeListener(`session:${sessionId}`, eventHandler);
    res.end();
  });
});

// GET /api/sessions/:id/snapshot - REST fallback for live monitor (FACILITADOR: protegido)
router.get('/:id/snapshot', instructorAuth, (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = db.sessions.findOne({ id: sessionId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Sesi�n no encontrada' });
    }

    const participants = db.participants.find({ session_id: sessionId });
    const votes = db.votes.find({ session_id: sessionId });

    // Aggregate top dolores per pilar
    const pilaresData = {
      personal: {},
      equipos: {},
      desempenio: {},
      estrategia: {}
    };
    const emergentesData = {};

    votes.forEach(v => {
      const pKey = v.pilar.toLowerCase();
      if (pKey === "emergente") {
        if (!emergentesData[v.dolor]) {
          emergentesData[v.dolor] = { count: 0, source_pilar: v.source_pilar || null };
        }
        emergentesData[v.dolor].count += (v.count || 1);
      } else if (pilaresData[pKey]) {
        pilaresData[pKey][v.dolor] = (pilaresData[pKey][v.dolor] || 0) + (v.count || 1);
      }
    });

    const formattedPilares = {};
    Object.keys(pilaresData).forEach(pKey => {
      const sorted = Object.entries(pilaresData[pKey])
        .map(([nombre, count]) => ({ nombre, count }))
        .sort((a, b) => b.count - a.count);

      formattedPilares[pKey] = {
        total_votes: sorted.reduce((sum, item) => sum + item.count, 0),
        top_dolores: sorted
      };
    });

    const formattedEmergentes = Object.entries(emergentesData)
      .map(([nombre, { count, source_pilar }]) => ({ nombre, count, source_pilar }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        session,
        participant_count: participants.length,
        participants: participants.map(p => {
          const pVotes = db.votes.find({ participant_id: p.id });
          return {
            id: p.id,
            company_name: p.company_name,
            sector: p.sector,
            employee_count: p.employee_count,
            created_at: p.created_at,
            votes_count: pVotes.length,
            completed: pVotes.length >= 4 // completed at least 4 selections
          };
        }),
        pilares: formattedPilares,
        emergentes: formattedEmergentes,
        total_votes: votes.reduce((acc, v) => acc + (v.count || 1), 0),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
