const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const platformEvents = require('../services/EventEmitter');

// GET /api/sessions - List all sessions with stats (for facilitator history)
router.get('/', (req, res) => {
  try {
    const sessions = db.sessions.find();
    // Sort sessions: open ones first, then by creation date descending
    const sorted = [...sessions].sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.status !== 'open' && b.status === 'open') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const data = sorted.map(s => {
      const participants = db.participants.find({ session_id: s.id });
      const votes = db.votes.find({ session_id: s.id });
      return {
        ...s,
        participant_count: participants.length,
        total_votes: votes.reduce((acc, v) => acc + (v.count || 1), 0)
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sessions - Create a new session (R1, R2, R3)
router.post('/', (req, res) => {
  try {
    const { title } = req.body;
    const sessionId = crypto.randomUUID();
    const newSession = db.sessions.insert({
      id: sessionId,
      title: title || 'Sesión de Diagnóstico LHH Colombia',
      status: 'open'
    });

    const protocol = req.protocol;
    const host = req.get('host');
    const shareableLink = `${protocol}://${host}/session/${sessionId}`;

    res.status(201).json({
      success: true,
      data: {
        ...newSession,
        shareable_link: shareableLink
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sessions/:id - Get session metadata & stats (R5)
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const session = db.sessions.findOne({ id });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
    }

    const participants = db.participants.find({ session_id: id });
    const votes = db.votes.find({ session_id: id });

    res.json({
      success: true,
      data: {
        ...session,
        participant_count: participants.length,
        total_votes: votes.reduce((acc, v) => acc + (v.count || 1), 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/sessions/:id - Close or update session (R4, R5)
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'closed', 'archived'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Estado inválido. Debe ser: open, closed, o archived' });
    }

    const existing = db.sessions.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
    }

    const updates = { status };
    if (status === 'closed' && !existing.closed_at) {
      updates.closed_at = new Date().toISOString();
    }

    const updatedSession = db.sessions.update(id, updates);

    // Broadcast session state change via SSE
    platformEvents.emit(`session:${id}`, {
      type: 'session:status',
      data: updatedSession
    });

    res.json({ success: true, data: updatedSession });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
