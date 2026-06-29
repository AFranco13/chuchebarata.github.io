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
    async tramitar({ cart, resolve }) {
      const ids = Object.keys(cart || {});
      if (!ids.length) return { ok: false, reason: 'empty' };

      // Hace falta sesión: si no la hay, vamos a login y volvemos aquí.
      if (!global.Auth || !(await Auth.isLoggedIn())) {
        const back = location.pathname.split('/').pop() + location.search;
        location.href = 'login.html?returnTo=' + encodeURIComponent(back);
        return { ok: false, reason: 'auth' };
      }

      const items = ids.map(id => resolve(id, cart[id])).filter(Boolean);
      if (!items.length) return { ok: false, reason: 'empty' };

      const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
      const envio = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
      const total = subtotal + envio;

      const u = await Auth.getCurrentUser();
      const d = (u && u.direccion) || {};

      // Exige una dirección de envío completa antes de tramitar/pagar.
      const campo = k => ((d[k] || '') + '').trim();
      if (!campo('linea1') || !campo('cp') || !campo('ciudad') || !campo('provincia')) {
        location.href = 'perfil.html?completar=direccion#direccion';
        return { ok: false, reason: 'address' };
      }

      const direccion = {
        nombre: (u && u.nombre) || '', telefono: (u && u.telefono) || '',
        linea1: d.linea1 || '', linea2: d.linea2 || '',
        cp: d.cp || '', ciudad: d.ciudad || '', provincia: d.provincia || '',
      };

      const cfg = global.SUPABASE_CONFIG || {};

      // ---- Con pago real (Stripe) ----
      if (cfg.paymentsEnabled) {
        // 1) Crea el pedido como "pendiente" de pago.
        const pedido = await Auth.createOrder({ items, direccion, subtotal, envio, total, estado: 'pendiente' });
        if (!pedido.ok) return pedido;
        // 2) Crea la sesión de pago y redirige a Stripe.
        const pago = await Auth.crearSesionPago(pedido.id);
        if (!pago.ok) return { ok: false, error: pago.error };
        location.href = pago.url;
        return { ok: false, reason: 'redirect' };   // ya navegando a Stripe
      }

      // ---- Sin pago (modo pruebas): el pedido queda confirmado ----
      return Auth.createOrder({ items, direccion, subtotal, envio, total });
    },
  };

  global.Checkout = Checkout;
})(window);
