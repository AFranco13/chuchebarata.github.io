/* =========================================================
   El Kiosquillo — supabase-config.js
   Credenciales PÚBLICAS (seguras en el navegador).
   La protección real la dan las políticas RLS de la base de datos y,
   en el pago, las claves SECRETAS que viven solo en el servidor (Supabase).
   NUNCA pongas aquí la clave secret/service_role de Supabase ni la
   clave secreta (sk_...) de Stripe.
   ========================================================= */
window.SUPABASE_CONFIG = {
  url: 'https://kfoawabtfzjeikcpdnjf.supabase.co',
  anonKey: 'sb_publishable_3b2sk2L-0I-znmQKd7e7lQ_K6-xj5-I',

  /* Clave publicable de Stripe (segura en el navegador). Con el flujo de
     Stripe Checkout no es imprescindible en el cliente, pero se guarda
     por si en el futuro se usa Stripe.js. */
  stripePublishableKey: 'pk_test_51TnGXQDU1gvx4Ho7vZGfpiyWH22hcQaKRLoJe80K4TvbuM3SUV79gdj35CUPBAlgNtyricZ5Oat5ug2r3LwDi2dA009YOibeDf',

  /* Pon esto en true SOLO cuando hayas desplegado las Edge Functions de
     pago y configurado los secretos (ver PAGOS-STRIPE.md). Mientras esté
     en false, el pedido se crea sin cobro (modo pruebas). */
  paymentsEnabled: false,
};
