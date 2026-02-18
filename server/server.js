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
const DATA_DIR = path.join(__dirname, 'data');
const REGISTROS_FILE = path.join(DATA_DIR, 'registros.json');

// Solo aceptar JSON en el body; los datos viajan cifrados si usas HTTPS
app.use(express.json({ limit: '10kb' }));
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

function guardarRegistro(registro) {
  const lista = leerRegistros();
  registro.id = Date.now();
  registro.fecha = new Date().toISOString();
  lista.push(registro);
  fs.writeFileSync(REGISTROS_FILE, JSON.stringify(lista, null, 2), 'utf8');
}

// Correo corporativo: misma data que la DB llega aquí para comunicación con el cliente
const EMAIL_CORPORATIVO = 'Bewashsas1@gmail.com';

async function enviarEmail(datos) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn('[EMAIL] Falta GMAIL_USER o GMAIL_APP_PASSWORD en .env - no se envía correo a', EMAIL_CORPORATIVO);
    throw new Error('Correo no configurado: falta GMAIL_USER o GMAIL_APP_PASSWORD en .env');
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
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
Responder desde Bewashsas1@gmail.com para gestionar la comunicación con el cliente.
  `.trim();
  try {
    await transporter.sendMail({
      from: user,
      to: EMAIL_CORPORATIVO,
      subject: `BeWash - Nuevo registro: ${datos.nombreCompleto}`,
      text: texto
    });
    console.log('[EMAIL] Correo enviado correctamente a', EMAIL_CORPORATIVO, '- Asunto:', datos.nombreCompleto);
  } catch (err) {
    console.error('[EMAIL] Error al enviar:', err.message);
    throw err;
  }
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
    const registro = {
      nombreCompleto: String(nombreCompleto).trim(),
      email: String(email).trim(),
      telefono: String(telefono).trim(),
      cedula: String(cedula).trim(),
      vehiculo: String(vehiculo).trim(),
      placa: String(placa).trim(),
      terminos: true
    };
    guardarRegistro(registro);
    await enviarEmail(registro);
    res.json({ ok: true, mensaje: 'Registro guardado. Te contactaremos pronto.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al procesar el registro' });
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

app.listen(PORT, () => {
  console.log(`BeWash: servidor en http://localhost:${PORT}`);
  console.log(`Página: http://localhost:${PORT}`);
  console.log(`Registros guardados en: ${REGISTROS_FILE}`);
});
