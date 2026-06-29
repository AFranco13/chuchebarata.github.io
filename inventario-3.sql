-- =========================================================
-- El Kiosquillo — Inventario Fase 2: gestión + seguridad del catálogo
-- Ejecuta DESPUÉS de inventario-1.sql e inventario-2.sql.
--   · Protege el coste/proveedor: el público solo ve columnas seguras.
--   · RPCs de administración de productos.
-- Idempotente.
-- =========================================================

-- 1) Vista PÚBLICA con solo columnas seguras (productos activos).
--    El público lee de aquí; nunca de la tabla products directamente.
drop view if exists public.catalogo_publico;
create view public.catalogo_publico as
  select id, nombre, categoria, cat_label, slug, img, precio, precio_comp, stock
  from public.products
  where activo = true;
grant select on public.catalogo_publico to anon, authenticated;

-- 2) La tabla products pasa a ser SOLO ADMIN (deja de ser pública).
drop policy if exists "productos visibles" on public.products;
drop policy if exists "productos admin" on public.products;
create policy "productos admin" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- 3) vista_inventario (con coste/margen) solo para admin: usa la RLS del
--    invocador, así un cliente autenticado no admin no ve nada.
drop view if exists public.vista_inventario;
create view public.vista_inventario with (security_invoker = true) as
  select p.id, p.sku, p.nombre, p.categoria, p.cat_label, p.stock, p.stock_minimo,
         p.precio_coste, p.precio, round(p.precio - p.precio_coste, 2) as margen_eur,
         p.proveedor_id, s.nombre as proveedor, s.plazo_entrega_dias, p.activo
  from public.products p
  left join public.suppliers s on s.id = p.proveedor_id;
grant select on public.vista_inventario to authenticated;

-- ---------- RPCs de administración ----------

create or replace function public.crear_producto(p jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare v_id integer;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select coalesce(max(id), 0) + 1 into v_id from public.products;
  insert into public.products (id, sku, nombre, categoria, cat_label, precio, precio_coste,
                               stock, stock_minimo, proveedor_id, ref_proveedor, activo)
  values (
    v_id,
    coalesce(nullif(p->>'sku',''), 'KQ-' || v_id),
    p->>'nombre',
    p->>'categoria',
    p->>'cat_label',
    coalesce(nullif(p->>'precio','')::numeric, 0),
    coalesce(nullif(p->>'precio_coste','')::numeric, 0),
    coalesce(nullif(p->>'stock','')::int, 0),
    coalesce(nullif(p->>'stock_minimo','')::int, 0),
    nullif(p->>'proveedor_id','')::int,
    p->>'ref_proveedor',
    coalesce((p->>'activo')::boolean, true)
  );
  return v_id;
end; $$;
grant execute on function public.crear_producto(jsonb) to authenticated;

create or replace function public.actualizar_producto(p_id integer, p_cambios jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  update public.products set
    nombre       = coalesce(nullif(p_cambios->>'nombre',''), nombre),
    precio       = coalesce(nullif(p_cambios->>'precio','')::numeric, precio),
    precio_coste = coalesce(nullif(p_cambios->>'precio_coste','')::numeric, precio_coste),
    stock        = coalesce(nullif(p_cambios->>'stock','')::int, stock),
    stock_minimo = coalesce(nullif(p_cambios->>'stock_minimo','')::int, stock_minimo),
    proveedor_id = coalesce(nullif(p_cambios->>'proveedor_id','')::int, proveedor_id),
    activo       = coalesce((p_cambios->>'activo')::boolean, activo),
    updated_at   = now()
  where id = p_id;
end; $$;
grant execute on function public.actualizar_producto(integer, jsonb) to authenticated;

create or replace function public.ajustar_stock(p_id integer, p_delta integer, p_motivo text default 'ajuste')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  update public.products set stock = greatest(stock + p_delta, 0), updated_at = now() where id = p_id;
end; $$;
grant execute on function public.ajustar_stock(integer, integer, text) to authenticated;
