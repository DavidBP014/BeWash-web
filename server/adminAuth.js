'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const storage = require('./adminAuthStorage');

const ALLOWED_ADMIN_EMAILS = new Set([
  'bewashsas1@gmail.com',
  'juandaballesteros014@gmail.com'
]);

const BCRYPT_ROUNDS = 10;

function jwtSecret() {
  return String(process.env.JWT_SECRET || '').trim();
}

function assertJwtSecret() {
  const s = jwtSecret();
  if (!s || s.length < 16) {
    const err = new Error('JWT_SECRET no configurado o demasiado corto (mín. 16 caracteres).');
    err.code = 'NO_JWT';
    throw err;
  }
  return s;
}

function esAdminAutorizado(email) {
  const e = String(email || '').trim().toLowerCase();
  return ALLOWED_ADMIN_EMAILS.has(e);
}

/**
 * Si un usuario autorizado aún no tiene hash, lo crea desde variables de entorno de arranque.
 */
async function bootstrapUsersIfNeeded(dataDir) {
  const auth = await storage.readAuth(dataDir);
  let changed = false;

  const bootstrapFor = (email, envKey) => {
    if (auth.users[email]) return;
    const plain = String(process.env[envKey] || '').trim();
    if (!plain) return;
    auth.users[email] = {
      passwordHash: bcrypt.hashSync(plain, BCRYPT_ROUNDS),
      updatedAt: new Date().toISOString()
    };
    changed = true;
  };

  bootstrapFor('bewashsas1@gmail.com', 'ADMIN_BOOTSTRAP_BEWASHSAS1');
  bootstrapFor('juandaballesteros014@gmail.com', 'ADMIN_BOOTSTRAP_JUANDABALLESTEROS014');

  const shared = String(process.env.ADMIN_INITIAL_PASSWORD || '').trim();
  if (shared) {
    for (const email of ALLOWED_ADMIN_EMAILS) {
      if (!auth.users[email]) {
        auth.users[email] = {
          passwordHash: bcrypt.hashSync(shared, BCRYPT_ROUNDS),
          updatedAt: new Date().toISOString()
        };
        changed = true;
      }
    }
  }

  if (changed) await storage.writeAuth(dataDir, auth);
  return auth;
}

async function obtenerHash(dataDir, email) {
  const e = String(email || '').trim().toLowerCase();
  const auth = await storage.readAuth(dataDir);
  return auth.users[e]?.passwordHash || null;
}

async function guardarNuevoPassword(dataDir, email, plainPassword) {
  const e = String(email || '').trim().toLowerCase();
  const auth = await storage.readAuth(dataDir);
  auth.users[e] = {
    passwordHash: bcrypt.hashSync(plainPassword, BCRYPT_ROUNDS),
    updatedAt: new Date().toISOString()
  };
  await storage.writeAuth(dataDir, auth);
}

function mensajeSinHash() {
  if (process.env.VERCEL && !storage.useBlob()) {
    return (
      'No hay contraseña guardada de forma persistente. En Vercel: Storage → Blob → conecta el store al proyecto (variable BLOB_READ_WRITE_TOKEN), ' +
      'o define ADMIN_INITIAL_PASSWORD / ADMIN_BOOTSTRAP_* y vuelve a iniciar sesión. ' +
      'Sin Blob, /tmp se borra y se pierde la contraseña tras un reinicio del servidor.'
    );
  }
  return (
    'Cuenta sin contraseña inicial. En el servidor define ADMIN_INITIAL_PASSWORD o ADMIN_BOOTSTRAP_* en las variables de entorno y reinicia.'
  );
}

async function verificarLogin(dataDir, email, password) {
  const e = String(email || '').trim().toLowerCase();
  if (!esAdminAutorizado(e)) return { ok: false, error: 'Credenciales incorrectas.' };
  await bootstrapUsersIfNeeded(dataDir);
  const hash = await obtenerHash(dataDir, e);
  if (!hash) {
    return { ok: false, error: mensajeSinHash() };
  }
  const match = await bcrypt.compare(String(password || ''), hash);
  if (!match) return { ok: false, error: 'Credenciales incorrectas.' };
  return { ok: true, email: e };
}

function emitirTokenSesion(email) {
  const secret = assertJwtSecret();
  const em = String(email || '').trim().toLowerCase();
  return jwt.sign({ sub: em, typ: 'admin' }, secret, { expiresIn: '7d' });
}

function verificarTokenSesion(authHeader) {
  try {
    const secret = assertJwtSecret();
    const raw = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (!raw) return null;
    const decoded = jwt.verify(raw, secret);
    if (decoded.typ !== 'admin' || !decoded.sub) return null;
    const em = String(decoded.sub).toLowerCase();
    if (!esAdminAutorizado(em)) return null;
    return em;
  } catch {
    return null;
  }
}

function emitirTokenReset(email) {
  const secret = assertJwtSecret();
  const em = String(email || '').trim().toLowerCase();
  return jwt.sign({ sub: em, typ: 'pwd-reset' }, secret, { expiresIn: '1h' });
}

function verificarTokenReset(token) {
  try {
    const secret = assertJwtSecret();
    const decoded = jwt.verify(String(token || ''), secret);
    if (decoded.typ !== 'pwd-reset' || !decoded.sub) return null;
    const em = String(decoded.sub).toLowerCase();
    if (!esAdminAutorizado(em)) return null;
    return em;
  } catch {
    return null;
  }
}

module.exports = {
  ALLOWED_ADMIN_EMAILS,
  adminAuthFilePath: storage.adminAuthFilePath,
  useBlobStorage: storage.useBlob,
  bootstrapUsersIfNeeded,
  esAdminAutorizado,
  verificarLogin,
  emitirTokenSesion,
  verificarTokenSesion,
  emitirTokenReset,
  verificarTokenReset,
  guardarNuevoPassword,
  jwtSecret,
  assertJwtSecret
};
