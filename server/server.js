'use strict';

const path = require('path');
// Cargar .env siempre desde la carpeta server (funciona aunque ejecutes desde otra ruta)
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const adminAuth = require('./adminAuth');
const { htmlNotificacionBeWashCliente, textoPlanoNotificacion } = require('./emailNotificacionCliente');

const app = express();
const PORT = process.env.PORT || 3001;
// En Vercel el filesystem del proyecto es de solo lectura; /tmp es escribible (datos no persistentes entre reinicios).
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'bewash-data')
  : path.join(__dirname, 'data');
const REGISTROS_FILE = path.join(DATA_DIR, 'registros.json');

// Solo aceptar JSON en el body; los datos viajan cifrados si usas HTTPS
app.use(express.json({ limit: '32kb' }));
app.use(cors({ origin: true })); // En producción restringe a tu dominio

// Asegurar carpeta de datos
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(REGISTROS_FILE)) {
  fs.writeFileSync(REGISTROS_FILE, '[]', 'utf8');
}

adminAuth.bootstrapUsersIfNeeded(DATA_DIR);

function leerRegistros() {
  const data = fs.readFileSync(REGISTROS_FILE, 'utf8');
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Validaciones de seguridad (evitar datos falsos)
const DOMINIOS_DESECHABLES = [
  '10minutemail', 'guerrillamail', 'tempmail', 'mailinator', 'temp-mail',
  'throwaway', 'fakeinbox', 'yopmail', 'maildrop', 'trashmail',
  'sharklasers', 'guerrillamailblock', 'spamgourmet', 'tempinbox',
  'getnada', 'dispostable', 'mohmal', 'emailondeck', 'tempail',
  'inboxkitten', 'mytrashmail', 'mintemail', 'trashmail'
];

function validarDatos({ email, telefono, cedula, placa }) {
  const e = String(email || '').trim().toLowerCase();
  const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regexEmail.test(e)) return { ok: false, error: 'Correo electrónico inválido.' };
  const dominio = e.split('@')[1] || '';
  const esDesechable = DOMINIOS_DESECHABLES.some(d => dominio.includes(d));
  if (esDesechable) return { ok: false, error: 'No se permiten correos temporales o desechables.' };
  if (dominio.endsWith('.test') || dominio.endsWith('.local') || dominio.endsWith('.example')) {
    return { ok: false, error: 'Dominio de correo no válido.' };
  }

  const tel = String(telefono || '').replace(/\D/g, '');
  if (tel.length !== 10) return { ok: false, error: 'El teléfono debe tener 10 dígitos.' };
  if (!/^3[0-9]{9}$/.test(tel)) return { ok: false, error: 'Teléfono móvil colombiano debe empezar por 3.' };

  const cc = String(cedula || '').replace(/\D/g, '');
  if (cc.length < 6 || cc.length > 10) return { ok: false, error: 'La cédula debe tener entre 6 y 10 dígitos.' };

  const pl = String(placa || '').trim().toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z]{3}\d{3}[A-Z]?$/.test(pl)) return { ok: false, error: 'Placa inválida. Formato: ABC123 o ABC123D.' };

  return { ok: true };
}

function guardarRegistro(registro) {
  const lista = leerRegistros();
  registro.id = Date.now();
  registro.fecha = new Date().toISOString();
  lista.push(registro);
  fs.writeFileSync(REGISTROS_FILE, JSON.stringify(lista, null, 2), 'utf8');
}

// Correo donde recibes registros y contactos (Gmail ignora mayúsculas; puedes sobreescribir con EMAIL_TO en Vercel)
const EMAIL_CORPORATIVO = String(process.env.EMAIL_TO || 'bewashsas1@gmail.com')
  .trim()
  .toLowerCase();

function credencialesMailOk() {
  const user = String(process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.GMAIL_APP_PASSWORD || '')
    .trim()
    .replace(/\s+/g, '');
  return { user, pass, ok: Boolean(user && pass) };
}

/**
 * Envía correo a EMAIL_CORPORATIVO usando la cuenta Gmail configurada (GMAIL_USER / GMAIL_APP_PASSWORD).
 * @param {{ subject: string, text: string, replyTo?: string }} opts
 * @returns {Promise<boolean>}
 */
function urlBasePublica(req) {
  const fromEnv = String(process.env.PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = req.get('x-forwarded-proto') || (process.env.VERCEL ? 'https' : 'http');
  if (host) return `${proto}://${host}`.replace(/\/$/, '');
  return `http://localhost:${PORT}`;
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
async function enviarCorreoHtml(opts) {
  const { user, pass, ok } = credencialesMailOk();
  if (!ok) {
    console.warn('[EMAIL] Falta GMAIL_USER o GMAIL_APP_PASSWORD — no se envía HTML a', opts.to);
    return { ok: false, error: 'Falta GMAIL_USER o GMAIL_APP_PASSWORD en el servidor.' };
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
  try {
    await transporter.sendMail({
      from: user,
      to: opts.to,
      subject: opts.subject,
      text: opts.text || 'BeWash — abre este mensaje en un cliente que permita HTML.',
      html: opts.html
    });
    console.log('[EMAIL] HTML enviado a', opts.to, '-', opts.subject);
    return { ok: true };
  } catch (err) {
    const msg = err && err.message ? String(err.message) : 'Error desconocido';
    console.error('[EMAIL] Error al enviar HTML:', msg);
    let hint = msg;
    if (/Invalid login|535|EAUTH|authentication failed/i.test(msg)) {
      hint =
        'Gmail rechazó el inicio de sesión. Revisa GMAIL_USER y GMAIL_APP_PASSWORD (contraseña de aplicación de Google, sin espacios).';
    }
    return { ok: false, error: hint };
  }
}

async function enviarCorreoCorporativo(opts) {
  const { user, pass, ok } = credencialesMailOk();
  if (!ok) {
    console.warn('[EMAIL] Falta GMAIL_USER o GMAIL_APP_PASSWORD — no se envía a', EMAIL_CORPORATIVO);
    return false;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
  const mail = {
    from: user,
    to: EMAIL_CORPORATIVO,
    subject: opts.subject,
    text: opts.text
  };
  if (opts.replyTo) {
    mail.replyTo = opts.replyTo;
  }
  try {
    await transporter.sendMail(mail);
    console.log('[EMAIL] Enviado a', EMAIL_CORPORATIVO, '-', opts.subject);
    return true;
  } catch (err) {
    console.error('[EMAIL] Error al enviar:', err.message);
    return false;
  }
}

/** Registro de mensualidad → mismo correo corporativo. */
async function enviarEmailRegistro(datos) {
  const texto = `
BeWash - Nuevo registro de mensualidad
(Estos son los mismos datos guardados en la base de datos.)

Nombre completo: ${datos.nombreCompleto}
Correo electrónico: ${datos.email}
Teléfono: ${datos.telefono}
Cédula: ${datos.cedula}
Tipo de vehículo: ${datos.vehiculo}
Placa del vehículo: ${datos.placa}
Aceptó términos y política de privacidad: Sí
Fecha y hora: ${datos.fecha}

---
Puedes responder a este cliente usando "Responder" (Reply-To: ${datos.email}).
  `.trim();
  return enviarCorreoCorporativo({
    subject: `BeWash - Nuevo registro: ${datos.nombreCompleto}`,
    text: texto,
    replyTo: datos.email
  });
}

// POST /api/registro - Solo se usa desde tu página; datos en body (HTTPS recomendado)
app.post('/api/registro', async (req, res) => {
  try {
    const { nombreCompleto, email, telefono, cedula, vehiculo, placa, terminos } = req.body || {};
    if (!nombreCompleto || !email || !telefono || !cedula || !vehiculo || !placa) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }
    if (!terminos) {
      return res.status(400).json({ ok: false, error: 'Debes aceptar términos y política de privacidad' });
    }
    const validacion = validarDatos({ email, telefono, cedula, placa });
    if (!validacion.ok) {
      return res.status(400).json({ ok: false, error: validacion.error });
    }
    const registro = {
      nombreCompleto: String(nombreCompleto).trim(),
      email: String(email).trim().toLowerCase(),
      telefono: String(telefono).replace(/\D/g, ''),
      cedula: String(cedula).replace(/\D/g, ''),
      vehiculo: String(vehiculo).trim(),
      placa: String(placa).trim().toUpperCase().replace(/\s/g, ''),
      terminos: true
    };
    guardarRegistro(registro);
    const emailOk = await enviarEmailRegistro(registro);
    res.json({
      ok: true,
      mensaje: emailOk
        ? 'Registro guardado. Te contactaremos pronto.'
        : `Registro guardado. No se pudo enviar la notificación a ${EMAIL_CORPORATIVO}: en Vercel → Settings → Environment Variables añade GMAIL_USER y GMAIL_APP_PASSWORD (contraseña de aplicación de Google).`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al procesar el registro' });
  }
});

const REGEX_EMAIL_SIMPLE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// POST /api/contacto — formulario "Contáctanos" del sitio
app.post('/api/contacto', async (req, res) => {
  try {
    const { nombre, email, telefono, mensaje } = req.body || {};
    if (!nombre || !email || !telefono || !mensaje) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios.' });
    }
    const nombreLimpio = String(nombre).trim();
    const e = String(email).trim().toLowerCase();
    if (!REGEX_EMAIL_SIMPLE.test(e)) {
      return res.status(400).json({ ok: false, error: 'Correo electrónico inválido.' });
    }
    const dominio = e.split('@')[1] || '';
    const esDesechable = DOMINIOS_DESECHABLES.some(d => dominio.includes(d));
    if (esDesechable) {
      return res.status(400).json({ ok: false, error: 'No se permiten correos temporales o desechables.' });
    }
    const tel = String(telefono).replace(/\D/g, '');
    if (tel.length < 7 || tel.length > 15) {
      return res.status(400).json({ ok: false, error: 'Teléfono no válido.' });
    }
    const msg = String(mensaje).trim();
    if (msg.length < 5) {
      return res.status(400).json({ ok: false, error: 'Escribe un mensaje un poco más largo.' });
    }
    if (msg.length > 4000) {
      return res.status(400).json({ ok: false, error: 'Mensaje demasiado largo.' });
    }

    const texto = `
BeWash - Mensaje desde el formulario de contacto (sitio web)

Nombre: ${nombreLimpio}
Correo: ${e}
Teléfono: ${tel}

Mensaje:
${msg}
`.trim();

    const enviado = await enviarCorreoCorporativo({
      subject: `BeWash - Contacto web: ${nombreLimpio.slice(0, 80)}`,
      text: texto,
      replyTo: e
    });

    if (!enviado) {
      return res.status(503).json({
        ok: false,
        error:
          'No se pudo enviar el mensaje: falta configurar el correo en el servidor. En Vercel añade GMAIL_USER y GMAIL_APP_PASSWORD (cuenta Gmail con contraseña de aplicación).'
      });
    }
    res.json({ ok: true, mensaje: 'Mensaje enviado. Te responderemos pronto.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al enviar el mensaje. Intenta más tarde.' });
  }
});

// GET /api/admin/registros?key=TU_ADMIN_KEY - Solo para ver los registros (guarda la clave)
app.get('/api/admin/registros', (req, res) => {
  const key = process.env.ADMIN_KEY;
  if (!key || req.query.key !== key) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }
  res.json(leerRegistros());
});

function adminJwtMiddleware(req, res, next) {
  try {
    adminAuth.assertJwtSecret();
  } catch (e) {
    if (e && e.code === 'NO_JWT') {
      return res.status(503).json({
        ok: false,
        error:
          'El panel admin requiere JWT_SECRET en variables de entorno (cadena segura de al menos 16 caracteres).'
      });
    }
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Error de configuración del servidor.' });
  }
  const email = adminAuth.verificarTokenSesion(req.get('authorization'));
  if (!email) {
    return res.status(401).json({ ok: false, error: 'Sesión no válida o expirada. Inicia sesión de nuevo.' });
  }
  req.adminEmail = email;
  next();
}

// POST /api/admin/login
app.post('/api/admin/login', async (req, res) => {
  try {
    adminAuth.assertJwtSecret();
  } catch (e) {
    if (e && e.code === 'NO_JWT') {
      return res.status(503).json({
        ok: false,
        error:
          'Configura JWT_SECRET en el servidor (Vercel → Environment Variables) con al menos 16 caracteres aleatorios.'
      });
    }
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Error de configuración del servidor.' });
  }
  try {
    const { email, password } = req.body || {};
    const v = await adminAuth.verificarLogin(DATA_DIR, email, password);
    if (!v.ok) {
      return res.status(401).json({ ok: false, error: v.error });
    }
    const token = adminAuth.emitirTokenSesion(v.email);
    res.json({ ok: true, token, email: v.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al iniciar sesión.' });
  }
});

// GET /api/admin/me
app.get('/api/admin/me', (req, res) => {
  try {
    adminAuth.assertJwtSecret();
  } catch (e) {
    if (e && e.code === 'NO_JWT') {
      return res.status(503).json({ ok: false, error: 'Falta JWT_SECRET en el servidor.' });
    }
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Error de configuración del servidor.' });
  }
  const email = adminAuth.verificarTokenSesion(req.get('authorization'));
  if (!email) {
    return res.status(401).json({ ok: false, error: 'No autenticado.' });
  }
  res.json({ ok: true, email });
});

// POST /api/admin/solicitar-recuperacion — envía enlace al correo del admin
app.post('/api/admin/solicitar-recuperacion', async (req, res) => {
  try {
    try {
      adminAuth.assertJwtSecret();
    } catch (e) {
      if (e && e.code === 'NO_JWT') {
        return res.status(503).json({ ok: false, error: 'Falta JWT_SECRET en el servidor.' });
      }
      console.error(e);
      return res.status(500).json({ ok: false, error: 'Error de configuración del servidor (JWT).' });
    }

    const { email } = req.body || {};
    const e = String(email || '').trim().toLowerCase();
    if (!REGEX_EMAIL_SIMPLE.test(e)) {
      return res.status(400).json({ ok: false, error: 'Correo no válido.' });
    }
    if (!adminAuth.esAdminAutorizado(e)) {
      return res.status(403).json({ ok: false, error: 'Correo no autorizado.' });
    }
    const { ok } = credencialesMailOk();
    if (!ok) {
      return res.status(503).json({
        ok: false,
        error: 'No se puede enviar el correo: configura GMAIL_USER y GMAIL_APP_PASSWORD en Vercel o en server/.env.'
      });
    }
    const token = adminAuth.emitirTokenReset(e);
    const base = urlBasePublica(req);
    const link = `${base}/admin/recuperar.html?token=${encodeURIComponent(token)}`;
    const mailResult = await enviarCorreoHtml({
      to: e,
      subject: 'BeWash — Restablecer contraseña del panel admin',
      text: `Hola,\n\nPara crear una nueva contraseña del panel administrativo de BeWash, abre este enlace (válido 1 hora):\n\n${link}\n\nSi no solicitaste este cambio, ignora este mensaje.\n`,
      html: `<p>Hola,</p><p>Para <strong>restablecer tu contraseña</strong> del panel administrativo de BeWash, pulsa el botón (válido 1 hora):</p><p><a href="${link}" style="display:inline-block;background:#118282;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Restablecer contraseña</a></p><p>O copia este enlace:<br><span style="word-break:break-all;">${escapeHtmlEmail(
        link
      )}</span></p><p style="color:#666;font-size:13px;">Si no solicitaste este cambio, ignora este mensaje.</p>`
    });
    if (!mailResult.ok) {
      return res.status(503).json({
        ok: false,
        error: mailResult.error || 'No se pudo enviar el correo. Revisa la configuración SMTP.'
      });
    }
    res.json({
      ok: true,
      mensaje: 'Revisa tu bandeja de entrada (y spam) para continuar con el restablecimiento.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al procesar la solicitud.' });
  }
});

function escapeHtmlEmail(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

// POST /api/admin/restablecer-contrasena
app.post('/api/admin/restablecer-contrasena', (req, res) => {
  try {
    adminAuth.assertJwtSecret();
  } catch (e) {
    if (e && e.code === 'NO_JWT') {
      return res.status(503).json({ ok: false, error: 'Falta JWT_SECRET en el servidor.' });
    }
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Error de configuración del servidor.' });
  }
  try {
    const { token, newPassword } = req.body || {};
    const email = adminAuth.verificarTokenReset(token);
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Enlace inválido o expirado. Solicita un nuevo correo de recuperación.' });
    }
    const pwd = String(newPassword || '');
    if (pwd.length < 8) {
      return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    adminAuth.guardarNuevoPassword(DATA_DIR, email, pwd);
    res.json({ ok: true, mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al guardar la contraseña.' });
  }
});

// POST /api/admin/enviar-notificacion-cliente — correo al cliente (diseño HTML)
app.post('/api/admin/enviar-notificacion-cliente', adminJwtMiddleware, async (req, res) => {
  try {
    const { emailCliente } = req.body || {};
    const dest = String(emailCliente || '').trim().toLowerCase();
    if (!REGEX_EMAIL_SIMPLE.test(dest)) {
      return res.status(400).json({ ok: false, error: 'Correo del cliente no válido.' });
    }
    const dominio = dest.split('@')[1] || '';
    const esDesechable = DOMINIOS_DESECHABLES.some(d => dominio.includes(d));
    if (esDesechable) {
      return res.status(400).json({ ok: false, error: 'No se permiten correos temporales o desechables.' });
    }
    const base = urlBasePublica(req);
    const html = htmlNotificacionBeWashCliente({ baseUrl: base, emailCliente: dest });
    const text = textoPlanoNotificacion(dest, base);
    const mailResult = await enviarCorreoHtml({
      to: dest,
      subject: 'Be Wash — Bono mensual: 1.er, 2.º y 3.er uso (un solo correo)',
      text,
      html
    });
    if (!mailResult.ok) {
      return res.status(503).json({
        ok: false,
        error:
          mailResult.error ||
          'No se pudo enviar: configura GMAIL_USER y GMAIL_APP_PASSWORD en el servidor (contraseña de aplicación de Google).'
      });
    }
    res.json({ ok: true, mensaje: `Notificación enviada a ${dest}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al enviar el correo.' });
  }
});

// Archivos estáticos al final: no interceptan rutas /api (y evita respuestas HTML inesperadas en algunos despliegues)
app.use(express.static(path.join(__dirname, '..')));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`BeWash: servidor en http://localhost:${PORT}`);
    console.log(`Página: http://localhost:${PORT}`);
    console.log(`Registros guardados en: ${REGISTROS_FILE}`);
  });
}

module.exports = app;
