-- =========================================================
-- El Kiosquillo — Inventario Fase 4 (Informes)
-- Ejecuta DESPUÉS de inventario-1..6.sql.
-- RPCs solo-admin (security definer) que cruzan las ventas
-- (order_items) con el coste actual del producto (products.precio_coste,
-- que la vista pública oculta) para calcular ingresos y margen.
--
-- Nota: el margen usa el COSTE ACTUAL del producto, no el coste histórico
-- del momento de la venta (order_items no lo guarda). Es una aproximación
-- suficiente para informes; el coste medio ponderado real llega en Fase 5.
--
-- "Ventas" = pedidos pagados/en curso: estados confirmado, preparando,
-- enviado y entregado. Se excluyen 'pendiente' (sin pagar) y 'cancelado'.
-- Idempotente.
-- =========================================================

-- Estados que cuentan como venta efectiva.
create or replace function public.estados_venta()
returns text[] language sql immutable as $$
  select array['confirmado','preparando','enviado','entregado']::text[]
$$;

-- ---------- Resumen del periodo ----------
create or replace function public.informe_resumen(p_desde date, p_hasta date)
returns table(pedidos bigint, unidades bigint, ingresos numeric, coste numeric, margen numeric)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  return query
  select
    count(distinct o.id)                                   as pedidos,
    coalesce(sum(oi.cantidad), 0)                          as unidades,
    coalesce(sum(oi.precio * oi.cantidad), 0)              as ingresos,
    coalesce(sum(coalesce(p.precio_coste, 0) * oi.cantidad), 0) as coste,
    coalesce(sum(oi.precio * oi.cantidad), 0)
      - coalesce(sum(coalesce(p.precio_coste, 0) * oi.cantidad), 0) as margen
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  left join public.products p on p.id = oi.product_id
  where o.estado = any(public.estados_venta())
    and o.created_at::date between p_desde and p_hasta;
end; $$;

-- ---------- Ventas por día ----------
create or replace function public.informe_ventas_diarias(p_desde date, p_hasta date)
returns table(dia date, pedidos bigint, unidades bigint, ingresos numeric, margen numeric)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  return query
  select
    o.created_at::date                                     as dia,
    count(distinct o.id)                                   as pedidos,
    coalesce(sum(oi.cantidad), 0)                          as unidades,
    coalesce(sum(oi.precio * oi.cantidad), 0)              as ingresos,
    coalesce(sum(oi.precio * oi.cantidad), 0)
      - coalesce(sum(coalesce(p.precio_coste, 0) * oi.cantidad), 0) as margen
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  left join public.products p on p.id = oi.product_id
  where o.estado = any(public.estados_venta())
    and o.created_at::date between p_desde and p_hasta
  group by o.created_at::date
  order by o.created_at::date;
end; $$;

-- ---------- Más vendidos ----------
create or replace function public.informe_mas_vendidos(p_desde date, p_hasta date, p_limite int default 20)
returns table(product_id int, nombre text, unidades bigint, ingresos numeric, margen numeric)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  return query
  select
    oi.product_id                                          as product_id,
    coalesce(max(p.nombre), max(oi.nombre))                as nombre,
    coalesce(sum(oi.cantidad), 0)                          as unidades,
    coalesce(sum(oi.precio * oi.cantidad), 0)              as ingresos,
    coalesce(sum(oi.precio * oi.cantidad), 0)
      - coalesce(sum(coalesce(p.precio_coste, 0) * oi.cantidad), 0) as margen
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  left join public.products p on p.id = oi.product_id
  where o.estado = any(public.estados_venta())
    and o.created_at::date between p_desde and p_hasta
  group by oi.product_id
  order by unidades desc, ingresos desc
  limit greatest(coalesce(p_limite, 20), 1);
end; $$;

grant execute on function public.estados_venta() to authenticated;
grant execute on function public.informe_resumen(date, date) to authenticated;
grant execute on function public.informe_ventas_diarias(date, date) to authenticated;
grant execute on function public.informe_mas_vendidos(date, date, int) to authenticated;
