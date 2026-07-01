/* =========================================================
   El Kiosquillo — cookies-consent.js
   Banner de consentimiento de cookies conforme a la guía de la
   AEPD (2023) y la LSSI-CE:
     · "Rechazar" tan visible como "Aceptar".
     · Sin casillas premarcadas (sólo las necesarias, no desmarcables).
     · Continuar navegando NO equivale a consentir.
     · El consentimiento caduca a los 12 meses.
     · Se puede revocar desde cualquier página (enlace del footer).
   ========================================================= */

(function (global) {
  'use strict';

  const KEY = 'kq_cookie_consent';
  const MAX_AGE_DAYS = 365;          // re-pedir consentimiento cada 12 meses

  const DEFAULT = { necesarias: true, preferencias: false, analitica: false, marketing: false };

  function readConsent() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  }
  function isFresh(c) {
    if (!c || !c.fecha) return false;
    const days = (Date.now() - new Date(c.fecha).getTime()) / 86400000;
    return days < MAX_AGE_DAYS;
  }
  function saveConsent(prefs) {
    const c = { ...DEFAULT, ...prefs, necesarias: true, fecha: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(c));
    applyConsent(c);
    return c;
  }

  let analyticsLoaded = false;

  /* Inyecta gtag.js de GA4 una sola vez, solo si hay un Measurement ID
     real configurado (no el placeholder) y solo si hay consentimiento de
     analítica. anonymize_ip reduce el dato personal que se envía. */
  function cargarAnalytics() {
    if (analyticsLoaded) return;
    const id = (global.SUPABASE_CONFIG || {}).gaMeasurementId;
    if (!id || id === 'G-XXXXXXXXXX') return;
    analyticsLoaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(s);
    global.dataLayer = global.dataLayer || [];
    global.gtag = function () { global.dataLayer.push(arguments); };
    global.gtag('js', new Date());
    global.gtag('config', id, { anonymize_ip: true });
  }

  /* Activa o desactiva scripts de terceros según el consentimiento. */
  function applyConsent(c) {
    document.dispatchEvent(new CustomEvent('cookie-consent', { detail: c }));
    if (c.analitica) cargarAnalytics();
  }

  /* Permite a otros scripts (analytics.js) consultar el consentimiento
     actual sin depender solo del evento 'cookie-consent'. */
  function tieneConsentimiento(categoria) {
    const c = readConsent();
    return isFresh(c) && !!(c && c[categoria]);
  }
  global.tieneConsentimiento = tieneConsentimiento;

  /* ---------- interfaz ---------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function buildBanner() {
    const wrap = el('div', 'cc-banner', `
      <div class="cc-inner">
        <div class="cc-text">
          <strong>Usamos cookies 🍪</strong>
          <p>Utilizamos cookies propias necesarias para que la web funcione y, con tu permiso, otras para
          recordar tus preferencias, medir el tráfico y mostrarte ofertas. Puedes aceptarlas, rechazarlas
          o elegir cuáles. Más info en nuestra <a href="cookies.html">Política de cookies</a>.</p>
        </div>
        <div class="cc-actions">
          <button class="cc-btn cc-reject" type="button">Rechazar todo</button>
          <button class="cc-btn cc-custom" type="button">Personalizar</button>
          <button class="cc-btn cc-accept" type="button">Aceptar todo</button>
        </div>
      </div>`);

    wrap.querySelector('.cc-accept').addEventListener('click', () => {
      saveConsent({ preferencias: true, analitica: true, marketing: true });
      close(wrap);
    });
    wrap.querySelector('.cc-reject').addEventListener('click', () => {
      saveConsent({ preferencias: false, analitica: false, marketing: false });
      close(wrap);
    });
    wrap.querySelector('.cc-custom').addEventListener('click', () => {
      close(wrap);
      openPanel();
    });
    return wrap;
  }

  function buildPanel() {
    const current = readConsent() || DEFAULT;
    const overlay = el('div', 'cc-overlay');
    const panel = el('div', 'cc-panel', `
      <h2>Preferencias de cookies</h2>
      <p class="cc-panel-intro">Elige qué cookies quieres permitir. Puedes cambiar tu decisión cuando quieras
      desde el enlace «Gestionar cookies» del pie de página.</p>

      <div class="cc-group">
        <div class="cc-group-head">
          <span><b>Necesarias</b><small>Imprescindibles para navegar, acceder a tu cuenta y comprar.</small></span>
          <label class="cc-switch cc-fixed"><input type="checkbox" checked disabled><span></span></label>
        </div>
      </div>
      <div class="cc-group">
        <div class="cc-group-head">
          <span><b>Preferencias</b><small>Recuerdan elecciones como tu carrito entre visitas.</small></span>
          <label class="cc-switch"><input type="checkbox" data-k="preferencias" ${current.preferencias ? 'checked' : ''}><span></span></label>
        </div>
      </div>
      <div class="cc-group">
        <div class="cc-group-head">
          <span><b>Analítica</b><small>Nos ayudan a entender cómo se usa la web (de forma agregada).</small></span>
          <label class="cc-switch"><input type="checkbox" data-k="analitica" ${current.analitica ? 'checked' : ''}><span></span></label>
        </div>
      </div>
      <div class="cc-group">
        <div class="cc-group-head">
          <span><b>Marketing</b><small>Permiten mostrarte ofertas relevantes dentro y fuera de la web.</small></span>
          <label class="cc-switch"><input type="checkbox" data-k="marketing" ${current.marketing ? 'checked' : ''}><span></span></label>
        </div>
      </div>

      <div class="cc-panel-actions">
        <button class="cc-btn cc-reject" type="button">Rechazar todas</button>
        <button class="cc-btn cc-accept" type="button">Guardar selección</button>
      </div>`);

    panel.querySelector('.cc-accept').addEventListener('click', () => {
      const prefs = {};
      panel.querySelectorAll('input[data-k]').forEach(i => { prefs[i.dataset.k] = i.checked; });
      saveConsent(prefs);
      close(overlay);
    });
    panel.querySelector('.cc-reject').addEventListener('click', () => {
      saveConsent({ preferencias: false, analitica: false, marketing: false });
      close(overlay);
    });

    overlay.appendChild(panel);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(overlay); });
    return overlay;
  }

  function close(node) { node.classList.remove('show'); setTimeout(() => node.remove(), 250); }

  function openPanel() {
    const p = buildPanel();
    document.body.appendChild(p);
    requestAnimationFrame(() => p.classList.add('show'));
  }

  /* API global para el enlace del footer. */
  global.abrirPanelCookies = openPanel;

  /* ---------- arranque ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const c = readConsent();
    if (isFresh(c)) { applyConsent(c); return; }   // ya consintió hace < 12 meses
    const banner = buildBanner();
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('show'));
  });
})(window);
