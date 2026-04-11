'use strict';

/**
 * Correo único con las tres variantes de uso de mensual (1.er, 2.º y 3.er) apiladas.
 * Basado en el estilo del recurso [Email notification (Figma)](https://www.figma.com/design/jVOFGqb5XZoyfs8YwllC73/Email-notification-saul--Community-?node-id=0-1).
 */

const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
];

const PUNTOS_SERVICIO =
  'ZONA T, ENSEÑANZA, CEDRITOS, FISCALÍA, LOURDES, COMCEL, BOLSA DE BOGOTÁ, GRAN SAN, ANDES, AV. JIMÉNEZ';

function addMonths(date, n) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + n);
  return d;
}

function formatoFechaLarga(d) {
  const day = d.getDate();
  const mes = MESES_ES[d.getMonth()];
  const y = d.getFullYear();
  return `${day} de ${mes} de ${y}`;
}

function mesNombre(d) {
  return MESES_ES[d.getMonth()];
}

const DEFAULT_BEPARKING_REGISTER = 'https://www.beparking.com.co/Register';

function beParkingUrl(baseUrl) {
  const u = String(process.env.BE_PARKING_URL || '').trim();
  if (u) return u.replace(/\/$/, '');
  return DEFAULT_BEPARKING_REGISTER;
}

/**
 * @param {{ baseUrl: string, emailCliente: string, fechaReferencia?: Date }} opts
 */
function htmlNotificacionBeWashCliente(opts) {
  const baseUrl = String(opts.baseUrl || '').replace(/\/$/, '');
  const emailCliente = String(opts.emailCliente || '');
  const ref = opts.fechaReferencia instanceof Date ? opts.fechaReferencia : new Date();
  const fechaCompra = formatoFechaLarga(ref);
  const fechaVenc = formatoFechaLarga(addMonths(ref, 1));
  const nombreMes = mesNombre(ref);
  const logoPath = 'img/8d83c64278d14db996379e6a57c34ba107aacdc5%20(1).png';
  const logoUrl = `${baseUrl}/${logoPath}`;
  const parkingHref = beParkingUrl(baseUrl);
  const preheader =
    'Be Wash — Bono Morado «Brilla tu carro»: información para tu 1.er, 2.º y 3.er lavado con la mensual.';

  const headerBlock = `
          <tr>
            <td style="background:#004D5C;padding:20px 24px;text-align:center;">
              <img src="${logoUrl}" alt="Be Wash" width="52" height="52" style="border-radius:50%;display:block;margin:0 auto 10px;border:0;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:0.35em;color:#ffffff;text-transform:uppercase;">Be Wash</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:0.08em;text-shadow:0 0 1px #fff,0 0 2px rgba(255,255,255,0.4);">AUTOLAVADO</p>
            </td>
          </tr>`;

  const bloques = [
    { label: 'Primer uso', banner: '#C62828', ordinalTitle: 'primer' },
    { label: 'Segundo uso', banner: '#2E7D32', ordinalTitle: 'segundo' },
    { label: 'Tercer uso', banner: '#0288D1', ordinalTitle: 'tercer' }
  ];

  let seccionesHtml = '';
  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i];
    seccionesHtml += `
          <tr>
            <td style="padding:${i === 0 ? '28px' : '16px'} 20px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(0,0,0,0.15);border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:18px 22px 14px;">
                    <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#ffffff;line-height:1.25;">
                      Correo de uso de tu mensual
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background:${b.banner};padding:10px 16px;border-radius:6px;text-align:center;">
                          <span style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-transform:capitalize;">${escapeHtml(
                            b.label
                          )}</span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#ffffff;">
                      ¡Bienvenido al Bono Morado — «Brilla tu carro» de Be Wash!<br><br>
                      Con este correo damos por informado tu <strong>${escapeHtml(b.ordinalTitle)} lavado</strong> con la membresía Be Wash:
                      corresponde a <strong>un (1) lavado de carro</strong> y <strong>una (1) hora de parqueadero gratuito</strong>, según las condiciones del plan.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:14px;">
                      <tr>
                        <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#f3e5f5;">
                          <strong style="color:#ffffff;">• Fecha de compra:</strong> ${escapeHtml(fechaCompra)}<br>
                          <strong style="color:#ffffff;">• Vigencia:</strong> Hasta el ${escapeHtml(fechaVenc)}<br>
                          <strong style="color:#ffffff;">• Válido durante todo el mes de:</strong> ${escapeHtml(nombreMes)}
                        </td>
                      </tr>
                    </table>
                    <p style="margin:18px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;color:#ffffff;">
                      ¿Dónde puedes redimir tu lavado?
                    </p>
                    <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#ede7f6;">
                      Presenta este bono (este correo) en cualquiera de los siguientes puntos de servicio Be Wash:
                    </p>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#e1bee7;">
                      ${escapeHtml(PUNTOS_SERVICIO)}
                    </p>
                    <p style="margin:20px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;color:#ffffff;">
                      ¡No olvides tu beneficio adicional!
                    </p>
                    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#ede7f6;">
                      Recibe <strong>1 hora de parqueadero GRATIS</strong> con Be Parking. Haz clic en el botón, llena tus datos y activa tu beneficio:
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 18px;">
                      <tr>
                        <td style="border-radius:8px;background:#4CAF50;text-align:center;">
                          <a href="${escapeHtml(parkingHref)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Bono BeParking</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#e1bee7;">
                      <strong style="color:#ffffff;">•</strong> Presenta este bono digital en el punto de servicio.<br>
                      <strong style="color:#ffffff;">•</strong> Lleva contigo tu cédula registrada con Be Wash para validar tu membresía.<br>
                      <strong style="color:#ffffff;">•</strong> Este bono es personal e intransferible.<br>
                      <strong style="color:#ffffff;">•</strong> Válido únicamente durante el mes de redención indicado.
                    </p>
                    <p style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#ffffff;line-height:1.45;">
                      Gracias por confiar en Be Wash, ¡tu carro brilla con nosotros!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Be Wash — Bono mensual</title>
</head>
<body style="margin:0;padding:0;background-color:#5e2a82;font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#5e2a82;padding:24px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#7B1FA2;border-radius:14px;overflow:hidden;">
          ${headerBlock}
          <tr>
            <td style="padding:8px 20px 4px;text-align:center;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#ffffff;line-height:1.35;">
                Tu mensual Be Wash — <span style="white-space:nowrap;">1.er, 2.º y 3.er uso</span>
              </p>
              <p style="margin:10px 0 0;font-size:13px;color:#e1bee7;line-height:1.45;">
                A continuación encontrarás <strong style="color:#ffffff;">tres bloques</strong> (primer, segundo y tercer uso) con la misma información de referencia para cada redención.
              </p>
            </td>
          </tr>
          ${seccionesHtml}
          <tr>
            <td style="padding:16px 22px 24px;background:#4a148c;">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#ce93d8;text-align:center;">
                Enviado a <strong style="color:#f3e5f5;">${escapeHtml(emailCliente)}</strong> desde el panel administrativo Be Wash.<br>
                <a href="mailto:bewashsas1@gmail.com" style="color:#e1bee7;">bewashsas1@gmail.com</a>
                · <a href="https://wa.me/573046096317" style="color:#e1bee7;">WhatsApp</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function textoPlanoNotificacion(emailCliente, baseUrl) {
  const root = String(baseUrl || '').replace(/\/$/, '') || 'https://bewash.net';
  const parking = beParkingUrl(baseUrl || root);
  return `Be Wash — Bono Morado «Brilla tu carro»

Este correo incluye la información para el PRIMER, SEGUNDO y TERCER uso de tu mensual (tres secciones en un solo mensaje).

Puntos de servicio: ${PUNTOS_SERVICIO}

Be Parking (1 h gratis): ${parking}

Este mensaje fue enviado a ${emailCliente} desde el panel administrativo de Be Wash.
Sitio web: ${root}/index.html
`.trim();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { htmlNotificacionBeWashCliente, textoPlanoNotificacion };
