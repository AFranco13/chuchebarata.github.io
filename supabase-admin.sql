-- =========================================================
-- El Kiosquillo — Ampliación: panel de administración
-- Ejecuta este archivo DESPUÉS de supabase-schema.sql, igual que él:
-- Supabase → SQL Editor → New query → pega todo → Run.
-- Añade el rol de administrador y la gestión de estados de pedido.
-- Es idempotente.
-- =========================================================

-- ---------- ROL DE ADMINISTRADOR ----------
alter table public.profiles
  add column if not exists is_admin boolean default false;

-- Función auxiliar: ¿el usuario actual es administrador?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------- POLÍTICAS RLS PARA ADMINISTRADORES ----------
-- Los administradores pueden ver TODOS los pedidos, líneas y seguimiento.
drop policy if exists "admin ve pedidos" on public.orders;
create policy "admin ve pedidos" on public.orders
  for select using (public.is_admin());

drop policy if exists "admin ve items" on public.order_items;
create policy "admin ve items" on public.order_items
  for select using (public.is_admin());

drop policy if exists "admin ve seguimiento" on public.order_tracking_events;
create policy "admin ve seguimiento" on public.order_tracking_events
  for select using (public.is_admin());

-- ---------- CAMBIAR EL ESTADO DE UN PEDIDO ----------
-- Actualiza el estado y añade un evento de seguimiento que verá el cliente.
create or replace function public.actualizar_estado_pedido(
  p_order_id   uuid,
  p_estado     text,
  p_descripcion text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_desc text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if p_estado not in ('pendiente','confirmado','preparando','enviado','entregado','cancelado') then
    raise exception 'Estado no válido: %', p_estado;
  end if;

  update public.orders
     set estado = p_estado, updated_at = now()
   where id = p_order_id;

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
end; $$;

grant execute on function public.actualizar_estado_pedido(uuid, text, text) to authenticated;

-- =========================================================
-- HAZTE ADMINISTRADOR (ejecútalo una vez, con TU correo):
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'TU_CORREO_AQUI');
-- =========================================================
