// =========================================================
// El Kiosquillo — Edge Function: stripe-webhook
// Recibe los eventos de Stripe. Cuando un pago se completa, marca el
// pedido como "confirmado" y añade un evento de seguimiento.
//
// Secretos necesarios (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY            (sk_test_... / sk_live_...)
//   STRIPE_WEBHOOK_SECRET        (whsec_... que te da Stripe al crear el webhook)
//   SUPABASE_URL                 (inyectado por Supabase)
//   SUPABASE_SERVICE_ROLE_KEY    (inyectado por Supabase)
//
// IMPORTANTE: esta función NO debe verificar el JWT de Supabase.
// Despliégala con --no-verify-jwt (la seguridad la da la firma de Stripe).
// =========================================================

import Stripe from 'npm:stripe@16';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Falta la firma', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    // En Deno hay que usar la variante asíncrona (usa Web Crypto).
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (e) {
    return new Response(`Firma no válida: ${(e as Error).message}`, { status: 400 });
  }

  // Pago confirmado: tarjeta (completed + paid) o métodos asíncronos como
  // Bizum/SEPA (async_payment_succeeded).
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = (session.metadata?.order_id) || session.client_reference_id;
  const pagado =
    event.type === 'checkout.session.async_payment_succeeded' ||
    (event.type === 'checkout.session.completed' && session.payment_status === 'paid');

  if (pagado && orderId) {
    // Solo confirma si seguía pendiente (evita duplicados).
    const { data: updated } = await admin
      .from('orders')
      .update({ estado: 'confirmado', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('estado', 'pendiente')
      .select('id');

    if (updated && updated.length) {
      await admin.from('order_tracking_events').insert({
        order_id: orderId,
        estado: 'confirmado',
        descripcion: 'Hemos recibido tu pago y confirmado el pedido.',
        actor: 'pago',
      });
      // Descontar el stock vendido (idempotente por pedido).
      await admin.rpc('descontar_stock_pedido', { p_order_id: orderId });
    }
  }

  return new Response('ok', { status: 200 });
});
