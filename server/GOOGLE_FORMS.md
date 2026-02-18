# Opción con Google Forms (sin servidor backend)

Puedes usar un **Google Form** en lugar del servidor Node.js. Así no necesitas mantener un backend ni configurar Gmail.

## Ventajas de Google Forms

- No necesitas servidor ni base de datos propia.
- Los datos se guardan en una **Hoja de cálculo de Google** (acceso solo con tu cuenta).
- Puedes activar **notificaciones por correo** a **Bewashsas1@gmail.com** cada vez que alguien envía el formulario (la misma data que verías en la DB).
- Es gratuito y Google se encarga de la disponibilidad.

## Cómo configurarlo

### 1. Crear el formulario

1. Entra a [Google Forms](https://forms.google.com) con la cuenta donde quieras recibir los datos (por ejemplo la de Bewashsas1@gmail.com).
2. Crear formulario en blanco.
3. Añade las mismas preguntas que tu registro:

   | Pregunta                    | Tipo de pregunta | Obligatorio |
   |----------------------------|------------------|-------------|
   | Nombre completo            | Respuesta corta  | Sí          |
   | Correo electrónico         | Respuesta corta  | Sí          |
   | Teléfono                   | Respuesta corta  | Sí          |
   | Cédula                     | Respuesta corta  | Sí          |
   | Tipo de vehículo          | Lista: Moto / SUV / Carro | Sí |
   | Placa del vehículo         | Respuesta corta  | Sí          |
   | Acepto términos y política | Casilla de verificación | Sí   |

4. En **Configuración** (engranaje) → **Presentación**:
   - Activa **“Mostrar barra de progreso”** si quieres.
   - En **“Después de enviar el formulario”** elige **“Ir a otra página”** y pon esta URL de PSE:
   - `https://www.psepagos.co/PSEHostingUI/ShowTicketOffice.aspx?ID=13291`
   Así, después de enviar, el usuario irá directo a pagar.

### 2. Recibir la misma data en tu correo corporativo

1. En el formulario, abre la pestaña **“Respuestas”**.
2. Arriba a la derecha, los **tres puntos** (⋮) → **“Obtener notificaciones por correo electrónico de nuevas respuestas”**.
3. Asegúrate de que la cuenta que recibe sea **Bewashsas1@gmail.com** (la cuenta con la que creaste el Form recibe por defecto; si creaste el Form con otra cuenta, en la Hoja de cálculo puedes añadir a Bewashsas1@gmail.com para que tenga acceso).

Así, cada envío del formulario te llegará por correo con la misma información que tendrías en la base de datos.

### 3. Enlazar desde tu página BeWash

Tienes dos opciones:

**A) Redirigir “Compra Ya” al Google Form**

- En tu página, el botón **“Compra Ya”** puede llevar a la URL del formulario de Google (copiar enlace del Form en “Enviar”).
- Reemplaza en `index.html` el enlace actual de “Compra Ya” por algo como:
  - `href="https://docs.google.com/forms/d/e/XXXXXXXX/viewform"`  
  (usa la URL real de tu formulario).

**B) Mantener tu página de registro y solo el envío por Google**

- Dejas tu diseño en `registro_usuario.html` pero el `<form>` apunta al Google Form (acción del form = URL del Form y método POST; los nombres de los campos deben coincidir con los “nombres de entrada” del Form, que Google asigna por defecto y son algo largos). Esta opción es más técnica y menos recomendable; suele ser más simple usar el enlace directo al Form (opción A).

## Resumen: ¿Backend o Google Forms?

|                         | Backend (Node + .env)     | Google Forms              |
|-------------------------|---------------------------|----------------------------|
| Recibir data en Bewashsas1@gmail.com | Sí (configurando GMAIL_APP_PASSWORD) | Sí (notificaciones por correo) |
| Guardar datos           | `data/registros.json`     | Hoja de cálculo de Google |
| Redirección a PSE       | Tras enviar desde tu página | Tras enviar (configurando “Ir a otra página”) |
| Mantener servidor       | Sí                        | No                        |
| Coste                   | Servidor donde corra Node | Gratis                    |

Si eliges Google Forms, la “base de datos” es la Hoja de cálculo de Google y la “recepción de la misma data” en tu correo corporativo se hace con las notificaciones por correo de nuevas respuestas a Bewashsas1@gmail.com.
