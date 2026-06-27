/* =========================================================
   El Kiosquillo — checkout.js
   Tramitación de pedido compartida entre la tienda (app.js) y la
   página "Crea tu caja" (caja.js). Convierte el carrito en un pedido
   real guardado en la cuenta del usuario. Requiere auth.js.
   ========================================================= */

(function (global) {
  'use strict';

  const FREE_SHIPPING = 49;
  const SHIPPING_FEE = 2.95;   // tarifa por debajo del envío gratis

  const Checkout = {
    /* cart: { id: cantidad }
       resolve(id, cantidad) -> { id, nombre, precio, cantidad, img, tint } | null
       Devuelve { ok, id } o { ok:false, reason:'empty'|'auth'|... } */
    tramitar({ cart, resolve }) {
      const ids = Object.keys(cart || {});
      if (!ids.length) return { ok: false, reason: 'empty' };

      // Hace falta sesión: si no la hay, vamos a login y volvemos aquí.
      if (!global.Auth || !Auth.isLoggedIn()) {
        const back = location.pathname.split('/').pop() + location.search;
        location.href = 'login.html?returnTo=' + encodeURIComponent(back);
        return { ok: false, reason: 'auth' };
      }

      const items = ids.map(id => resolve(id, cart[id])).filter(Boolean);
      if (!items.length) return { ok: false, reason: 'empty' };

      const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
      const envio = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
      const total = subtotal + envio;

      const u = Auth.getCurrentUser();
      const d = u.direccion || {};
      const direccion = {
        nombre: u.nombre, telefono: u.telefono || '',
        linea1: d.linea1 || '', linea2: d.linea2 || '',
        cp: d.cp || '', ciudad: d.ciudad || '', provincia: d.provincia || '',
      };

      return Auth.createOrder({ items, direccion, subtotal, envio, total });
    },
  };

  global.Checkout = Checkout;
})(window);
