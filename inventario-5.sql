-- =========================================================
-- El Kiosquillo — Inventario Fase 3: stock automático
-- Ejecuta DESPUÉS de inventario-1/2/3.sql.
--   · Libro de movimientos de stock (stock_movements).
--   · Descuento de stock al confirmarse el pago (idempotente).
--   · Reposición de stock al cancelar un pedido pagado.
--   · ajustar_stock ahora deja rastro en el libro.
-- Idempotente.
-- =========================================================

create table if not exists public.stock_movements (
  id         uuid primary key default gen_random_uuid(),
  product_id integer references public.products(id),
  delta      integer not null,          -- + entra, - sale
  motivo     text not null,             -- venta · cancelacion · reposicion · ajuste · devolucion
  order_id   uuid references public.orders(id),
  actor      text default 'sistema',
  created_at timestamptz default now()
);

alter table public.stock_movements enable row level security;
drop policy if exists "movimientos admin" on public.stock_movements;
create policy "movimientos admin" on public.stock_movements
  for select using (public.is_admin());

-- ---------- Descontar stock al PAGAR (idempotente por pedido) ----------
-- Se permite al sistema (service_role: auth.uid() nulo) y a administradores.
create or replace function public.descontar_stock_pedido(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare it record;
begin
  if not (public.is_admin() or auth.uid() is null) then
    raise exception 'No autorizado';
  end if;
  -- ya descontado antes -> no repetir
  if exists (select 1 from public.stock_movements where order_id = p_order_id and motivo = 'venta') then
    return;
  end if;
  for it in
    select product_id, cantidad from public.order_items
    where order_id = p_order_id and product_id is not null
  loop
    update public.products set stock = stock - it.cantidad, updated_at = now()
      where id = it.product_id;
    insert into public.stock_movements (product_id, delta, motivo, order_id, actor)
      values (it.product_id, -it.cantidad, 'venta', p_order_id, 'pago');
  end loop;
end; $$;
grant execute on function public.descontar_stock_pedido(uuid) to authenticated, service_role;

-- ---------- Reponer stock al CANCELAR (solo si se había descontado) ----------
create or replace function public.reponer_stock_pedido(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare it record;
begin
  if not (public.is_admin() or auth.uid() is null) then
    raise exception 'No autorizado';
  end if;
  -- nunca se descontó (pedido no pagado) -> nada que reponer
  if not exists (select 1 from public.stock_movements where order_id = p_order_id and motivo = 'venta') then
    return;
  end if;
  -- ya repuesto -> no repetir
  if exists (select 1 from public.stock_movements where order_id = p_order_id and motivo = 'cancelacion') then
    return;
  end if;
  for it in
    select product_id, cantidad from public.order_items
    where order_id = p_order_id and product_id is not null
  loop
    update public.products set stock = stock + it.cantidad, updated_at = now()
      where id = it.product_id;
    insert into public.stock_movements (product_id, delta, motivo, order_id, actor)
      values (it.product_id, it.cantidad, 'cancelacion', p_order_id, 'tienda');
  end loop;
end; $$;
grant execute on function public.reponer_stock_pedido(uuid) to authenticated, service_role;

-- ---------- ajustar_stock ahora registra movimiento ----------
create or replace function public.ajustar_stock(p_id integer, p_delta integer, p_motivo text default 'ajuste')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  update public.products set stock = greatest(stock + p_delta, 0), updated_at = now() where id = p_id;
  insert into public.stock_movements (product_id, delta, motivo, actor)
    values (p_id, p_delta, coalesce(nullif(p_motivo,''), 'ajuste'), 'admin');
end; $$;
grant execute on function public.ajustar_stock(integer, integer, text) to authenticated;

-- ---------- al cancelar un pedido, reponer su stock ----------
create or replace function public.actualizar_estado_pedido(
  p_order_id uuid, p_estado text, p_descripcion text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_desc text;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  if p_estado not in ('pendiente','confirmado','preparando','enviado','entregado','cancelado') then
    raise exception 'Estado no válido: %', p_estado;
  end if;

  update public.orders set estado = p_estado, updated_at = now() where id = p_order_id;

  v_desc := coalesce(nullif(p_descripcion, ''),
    case p_estado
      when 'preparando' then 'Estamos preparando tu pedido en el almacén.'
      when 'enviado'    then 'Tu pedido ha salido y está en camino.'
      when 'entregado'  then 'Tu pedido ha sido entregado. ¡Que lo disfrutes!'
      when 'cancelado'  then 'Tu pedido ha sido cancelado.'
      else 'Estado actualizado.'
    end);

  insert into public.order_tracking_events (order_id, estado, descripcion, actor)
  values (p_order_id, p_estado, v_desc, 'tienda');

  -- Devolver el stock al inventario si se cancela un pedido ya pagado.
  if p_estado = 'cancelado' then
    perform public.reponer_stock_pedido(p_order_id);
  end if;
end; $$;
grant execute on function public.actualizar_estado_pedido(uuid, text, text) to authenticated;
