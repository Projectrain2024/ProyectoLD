const request = require('supertest');
const app = require('../src/server');
const db = require('../src/db/database');

beforeEach(() => {
  process.env.NODE_ENV = 'test';
  db.resetStore();
});

describe('Instructor-Led Event Platform - Complete Integration Tests', () => {

  test('1. Session Management: Create, Read & Close Session', async () => {
    // R1, R2, R3: Create Session
    const createRes = await request(app)
      .post('/api/sessions')
      .send({ title: 'Mesa Redonda Q3 LHH' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.id).toBeDefined();
    expect(createRes.body.data.shareable_link).toContain('/session/');
    expect(createRes.body.data.status).toBe('open');

    const sessionId = createRes.body.data.id;

    // R5: Fetch Session Metadata
    const getRes = await request(app).get(`/api/sessions/${sessionId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.participant_count).toBe(0);

    // R4: Close Session
    const patchRes = await request(app)
      .patch(`/api/sessions/${sessionId}`)
      .send({ status: 'closed' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe('closed');
    expect(patchRes.body.data.closed_at).toBeDefined();
  });

  test('2. Access & Registration: Register Company & Anonymous Participant', async () => {
    // Create session
    const sessionRes = await request(app).post('/api/sessions').send({});
    const sessionId = sessionRes.body.data.id;

    // R7: Registered Participant
    const regRes = await request(app)
      .post(`/api/sessions/${sessionId}/register`)
      .send({
        company_name: 'Bancolombia',
        sector: 'Financiero',
        employee_count: '500+',
        email: 'contacto@bancolombia.com'
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.company_name).toBe('Bancolombia');
    expect(regRes.body.data.sector).toBe('Financiero');

    // R8: Anonymous Participant
    const anonRes = await request(app)
      .post(`/api/sessions/${sessionId}/register`)
      .send({ is_anonymous: true });

    expect(anonRes.status).toBe(201);
    expect(anonRes.body.data.company_name).toBe('Empresa Anónima');
  });

  test('3. Data Capture & Votes: Record Exercise Selections', async () => {
    const sessionRes = await request(app).post('/api/sessions').send({});
    const sessionId = sessionRes.body.data.id;

    const regRes = await request(app)
      .post(`/api/sessions/${sessionId}/register`)
      .send({ company_name: 'TechCorp', sector: 'Tecnología', employee_count: '51-200' });
    const participantId = regRes.body.data.id;

    // R11, R12, R13: Submit Votes
    const voteRes = await request(app)
      .post(`/api/sessions/${sessionId}/votes`)
      .send({
        participant_id: participantId,
        votes: [
          { pilar: 'personal', dolor: 'Estrés y burnout', count: 1 },
          { pilar: 'equipos', dolor: 'Falta de alineación', count: 1 },
          { pilar: 'estrategia', dolor: 'Ejecución lenta', count: 1 }
        ]
      });

    expect(voteRes.status).toBe(201);
    expect(voteRes.body.count).toBe(3);

    // Verify Aggregation
    const aggRes = await request(app).get(`/api/sessions/${sessionId}/votes/aggregated`);
    expect(aggRes.status).toBe(200);
    expect(aggRes.body.data.total_votes).toBe(3);
    expect(aggRes.body.data.pilares.personal['Estrés y burnout']).toBe(1);
  });

  test('4. Participant Results View: Strict Data Isolation', async () => {
    const sessionRes = await request(app).post('/api/sessions').send({});
    const sessionId = sessionRes.body.data.id;

    // Register Company A
    const regA = await request(app)
      .post(`/api/sessions/${sessionId}/register`)
      .send({ company_name: 'Empresa A', sector: 'Salud', employee_count: '1-50' });
    const partAId = regA.body.data.id;

    await request(app)
      .post(`/api/sessions/${sessionId}/votes`)
      .send({
        participant_id: partAId,
        votes: [{ pilar: 'personal', dolor: 'Resistencia al cambio', count: 1 }]
      });

    // R20, R22: Results contain ONLY Company A's selections
    const resA = await request(app).get(`/api/participants/${partAId}/results`);
    expect(resA.status).toBe(200);
    expect(resA.body.data.company_name).toBe('Empresa A');
    expect(resA.body.data.dolores.personal).toContain('Resistencia al cambio');
    expect(resA.body.data.total_dolores).toBe(1);
  });

  test('5. Instructor Dashboard & Post-Event CSV Export', async () => {
    const sessionRes = await request(app).post('/api/sessions').send({});
    const sessionId = sessionRes.body.data.id;

    const reg = await request(app)
      .post(`/api/sessions/${sessionId}/register`)
      .send({ company_name: 'Empresa B', sector: 'Manufactura', employee_count: '201-500' });
    const pId = reg.body.data.id;

    await request(app)
      .post(`/api/sessions/${sessionId}/votes`)
      .send({
        participant_id: pId,
        votes: [{ pilar: 'desempenio', dolor: 'Metas ambiguas', count: 1 }]
      });

    // R14: Snapshot API
    const snapRes = await request(app).get(`/api/sessions/${sessionId}/snapshot`);
    expect(snapRes.status).toBe(200);
    expect(snapRes.body.data.participant_count).toBe(1);

    // R17: Post-Event Report JSON
    const reportRes = await request(app).get(`/api/sessions/${sessionId}/report`);
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.data.registered_count).toBe(1);
    expect(reportRes.body.data.pilares.desempenio.total_votes).toBe(1);

    // R19: Raw CSV Export
    const csvRes = await request(app).get(`/api/sessions/${sessionId}/export/csv`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.header['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('EMPRESA');
    expect(csvRes.text).toContain('Empresa B');
    expect(csvRes.text).toContain('Metas ambiguas');
  });

});
