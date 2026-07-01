/* =========================================================
   El Kiosquillo — analytics.js
   Registro de eventos de negocio (embudo de compra) en Supabase, más
   reenvío a GA4 si está cargado. No bloquea nunca la compra: cualquier
   fallo se ignora en silencio. Requiere (cargados antes en el HTML):
   supabase-config.js, auth.js, cookies-consent.js.
   ========================================================= */

(function (global) {
  'use strict';

  function sessionId() {
    try {
      let id = sessionStorage.getItem('kq_session_id');
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem('kq_session_id', id);
      }
      return id;
    } catch { return crypto.randomUUID(); }
  }

  function track(tipo, datos) {
    try {
      if (!global.tieneConsentimiento || !global.tieneConsentimiento('analitica')) return;
      if (global.Auth && typeof global.Auth.trackEvent === 'function') {
        global.Auth.trackEvent(tipo, datos || {}, sessionId()).catch(() => {});
      }
      if (typeof global.gtag === 'function') global.gtag('event', tipo, datos || {});
    } catch (e) { /* la analítica nunca debe romper la compra */ }
  }

  global.Analytics = { track };
})(window);
