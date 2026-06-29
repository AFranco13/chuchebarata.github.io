// =========================================================
// El Kiosquillo — Edge Function: crear-sesion-pago
// Crea una sesión de Stripe Checkout para un pedido "pendiente"
// y devuelve la URL a la que redirigir al cliente para pagar.
//
// Secretos necesarios (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY            (sk_test_... / sk_live_...)
//   SUPABASE_URL                 (lo inyecta Supabase automáticamente)
//   SUPABASE_SERVICE_ROLE_KEY    (lo inyecta Supabase automáticamente)
//   SUPABASE_ANON_KEY            (lo inyecta Supabase automáticamente)
// =========================================================

import Stripe from 'npm:stripe@16';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    // Identifica al usuario a partir de su token de sesión.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'No autenticado' }, 401);

    const { orderId, base } = await req.json();
    console.log('crear-sesion-pago · body:', JSON.stringify({ orderId, base }));
    if (!orderId) return json({ error: 'Falta el pedido' }, 400);

    // Base de la web (incluye subcarpeta si la hay). Debe acabar en "/".
    let site = base || SUPABASE_URL;
    if (!site.endsWith('/')) site += '/';
    console.log('crear-sesion-pago · site:', site);

    // Lee el pedido con permisos de servicio (fuente de verdad de los importes).
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: order, error } = await admin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (error || !order) return json({ error: 'Pedido no encontrado' }, 404);
    if (order.user_id !== user.id) return json({ error: 'No autorizado' }, 403);
    if (order.estado !== 'pendiente') return json({ error: 'El pedido ya está pagado' }, 400);

    // Blindaje: no se inicia el pago sin dirección de envío completa.
    const dir = order.direccion || {};
    const dirCompleta = ['linea1', 'cp', 'ciudad', 'provincia']
      .every((k) => ((dir as any)[k] || '').toString().trim());
    if (!dirCompleta) {
      console.log('crear-sesion-pago · dirección incompleta para pedido', orderId);
      return json({ error: 'Falta la dirección de envío. Complétala en tu perfil antes de pagar.' }, 400);
    }

    const line_items = (order.order_items || []).map((i: any) => ({
      quantity: i.cantidad,
      price_data: {
        currency: 'eur',
        unit_amount: Math.round(Number(i.precio) * 100),
        product_data: { name: i.nombre || 'Producto' },
      },
    }));

    if (Number(order.envio) > 0) {
      line_items.push({
        quantity: 1,
        price_data: { currency: 'eur', unit_amount: Math.round(Number(order.envio) * 100), product_data: { name: 'Gastos de envío' } },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      // Sin payment_method_types: Stripe muestra los métodos activados en tu
      // panel (tarjeta y, cuando lo actives, Bizum / Apple Pay / Google Pay).
      success_url: `${site}pedido.html?id=${order.id}&pago=ok`,
      cancel_url: `${site}index.html?pago=cancelado`,
      client_reference_id: order.id,
      locale: 'es',
      metadata: { order_id: order.id, user_id: user.id },
    });

    console.log('crear-sesion-pago · sesión creada:', session.id);
    return json({ url: session.url });
  } catch (e) {
    console.error('crear-sesion-pago · ERROR:', (e as Error)?.message, (e as Error)?.stack);
    return json({ error: (e as Error)?.message || 'Error al iniciar el pago' }, 500);
  }
});
