'use strict';

const fs = require('fs');
const path = require('path');

/** Mismo pathname en Blob para todos los despliegues del proyecto */
const BLOB_PATHNAME = 'bewash/admin-auth.json';

function adminAuthFilePath(dataDir) {
  return path.join(dataDir, 'admin_auth.json');
}

function normalizeAuth(data) {
  if (!data || typeof data !== 'object' || !data.users || typeof data.users !== 'object') {
    return { users: {} };
  }
  return data;
}

function readFs(dataDir) {
  const fp = adminAuthFilePath(dataDir);
  if (!fs.existsSync(fp)) return { users: {} };
  try {
    return normalizeAuth(JSON.parse(fs.readFileSync(fp, 'utf8')));
  } catch {
    return { users: {} };
  }
}

function writeFs(dataDir, data) {
  const fp = adminAuthFilePath(dataDir);
  fs.writeFileSync(fp, JSON.stringify(normalizeAuth(data), null, 2), 'utf8');
}

function useBlob() {
  return Boolean(String(process.env.BLOB_READ_WRITE_TOKEN || '').trim());
}

async function webStreamToString(stream) {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) out += dec.decode(value, { stream: true });
  }
  out += dec.decode();
  return out;
}

async function readFromBlob() {
  const { get } = await import('@vercel/blob');
  const res = await get(BLOB_PATHNAME, { access: 'private' });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  const raw = await webStreamToString(res.stream);
  try {
    return normalizeAuth(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeToBlob(data) {
  const { put } = await import('@vercel/blob');
  await put(BLOB_PATHNAME, JSON.stringify(normalizeAuth(data)), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8'
  });
}

/**
 * Lee el estado de contraseñas admin: Blob (persistente en Vercel) si hay token, si no disco.
 */
async function readAuth(dataDir) {
  if (useBlob()) {
    try {
      const fromBlob = await readFromBlob();
      if (fromBlob && Object.keys(fromBlob.users).length > 0) {
        return fromBlob;
      }
    } catch (e) {
      console.warn('[adminAuth] lectura Blob:', e && e.message ? e.message : e);
    }
  }
  return readFs(dataDir);
}

/**
 * Guarda estado: en Vercel con Blob escribe en Blob (y también en disco por coherencia local).
 */
async function writeAuth(dataDir, data) {
  const norm = normalizeAuth(data);
  if (useBlob()) {
    await writeToBlob(norm);
  }
  writeFs(dataDir, norm);
}

module.exports = {
  readAuth,
  writeAuth,
  useBlob,
  adminAuthFilePath
};
