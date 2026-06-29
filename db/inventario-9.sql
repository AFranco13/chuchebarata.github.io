-- =========================================================
-- El Kiosquillo — Inventario: separar MARCA de PROVEEDOR
-- Ejecuta DESPUÉS de inventario-1..8.sql.
--
-- Corrige el modelo: la marca (Fini, Burmar, Damel…) es un atributo del
-- PRODUCTO, no el proveedor. El proveedor es a quién se le compra; hasta
-- ahora el único es Lekkerland (lekkerlandstore.com), de donde provienen
-- todas las referencias y URLs de los productos actuales.
--
--   1) products.marca (nueva columna) ← nombre que estaba en suppliers.
--   2) Alta del proveedor real "Lekkerland".
--   3) Reapunta los productos (que apuntaban a una marca) a Lekkerland.
--   4) Elimina las marcas que estaban dadas de alta como proveedores.
--   5) vista_inventario y RPCs de producto incluyen marca.
-- Idempotente.
-- =========================================================

-- Marcas que se habían cargado como proveedores en inventario-1.sql.
-- (Se usan abajo para identificar qué reapuntar y qué limpiar.)

-- 1) Nueva columna marca y copia desde el "proveedor" actual (que era la marca).
alter table public.products add column if not exists marca text;
update public.products p
   set marca = s.nombre
  from public.suppliers s
 where s.id = p.proveedor_id and (p.marca is null or p.marca = '');

-- 2) Proveedor real: Lekkerland.
insert into public.suppliers (nombre, web, plazo_entrega_dias)
values ('Lekkerland', 'https://www.lekkerlandstore.com', 5)
on conflict (nombre) do nothing;

-- 3) Reapunta a Lekkerland los productos cuyo proveedor sigue siendo una marca.
update public.products p
   set proveedor_id = (select id from public.suppliers where nombre = 'Lekkerland'),
       updated_at = now()
 where exists (
   select 1 from public.suppliers s
   where s.id = p.proveedor_id
     and s.nombre in ('Fini','Burmar','Cerdán','Smint','Orbit','Oreo',
                      'Gerio','King Regal','Damel','Nestlé')
 );

-- 4) Elimina las marcas dadas de alta como proveedores, SOLO si ya no las
--    referencia nada (productos / tramos / pedidos de compra). Así no se
--    pierde nada si durante las pruebas se creó algún tramo o pedido.
delete from public.suppliers s
 where s.nombre in ('Fini','Burmar','Cerdán','Smint','Orbit','Oreo',
                    'Gerio','King Regal','Damel','Nestlé')
   and not exists (select 1 from public.products             where proveedor_id = s.id)
   and not exists (select 1 from public.supplier_discount_tiers where proveedor_id = s.id)
   and not exists (select 1 from public.purchase_orders        where proveedor_id = s.id);

-- 5) vista_inventario con marca (se elimina y recrea por la dependencia).
drop view if exists public.vista_inventario;
create view public.vista_inventario with (security_invoker = true) as
  select p.id, p.sku, p.nombre, p.categoria, p.cat_label, p.marca,
         p.stock, p.stock_minimo, p.precio_coste, p.precio,
         round(p.precio - p.precio_coste, 2) as margen_eur,
         p.proveedor_id, s.nombre as proveedor, s.plazo_entrega_dias, p.activo
  from public.products p
  left join public.suppliers s on s.id = p.proveedor_id;
grant select on public.vista_inventario to authenticated;

-- ---------- RPCs de producto: incluir marca ----------
create or replace function public.crear_producto(p jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare v_id integer;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select coalesce(max(id), 0) + 1 into v_id from public.products;
  insert into public.products (id, sku, nombre, categoria, cat_label, marca, precio, precio_coste,
                               stock, stock_minimo, proveedor_id, ref_proveedor, activo)
  values (
    v_id,
    coalesce(nullif(p->>'sku',''), 'KQ-' || v_id),
    p->>'nombre',
    p->>'categoria',
    p->>'cat_label',
    nullif(p->>'marca',''),
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
    marca        = case when p_cambios ? 'marca' then nullif(p_cambios->>'marca','') else marca end,
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
