const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { createObjectCsvStringifier } = require('csv-writer');

// GET /api/sessions/:id/report - Consolidated post-session report JSON (R17, R18)
router.get('/:id/report', (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = db.sessions.findOne({ id: sessionId });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
    }

    const participants = db.participants.find({ session_id: sessionId });
    const votes = db.votes.find({ session_id: sessionId });

    const registeredCount = participants.filter(p => p.company_name !== 'Empresa Anónima').length;
    const unregisteredCount = participants.length - registeredCount;

    const bySector = {};
    const bySize = {};

    participants.forEach(p => {
      bySector[p.sector] = (bySector[p.sector] || 0) + 1;
      bySize[p.employee_count] = (bySize[p.employee_count] || 0) + 1;
    });

    const pilares = {
      personal: { total_votes: 0, top_dolores: [], by_dolor: {} },
      equipos: { total_votes: 0, top_dolores: [], by_dolor: {} },
      desempenio: { total_votes: 0, top_dolores: [], by_dolor: {} },
      estrategia: { total_votes: 0, top_dolores: [], by_dolor: {} }
    };

    votes.forEach(v => {
      const pKey = v.pilar.toLowerCase();
      if (pilares[pKey]) {
        pilares[pKey].total_votes += (v.count || 1);
        pilares[pKey].by_dolor[v.dolor] = (pilares[pKey].by_dolor[v.dolor] || 0) + (v.count || 1);
      }
    });

    Object.keys(pilares).forEach(pKey => {
      const total = pilares[pKey].total_votes;
      const sorted = Object.entries(pilares[pKey].by_dolor)
        .map(([nombre, count]) => ({
          nombre,
          count,
          percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.count - a.count);

      pilares[pKey].top_dolores = sorted;
    });

    const insights = [];
    Object.keys(pilares).forEach(pKey => {
      const top = pilares[pKey].top_dolores[0];
      if (top && top.count > 0) {
        insights.push(`En el pilar ${pKey.toUpperCase()}, el dolor dominante es "${top.nombre}" con ${top.count} menciones (${top.percentage}% del pilar).`);
      }
    });

    const createdAt = new Date(session.created_at);
    const closedAt = session.closed_at ? new Date(session.closed_at) : new Date();
    const durationMinutes = Math.max(1, Math.round((closedAt - createdAt) / 60000));

    res.json({
      success: true,
      data: {
        session_id: sessionId,
        title: session.title,
        status: session.status,
        created_at: session.created_at,
        closed_at: session.closed_at,
        duration_minutes: durationMinutes,
        participant_count: participants.length,
        registered_count: registeredCount,
        unregistered_count: unregisteredCount,
        by_sector: bySector,
        by_size: bySize,
        pilares,
        insights,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sessions/:id/export/csv - Download raw votes CSV (R19)
router.get('/:id/export/csv', (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = db.sessions.findOne({ id: sessionId });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
    }

    const participants = db.participants.find({ session_id: sessionId });
    const votes = db.votes.find({ session_id: sessionId });

    const participantMap = new Map(participants.map(p => [p.id, p]));

    const records = votes.map(v => {
      const p = participantMap.get(v.participant_id) || {};
      return {
        session_id: sessionId,
        participant_id: v.participant_id,
        company_name: p.company_name || 'Empresa Anónima',
        sector: p.sector || 'Sin especificar',
        employee_count: p.employee_count || 'Sin especificar',
        email: p.email || '',
        pilar: v.pilar.toUpperCase(),
        dolor: v.dolor,
        count: v.count || 1,
        timestamp: v.created_at
      };
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'session_id', title: 'ID SESION' },
        { id: 'participant_id', title: 'ID PARTICIPANTE' },
        { id: 'company_name', title: 'EMPRESA' },
        { id: 'sector', title: 'SECTOR' },
        { id: 'employee_count', title: 'TAMAÑO EMPRESA' },
        { id: 'email', title: 'EMAIL' },
        { id: 'pilar', title: 'PILAR' },
        { id: 'dolor', title: 'DOLOR IDENTIFICADO' },
        { id: 'count', title: 'VOTOS' },
        { id: 'timestamp', title: 'FECHA REGISTRO' }
      ]
    });

    const csvOutput = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="LHH_Reporte_Sesion_${sessionId.substring(0, 8)}.csv"`);
    res.status(200).send('\uFEFF' + csvOutput);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
