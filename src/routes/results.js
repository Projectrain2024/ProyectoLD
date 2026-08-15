const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/participants/:id/results - Retrieve participant individual results (R20-R23)
router.get('/:id/results', (req, res) => {
  try {
    const participantId = req.params.id;
    const participant = db.participants.findOne({ id: participantId });

    if (!participant) {
      return res.status(404).json({ success: false, error: 'Participante no encontrado' });
    }

    const session = db.sessions.findOne({ id: participant.session_id });
    const cachedResult = db.results.findOne({ participant_id: participantId });

    let dolores = {
      personal: [],
      equipos: [],
      desempenio: [],
      estrategia: []
    };

    if (cachedResult) {
      try {
        dolores = typeof cachedResult.dolores_json === 'string'
          ? JSON.parse(cachedResult.dolores_json)
          : cachedResult.dolores_json;
      } catch (e) {
        console.error('Error parsing cached results JSON:', e);
      }
    } else {
      // Recompute on-the-fly from votes
      const votes = db.votes.find({ participant_id: participantId });
      votes.forEach(v => {
        const pKey = v.pilar.toLowerCase();
        if (dolores[pKey]) {
          dolores[pKey].push(v.dolor);
        }
      });
    }

    const totalSelected = Object.values(dolores).reduce((acc, arr) => acc + (arr ? arr.length : 0), 0);

    res.json({
      success: true,
      data: {
        participant_id: participantId,
        company_name: participant.company_name,
        sector: participant.sector,
        session_title: session ? session.title : 'Sesión LHH',
        dolores,
        total_dolores: totalSelected,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
