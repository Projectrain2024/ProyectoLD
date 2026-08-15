const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const platformEvents = require('../services/EventEmitter');

// POST /api/sessions/:id/register - Register company participant (R6-R10)
router.post('/:id/register', (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = db.sessions.findOne({ id: sessionId });

    if (!session) {
      return res.status(404).json({ success: false, error: 'La sesión no existe' });
    }

    if (session.status === 'closed') {
      return res.status(403).json({ success: false, error: 'Esta sesión se encuentra cerrada' });
    }

    const { company_name, sector, employee_count, email, is_anonymous } = req.body;

    const participantId = crypto.randomUUID();
    const isAnon = is_anonymous || !company_name || company_name.trim() === '';

    const newParticipant = db.participants.insert({
      id: participantId,
      session_id: sessionId,
      company_name: isAnon ? 'Empresa Anónima' : company_name.trim(),
      sector: isAnon ? 'Sin especificar' : (sector || 'Otro'),
      employee_count: isAnon ? 'Sin especificar' : (employee_count || '1-50'),
      email: email ? email.trim() : null
    });

    // Notify instructor live dashboard via SSE stream
    platformEvents.emit(`session:${sessionId}`, {
      type: 'participant:joined',
      data: newParticipant
    });

    res.status(201).json({
      success: true,
      data: newParticipant
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/participants/:id - Get single participant detail
router.get('/:id', (req, res) => {
  try {
    const participant = db.participants.findOne({ id: req.params.id });
    if (!participant) {
      return res.status(404).json({ success: false, error: 'Participante no encontrado' });
    }
    res.json({ success: true, data: participant });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
