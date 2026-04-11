'use strict';

/**
 * Plantilla HTML tipo boletín / notificación (tablas, compatible con clientes de correo).
 * Inspirada en layouts de notificación tipo [Figma Email notification](https://www.figma.com/design/jVOFGqb5XZoyfs8YwllC73/Email-notification-saul--Community-?node-id=0-1).
 * Ajusta textos o colores aquí si actualizas el diseño en Figma.
 */
function htmlNotificacionBeWashCliente(opts) {
  const { baseUrl, emailCliente } = opts;
  const logoPath = 'img/8d83c64278d14db996379e6a57c34ba107aacdc5%20(1).png';
  const logoUrl = `${baseUrl.replace(/\/$/, '')}/${logoPath}`;
  const ctaUrl = `${baseUrl.replace(/\/$/, '')}/index.html#contacto`;
  const preheader =
    'BeWash te saluda. Descubre nuestro servicio de lavado profesional y mantén tu vehículo impecable.';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BeWash</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f4;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(
    preheader
  )}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0f4f4;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(17,130,130,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#118282 0%,#0d6b6b 100%);padding:28px 32px;text-align:center;">
              <img src="${logoUrl}" alt="BeWash" width="56" height="56" style="border-radius:50%;display:inline-block;vertical-align:middle;border:0;">
              <p style="margin:12px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Be<span style="font-weight:300;">Wash</span></p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">Lavado profesional de autos</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 8px;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#1a1a1a;font-weight:700;">Hola,</h1>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#444444;">
                Gracias por tu interés en <strong style="color:#118282;">BeWash</strong>. Cuidamos tu vehículo con productos de calidad
                y un equipo que pone atención en cada detalle.
              </p>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#444444;">
                Si quieres conocer nuestro <strong>plan de mensualidad</strong>, horarios o ubicación, entra al sitio o escríbenos por WhatsApp.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;background:#118282;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:999px;box-shadow:0 4px 14px rgba(17,130,130,0.35);">Ver contacto y planes</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7faf9;border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-size:13px;color:#666666;line-height:1.5;">
                      Este mensaje se envió a <strong style="color:#333;">${escapeHtml(emailCliente)}</strong> porque un administrador de BeWash solicitó el envío desde el panel interno.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e8eceb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#888888;line-height:1.5;">
                BeWash · Carrera 7 A # 123-24<br>
                <a href="mailto:bewashsas1@gmail.com" style="color:#118282;text-decoration:none;">bewashsas1@gmail.com</a>
                · <a href="https://wa.me/573046096317" style="color:#118282;text-decoration:none;">WhatsApp</a>
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
  const root = String(baseUrl || '').replace(/\/$/, '') || 'https://tu-dominio-bewash.vercel.app';
  return `BeWash — Lavado profesional de autos

Hola,

Gracias por tu interés en BeWash. Visita nuestro sitio para ver planes y contacto: ${root}/index.html#contacto

Este mensaje fue enviado a ${emailCliente} desde el panel administrativo de BeWash.
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
