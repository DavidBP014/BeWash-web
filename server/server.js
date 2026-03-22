'use strict';

const path = require('path');
// Cargar .env siempre desde la carpeta server (funciona aunque ejecutes desde otra ruta)
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');

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

// Servir la página web desde la carpeta anterior (dtf)
app.use(express.static(path.join(__dirname, '..')));

// Asegurar carpeta de datos
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(REGISTROS_FILE)) {
  fs.writeFileSync(REGISTROS_FILE, '[]', 'utf8');
}

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
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  return { user, pass, ok: Boolean(user && pass) };
}

/**
 * Envía correo a EMAIL_CORPORATIVO usando la cuenta Gmail configurada (GMAIL_USER / GMAIL_APP_PASSWORD).
 * @param {{ subject: string, text: string, replyTo?: string }} opts
 * @returns {Promise<boolean>}
 */
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`BeWash: servidor en http://localhost:${PORT}`);
    console.log(`Página: http://localhost:${PORT}`);
    console.log(`Registros guardados en: ${REGISTROS_FILE}`);
  });
}

module.exports = app;
