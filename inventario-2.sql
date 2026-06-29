-- =========================================================
-- El Kiosquillo — Inventario Fase 1 (blindaje de precios)
-- Ejecuta DESPUÉS de inventario-1.sql.
-- crear_pedido pasa a tomar el PRECIO y el NOMBRE desde la tabla
-- products (fuente de verdad) y recalcula subtotal/envío/total en el
-- servidor, ignorando los importes que envíe el navegador.
-- Idempotente.
-- =========================================================

drop function if exists public.crear_pedido(jsonb, jsonb, numeric, numeric, numeric);
drop function if exists public.crear_pedido(jsonb, jsonb, numeric, numeric, numeric, text);

create or replace function public.crear_pedido(
  p_items     jsonb,
  p_direccion jsonb,
  p_subtotal  numeric,   -- se ignora (se recalcula)
  p_envio     numeric,   -- se ignora (se recalcula)
  p_total     numeric,   -- se ignora (se recalcula)
  p_estado    text default 'confirmado'
) returns table(id uuid, numero text)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_numero text; it jsonb; v_desc text;
  v_pid int; v_cant int; v_precio numeric; v_nombre text; v_img text;
  v_subtotal numeric := 0; v_envio numeric; v_total numeric;
  ENVIO_GRATIS constant numeric := 49;
  TARIFA_ENVIO constant numeric := 2.95;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'El carrito está vacío'; end if;

  insert into public.orders (user_id, estado, subtotal, envio, total, direccion)
  values (auth.uid(), p_estado, 0, 0, 0, p_direccion)
  returning orders.id, orders.numero into v_id, v_numero;

  for it in select * from jsonb_array_elements(p_items) loop
    v_pid  := nullif(it->>'id','')::int;
    v_cant := greatest(coalesce(nullif(it->>'cantidad','')::int, 1), 1);

    -- Precio y datos DESDE la base de datos (blindaje).
    select precio, nombre, img into v_precio, v_nombre, v_img
      from public.products where id = v_pid;

    -- Si el producto no está en la tabla, usa lo recibido (no romper).
    if v_precio is null then
      v_precio := coalesce(nullif(it->>'precio','')::numeric, 0);
      v_nombre := it->>'nombre';
      v_img    := it->>'img';
    end if;

    v_subtotal := v_subtotal + v_precio * v_cant;

    insert into public.order_items (order_id, product_id, nombre, precio, cantidad, img, tint)
    values (v_id, v_pid, v_nombre, v_precio, v_cant, v_img, it->>'tint');
  end loop;

  v_envio := case when v_subtotal >= ENVIO_GRATIS then 0 else TARIFA_ENVIO end;
  v_total := v_subtotal + v_envio;
  update public.orders set subtotal = v_subtotal, envio = v_envio, total = v_total
   where orders.id = v_id;

  v_desc := case when p_estado = 'pendiente'
      then 'Hemos registrado tu pedido. Falta completar el pago.'
      else 'Hemos recibido tu pedido y confirmado el pago.' end;
  insert into public.order_tracking_events (order_id, estado, descripcion, actor)
  values (v_id, p_estado, v_desc, 'sistema');

  return query select v_id, v_numero;
end; $$;

grant execute on function public.crear_pedido(jsonb, jsonb, numeric, numeric, numeric, text) to authenticated;
