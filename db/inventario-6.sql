-- =========================================================
-- El Kiosquillo — Inventario: eliminar productos desde el panel
-- Ejecuta DESPUÉS de inventario-1..5.sql.
-- Borra un producto solo si NO tiene pedidos (para no perder el
-- historial de ventas); si los tiene, sugiere desactivarlo.
-- Idempotente.
-- =========================================================

create or replace function public.eliminar_producto(p_id integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  -- Si se ha vendido alguna vez, no borrar: se perdería el historial.
  if exists (select 1 from public.order_items where product_id = p_id) then
    raise exception 'Este producto tiene pedidos asociados. Desactívalo en lugar de eliminarlo para conservar el historial.';
  end if;

  -- Limpia movimientos de stock (ajustes/reposiciones sin ventas) y borra.
  delete from public.stock_movements where product_id = p_id;
  delete from public.products where id = p_id;
end; $$;

grant execute on function public.eliminar_producto(integer) to authenticated;
