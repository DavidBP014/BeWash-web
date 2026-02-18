# BeWash - Servidor de registro y base de datos

Este servidor guarda los registros de mensualidad en un archivo y los envía por correo a **Bewashsas1@gmail.com**. Los datos **no se envían por la red en texto claro** si usas HTTPS en producción.

## Instalación

```bash
cd server
npm install
```

## Configuración

1. Copia el archivo de ejemplo y edítalo con tus datos:

```bash
cp .env.example .env
```

2. Edita `.env`:

- **GMAIL_USER**: Correo desde el que se envían los emails (recomendado: **Bewashsas1@gmail.com**, tu correo corporativo).
- **GMAIL_APP_PASSWORD**: Contraseña de aplicación de Google para esa cuenta (no la contraseña normal). Crear en: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- **ADMIN_KEY**: Clave secreta para ver los registros en el navegador (ej: `bewash_admin_2024_secreto`).

**Importante:** Cada registro se guarda en la base de datos y **la misma información se envía por correo a Bewashsas1@gmail.com** para que puedas gestionar la comunicación desde ahí. Si GMAIL_USER y GMAIL_APP_PASSWORD no están configurados, el servidor seguirá guardando en la DB pero no enviará emails.

## Cómo levantar la página y el servidor

Desde la carpeta `server`:

```bash
npm start
```

Luego abre en el navegador:

- **Página principal:** [http://localhost:3001](http://localhost:3001)
- **Registro (compra mensualidad):** [http://localhost:3001/registro_usuario.html](http://localhost:3001/registro_usuario.html)

Si abres la web desde otro sitio (por ejemplo `python -m http.server`), el formulario **no** guardará en base de datos ni enviará correo; debes usar este servidor.

## Acceso a la base de datos (registros guardados)

Los datos se guardan en:

- **Archivo:** `server/data/registros.json`

Puedes abrir ese archivo con un editor de texto para ver todos los registros.

También puedes verlos por navegador (solo si conoces la clave):

```
http://localhost:3001/api/admin/registros?key=TU_ADMIN_KEY
```

Sustituye `TU_ADMIN_KEY` por el valor que pusiste en `.env` en **ADMIN_KEY**. No compartas esta URL ni la clave con nadie.

## Alternativa sin servidor: Google Forms

Si prefieres no usar este backend, puedes usar un **formulario de Google Forms**: los datos se guardan en una hoja de cálculo y puedes activar notificaciones por correo a Bewashsas1@gmail.com. Instrucciones paso a paso en **GOOGLE_FORMS.md**.

## Seguridad

- **En producción** publica la web con **HTTPS** (certificado SSL) para que los datos del formulario viajen cifrados.
- El archivo **.env** no se sube a Git; contiene datos sensibles (correo y clave de administrador).
- Los datos se guardan solo en tu servidor (archivo `data/registros.json`); no se muestran en la página ni se envían a terceros salvo al correo configurado.

## Resumen de accesos

| Qué | Dónde |
|-----|--------|
| Precio mensualidad | $80.000 (en la página) |
| Botón "Compra Ya" | Lleva al registro |
| Correo donde llegan los registros | Bewashsas1@gmail.com (configurado en .env) |
| Base de datos (archivo) | `server/data/registros.json` |
| Ver registros por navegador | `http://localhost:3001/api/admin/registros?key=TU_ADMIN_KEY` |
