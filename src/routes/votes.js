const express = require('express');
const router = express.Router();
const db = require('../db/database');
const platformEvents = require('../services/EventEmitter');

// POST /api/sessions/:id/votes - Submit or update votes (R11-R13)
router.post('/:id/votes', (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = db.sessions.findOne({ id: sessionId });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Sesi�n no encontrada' });
    }

    if (session.status === 'closed') {
      return res.status(403).json({ success: false, error: 'La sesi�n est� cerrada' });
    }

    const { participant_id, votes } = req.body; // votes: array of { pilar, dolor, count }

    if (!participant_id) {
      return res.status(400).json({ success: false, error: 'Se requiere participant_id' });
    }

    if (!Array.isArray(votes)) {
      return res.status(400).json({ success: false, error: 'El campo votes debe ser un arreglo' });
    }

    const savedVotes = [];
    for (const v of votes) {
      if (!v.pilar || !v.dolor) continue;
      const record = db.votes.upsertVote({
        session_id: sessionId,
        participant_id,
        pilar: v.pilar.toLowerCase(),
        dolor: v.dolor,
        count: v.count !== undefined ? v.count : 1
      });
      savedVotes.push(record);
    }

    // Auto-update or create cached result snapshot for participant (R23)
    const allParticipantVotes = db.votes.find({ session_id: sessionId, participant_id });
    const categorized = {
      personal: [],
      equipos: [],
      desempenio: [],
      estrategia: [],
      emergente: []
    };
    allParticipantVotes.forEach(pv => {
      const pKey = pv.pilar.toLowerCase();
      if (categorized[pKey]) {
        categorized[pKey].push(pv.dolor);
      }
    });

    db.results.upsert({
      participant_id,
      session_id: sessionId,
      dolores_json: categorized
    });

    // Broadcast real-time update to instructor stream (R15)
    platformEvents.emit(`session:${sessionId}`, {
      type: 'vote:updated',
      data: {
        participant_id,
        saved_votes_count: savedVotes.length
      }
    });

    res.status(201).json({
      success: true,
      message: 'Votos registrados exitosamente',
      count: savedVotes.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sessions/:id/votes/aggregated - Aggregated vote stats by pilar
router.get('/:id/votes/aggregated', (req, res) => {
  try {
    const sessionId = req.params.id;
    const votes = db.votes.find({ session_id: sessionId });

    const pilares = {
      personal: {},
      equipos: {},
      desempenio: {},
      estrategia: {}
    };

    votes.forEach(v => {
      const pKey = v.pilar.toLowerCase();
      if (pilares[pKey]) {
        pilares[pKey][v.dolor] = (pilares[pKey][v.dolor] || 0) + (v.count || 1);
      }
    });

    res.json({
      success: true,
      data: {
        session_id: sessionId,
        total_votes: votes.reduce((acc, v) => acc + (v.count || 1), 0),
        pilares
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
