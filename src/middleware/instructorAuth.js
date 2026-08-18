const crypto = require('crypto');

/**
 * Genera un token HMAC-SHA256 firmado con la contraseña del facilitador.
 * Formato: `<timestamp_ms>.<hmac>`
 */
function generateToken(password) {
  const timestamp = Date.now().toString();
  const hmac = crypto
    .createHmac('sha256', password)
    .update(timestamp)
    .digest('hex');
  return `${timestamp}.${hmac}`;
}

/**
 * Valida el token. Retorna true si es válido y no ha expirado.
 * Expiración: 8 horas (para cubrir un evento de día completo).
 */
function validateToken(token, password) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestamp, receivedHmac] = parts;
  const tsNumber = parseInt(timestamp, 10);
  if (isNaN(tsNumber)) return false;

  // Verificar expiración (8 horas)
  const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
  if (Date.now() - tsNumber > EIGHT_HOURS_MS) return false;

  // Verificar firma (comparación de tiempo constante para evitar timing attacks)
  const expectedHmac = crypto
    .createHmac('sha256', password)
    .update(timestamp)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedHmac, 'hex');
  const receivedBuf = Buffer.from(receivedHmac, 'hex');

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * Middleware Express: requiere un token válido en el header Authorization.
 * Uso: router.get('/ruta-protegida', instructorAuth, handler)
 */
function instructorAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const password = process.env.FACILITATOR_PASSWORD;
  if (!password) {
    // Si no hay contraseña configurada, loguear advertencia y permitir acceso
    // (para no bloquear deployments que aún no configuraron la variable)
    console.warn('[AUTH] ⚠️  FACILITATOR_PASSWORD no configurada. El panel del facilitador está abierto.');
    return next();
  }

  if (!validateToken(token, password)) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado. Se requiere autenticación de facilitador.'
    });
  }

  next();
}

module.exports = { instructorAuth, generateToken, validateToken };
