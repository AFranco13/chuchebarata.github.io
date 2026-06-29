-- =========================================================
-- El Kiosquillo — Ampliación: pagos con Stripe
-- Ejecuta DESPUÉS de supabase-schema.sql.
-- Permite crear el pedido en estado "pendiente" mientras se paga;
-- el webhook de Stripe lo pasará a "confirmado" tras el cobro.
-- Es idempotente.
-- =========================================================

-- Reemplaza crear_pedido para aceptar el estado inicial.
drop function if exists public.crear_pedido(jsonb, jsonb, numeric, numeric, numeric);
drop function if exists public.crear_pedido(jsonb, jsonb, numeric, numeric, numeric, text);

create or replace function public.crear_pedido(
  p_items     jsonb,
  p_direccion jsonb,
  p_subtotal  numeric,
  p_envio     numeric,
  p_total     numeric,
  p_estado    text default 'confirmado'
) returns table(id uuid, numero text)
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_numero text; it jsonb; v_desc text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  insert into public.orders (user_id, estado, subtotal, envio, total, direccion)
  values (auth.uid(), p_estado, p_subtotal, p_envio, p_total, p_direccion)
  returning orders.id, orders.numero into v_id, v_numero;

  for it in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (order_id, product_id, nombre, precio, cantidad, img, tint)
    values (
      v_id,
      nullif(it->>'id','')::integer,
      it->>'nombre',
      nullif(it->>'precio','')::numeric,
      nullif(it->>'cantidad','')::integer,
      it->>'img',
      it->>'tint'
    );
  end loop;

  v_desc := case when p_estado = 'pendiente'
    then 'Hemos registrado tu pedido. Falta completar el pago.'
    else 'Hemos recibido tu pedido y confirmado el pago.' end;

  insert into public.order_tracking_events (order_id, estado, descripcion, actor)
  values (v_id, p_estado, v_desc, 'sistema');

  return query select v_id, v_numero;
end; $$;

grant execute on function public.crear_pedido(jsonb, jsonb, numeric, numeric, numeric, text) to authenticated;
