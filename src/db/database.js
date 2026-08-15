const fs = require('fs');
const path = require('path');

const dataFilePath = process.env.NODE_ENV === 'test'
  ? null
  : path.join(__dirname, '../../platform-data.json');

const defaultTaxonomy = [
  // Personal (8)
  { id: 'p1', pilar: 'personal', nombre: 'Falta de autoconciencia', descripcion: 'Poca claridad sobre fortalezas y áreas de mejora personales.', active: 1 },
  { id: 'p2', pilar: 'personal', nombre: 'Baja empatía', descripcion: 'Dificultad para conectar y comprender las necesidades de otros.', active: 1 },
  { id: 'p3', pilar: 'personal', nombre: 'Estrés y burnout', descripcion: 'Agotamiento físico y mental acumulado en el rol.', active: 1 },
  { id: 'p4', pilar: 'personal', nombre: 'Resistencia al cambio', descripcion: 'Aversión a adaptar hábitos y metodologías de trabajo.', active: 1 },
  { id: 'p5', pilar: 'personal', nombre: 'Dificultad para delegar', descripcion: 'Sobrecarga individual por falta de confianza en la delegación.', active: 1 },
  { id: 'p6', pilar: 'personal', nombre: 'Comunicación ineficaz', descripcion: 'Mensajes ambiguos o falta de asertividad interpersonal.', active: 1 },
  { id: 'p7', pilar: 'personal', nombre: 'Gestión del tiempo deficiente', descripcion: 'Problemas de priorización y procrastinación.', active: 1 },
  { id: 'p8', pilar: 'personal', nombre: 'Inseguridad de liderazgo', descripcion: 'Dudas sobre la capacidad para guiar decisiones estratégicas.', active: 1 },

  // Equipos (8)
  { id: 'e1', pilar: 'equipos', nombre: 'Falta de alineación', descripcion: 'Miembros trabajando en direcciones opuestas o descoordinadas.', active: 1 },
  { id: 'e2', pilar: 'equipos', nombre: 'Conflictos no resueltos', descripcion: 'Tensiones internas que afectan el clima laboral.', active: 1 },
  { id: 'e3', pilar: 'equipos', nombre: 'Bajo compromiso', descripcion: 'Falta de motivación e involucramiento con los objetivos.', active: 1 },
  { id: 'e4', pilar: 'equipos', nombre: 'Silos entre departamentos', descripcion: 'Barreras de comunicación entre áreas operativas.', active: 1 },
  { id: 'e5', pilar: 'equipos', nombre: 'Falta de confianza', descripcion: 'Falta de vulnerabilidad y seguridad psicológica.', active: 1 },
  { id: 'e6', pilar: 'equipos', nombre: 'Roles no claros', descripcion: 'Ambigüedad en responsabilidades y expectativas.', active: 1 },
  { id: 'e7', pilar: 'equipos', nombre: 'Mala colaboración remota', descripcion: 'Fricción en entornos de trabajo híbridos o distribuidos.', active: 1 },
  { id: 'e8', pilar: 'equipos', nombre: 'Alta rotación de personal', descripcion: 'Pérdida constante de talento clave en el equipo.', active: 1 },

  // Desempeño (8)
  { id: 'd1', pilar: 'desempenio', nombre: 'Metas ambiguas', descripcion: 'Objetivos poco definidos o sin métricas claras.', active: 1 },
  { id: 'd2', pilar: 'desempenio', nombre: 'Falta de seguimiento (KPIs)', descripcion: 'Ausencia de monitoreo periódico de resultados.', active: 1 },
  { id: 'd3', pilar: 'desempenio', nombre: 'Retroalimentación escasa', descripcion: 'Evaluaciones puntuales sin feedback continuo.', active: 1 },
  { id: 'd4', pilar: 'desempenio', nombre: 'Desempeño inconsistente', descripcion: 'Falta de estándares de calidad uniformes.', active: 1 },
  { id: 'd5', pilar: 'desempenio', nombre: 'Falta de capacitación', descripcion: 'Brechas de competencias para ejecutar responsabilidades.', active: 1 },
  { id: 'd6', pilar: 'desempenio', nombre: 'Baja productividad', descripcion: 'Ineficiencias operativas y desperdicio de recursos.', active: 1 },
  { id: 'd7', pilar: 'desempenio', nombre: 'Falta de innovación', descripcion: 'Cultura orientada al mantenimiento sin proponer mejoras.', active: 1 },
  { id: 'd8', pilar: 'desempenio', nombre: 'Falta de rendición de cuentas', descripcion: 'Nadie asume la responsabilidad final de los resultados.', active: 1 },

  // Estrategia (9)
  { id: 's1', pilar: 'estrategia', nombre: 'Visión no compartida', descripcion: 'El propósito organizacional no permea a todos los niveles.', active: 1 },
  { id: 's2', pilar: 'estrategia', nombre: 'Ejecución lenta', descripcion: 'Planes estratégicos que tardan demasiado en implementarse.', active: 1 },
  { id: 's3', pilar: 'estrategia', nombre: 'Falta de foco estratégico', descripcion: 'Dispersión de esfuerzos en múltiples iniciativas menores.', active: 1 },
  { id: 's4', pilar: 'estrategia', nombre: 'Adaptación tardía al mercado', descripcion: 'Lentitud para reaccionar ante cambios del entorno.', active: 1 },
  { id: 's5', pilar: 'estrategia', nombre: 'Desconexión con el cliente', descripcion: 'Propuestas de valor desalineadas con la necesidad real.', active: 1 },
  { id: 's6', pilar: 'estrategia', nombre: 'Prioridades cambiantes', descripcion: 'Giro constante de objetivos sin consolidar metas.', active: 1 },
  { id: 's7', pilar: 'estrategia', nombre: 'Falta de agilidad', descripcion: 'Estructuras rígidas que impiden respuestas rápidas.', active: 1 },
  { id: 's8', pilar: 'estrategia', nombre: 'Mano de obra no preparada', descripcion: 'Falta de desarrollo de capacidades futuras.', active: 1 },
  { id: 's9', pilar: 'estrategia', nombre: 'Falta de recursos clave', descripcion: 'Presupuestos u herramientas insuficientes para la estrategia.', active: 1 }
];

let store = {
  sessions: [],
  participants: [],
  votes: [],
  results: [],
  dolor_taxonomy: [...defaultTaxonomy]
};

function loadStore() {
  if (dataFilePath && fs.existsSync(dataFilePath)) {
    try {
      const raw = fs.readFileSync(dataFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      store = {
        sessions: parsed.sessions || [],
        participants: parsed.participants || [],
        votes: parsed.votes || [],
        results: parsed.results || [],
        dolor_taxonomy: [...defaultTaxonomy]
      };
    } catch (e) {
      console.error('Error reading data file:', e.message);
    }
  }
}

function saveStore() {
  if (dataFilePath) {
    try {
      fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
      console.error('Error writing data file:', e.message);
    }
  }
}

function resetStore() {
  store = {
    sessions: [],
    participants: [],
    votes: [],
    results: [],
    dolor_taxonomy: [...defaultTaxonomy]
  };
  saveStore();
}

loadStore();

module.exports = {
  getStore: () => store,
  saveStore,
  resetStore,
  
  sessions: {
    find: (filter = {}) => store.sessions.filter(s => Object.keys(filter).every(k => s[k] === filter[k])),
    findOne: (filter = {}) => store.sessions.find(s => Object.keys(filter).every(k => s[k] === filter[k])),
    insert: (doc) => {
      const newDoc = {
        id: doc.id,
        title: doc.title || 'Sesión de Diagnóstico LHH Colombia',
        created_at: doc.created_at || new Date().toISOString(),
        closed_at: doc.closed_at || null,
        status: doc.status || 'open'
      };
      store.sessions.push(newDoc);
      saveStore();
      return newDoc;
    },
    update: (id, updates) => {
      const idx = store.sessions.findIndex(s => s.id === id);
      if (idx !== -1) {
        store.sessions[idx] = { ...store.sessions[idx], ...updates };
        saveStore();
        return store.sessions[idx];
      }
      return null;
    }
  },

  participants: {
    find: (filter = {}) => store.participants.filter(p => Object.keys(filter).every(k => p[k] === filter[k])),
    findOne: (filter = {}) => store.participants.find(p => Object.keys(filter).every(k => p[k] === filter[k])),
    insert: (doc) => {
      const newDoc = {
        id: doc.id,
        session_id: doc.session_id,
        company_name: doc.company_name,
        sector: doc.sector,
        employee_count: doc.employee_count,
        email: doc.email || null,
        created_at: doc.created_at || new Date().toISOString()
      };
      store.participants.push(newDoc);
      saveStore();
      return newDoc;
    }
  },

  votes: {
    find: (filter = {}) => store.votes.filter(v => Object.keys(filter).every(k => v[k] === filter[k])),
    upsertVote: (doc) => {
      const existing = store.votes.find(v => 
        v.session_id === doc.session_id &&
        v.participant_id === doc.participant_id &&
        v.pilar === doc.pilar &&
        v.dolor === doc.dolor
      );
      if (existing) {
        existing.count = doc.count !== undefined ? doc.count : existing.count + 1;
        existing.created_at = new Date().toISOString();
        saveStore();
        return existing;
      } else {
        const newVote = {
          id: store.votes.length + 1,
          session_id: doc.session_id,
          participant_id: doc.participant_id,
          pilar: doc.pilar,
          dolor: doc.dolor,
          count: doc.count !== undefined ? doc.count : 1,
          created_at: new Date().toISOString()
        };
        store.votes.push(newVote);
        saveStore();
        return newVote;
      }
    }
  },

  results: {
    findOne: (filter = {}) => store.results.find(r => Object.keys(filter).every(k => r[k] === filter[k])),
    upsert: (doc) => {
      const idx = store.results.findIndex(r => r.participant_id === doc.participant_id);
      const record = {
        id: doc.id || (idx !== -1 ? store.results[idx].id : String(Date.now())),
        participant_id: doc.participant_id,
        session_id: doc.session_id,
        dolores_json: typeof doc.dolores_json === 'string' ? doc.dolores_json : JSON.stringify(doc.dolores_json),
        created_at: new Date().toISOString()
      };
      if (idx !== -1) {
        store.results[idx] = record;
      } else {
        store.results.push(record);
      }
      saveStore();
      return record;
    }
  },

  taxonomy: {
    findAll: () => store.dolor_taxonomy,
    findByPilar: (pilar) => store.dolor_taxonomy.filter(t => t.pilar === pilar)
  }
};
