/**
 * Base URL del backend (Express / Vercel). Vacío = mismo origen que la página (recomendado).
 *
 * Si el sitio público (ej. bewash.net) es solo archivos estáticos y la API vive en otro host,
 * define el origen en cada HTML con:
 *   <meta name="bewash-api-origin" content="https://tu-proyecto.vercel.app">
 * (sin barra final). Cuando el dominio apunte al mismo proyecto Vercel que incluye /api, deja content vacío.
 */
(function () {
  if (typeof window.BEWASH_API_ORIGIN === 'undefined') {
    var meta =
      typeof document !== 'undefined' && document.querySelector('meta[name="bewash-api-origin"]');
    var c = meta && meta.getAttribute('content');
    window.BEWASH_API_ORIGIN = c != null ? String(c).trim() : '';
  }

  window.bewashApiUrl = function (path) {
    var base = String(window.BEWASH_API_ORIGIN || '').trim().replace(/\/$/, '');
    var p = String(path || '');
    var norm = p.charAt(0) === '/' ? p : '/' + p;
    return base + norm;
  };
})();
