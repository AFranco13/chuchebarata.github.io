/* =========================================================
   El Kiosquillo — checkout.js
   Lógica de pedido compartida por checkout.html (la página de
   finalizar compra). El resto de páginas (app.js, caja.js, carrito.js)
   solo navegan a checkout.html al pulsar "Tramitar pedido"; toda la
   comprobación de sesión, dirección y creación del pedido vive aquí
   y en checkout-page.js. Requiere auth.js.
   ========================================================= */

(function (global) {
  'use strict';

  const FREE_SHIPPING = 49;
  const SHIPPING_FEE = 2.95;   // tarifa por debajo del envío gratis

  const Checkout = {
    /* items: [{id, nombre, precio, cantidad, img, ...}] -> {subtotal, envio, total} */
    calcularTotales(items) {
      const subtotal = (items || []).reduce((s, i) => s + i.precio * i.cantidad, 0);
      const envio = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
      return { subtotal, envio, total: subtotal + envio };
    },

    /* Crea el pedido y, si hay pago real, la sesión de Stripe (y redirige).
       Devuelve { ok:true, id, numero } · { ok:false, reason:'redirect' } (ya
       navegando a Stripe) · { ok:false, error }. */
    async crearPedido({ items, direccion, subtotal, envio, total }) {
      const cfg = global.SUPABASE_CONFIG || {};

      // ---- Con pago real (Stripe) ----
      if (cfg.paymentsEnabled) {
        // 1) Crea el pedido como "pendiente" de pago.
        const pedido = await Auth.createOrder({ items, direccion, subtotal, envio, total, estado: 'pendiente' });
        if (!pedido.ok) return pedido;
        if (global.Analytics) Analytics.track('order_created', { order_id: pedido.id, total });
        // 2) Crea la sesión de pago y redirige a Stripe.
        const pago = await Auth.crearSesionPago(pedido.id);
        if (!pago.ok) return { ok: false, error: pago.error };
        location.href = pago.url;
        return { ok: false, reason: 'redirect' };   // ya navegando a Stripe
      }

      // ---- Sin pago (modo pruebas): el pedido queda confirmado ----
      const pedido = await Auth.createOrder({ items, direccion, subtotal, envio, total });
      if (pedido.ok && global.Analytics) Analytics.track('order_created', { order_id: pedido.id, total });
      return pedido;
    },
  };

  global.Checkout = Checkout;
})(window);
