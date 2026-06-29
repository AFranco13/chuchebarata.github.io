-- =========================================================
-- El Kiosquillo — Inventario Fase 5 (compras a proveedor)
-- Ejecuta DESPUÉS de inventario-1..7.sql.
--   · Tramos de descuento por proveedor (supplier_discount_tiers).
--   · Pedidos de compra (purchase_orders + purchase_order_items).
--   · Recepción de mercancía con descuento por umbral, portes
--     prorrateados y recálculo del coste medio ponderado (WAC).
-- Todo solo-admin vía RLS y RPCs security definer.
-- Idempotente.
-- =========================================================

-- Más precisión en el coste para que el WAC no se redondee a 2 decimales.
alter table public.products alter column precio_coste type numeric(10,4);

-- stock_movements: vincular la entrada a su pedido de compra y su coste.
alter table public.stock_movements add column if not exists purchase_order_id uuid;
alter table public.stock_movements add column if not exists coste_unit numeric(10,4);

-- ---------- Tramos de descuento por proveedor ----------
-- Ej.: Fini ≥200 € → 5 %, ≥500 € → 10 %. Se aplica el tramo cuyo umbral
-- sea el mayor que no supere el subtotal del pedido.
create table if not exists public.supplier_discount_tiers (
  id            serial primary key,
  proveedor_id  integer not null references public.suppliers(id) on delete cascade,
  umbral_eur    numeric(10,2) not null,
  descuento_pct numeric(5,2)  not null,   -- 10.00 = 10 %
  created_at    timestamptz default now(),
  unique (proveedor_id, umbral_eur)
);

alter table public.supplier_discount_tiers enable row level security;
drop policy if exists "tramos admin" on public.supplier_discount_tiers;
create policy "tramos admin" on public.supplier_discount_tiers
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Pedidos de compra ----------
create sequence if not exists public.purchase_order_seq;

create table if not exists public.purchase_orders (
  id            uuid primary key default gen_random_uuid(),
  numero        text unique not null default 'OC-' || lpad(nextval('public.purchase_order_seq')::text, 5, '0'),
  proveedor_id  integer references public.suppliers(id),
  estado        text not null default 'borrador',   -- borrador · recibido · cancelado
  subtotal      numeric(10,2) not null default 0,    -- bruto, antes de descuento
  descuento_pct numeric(5,2)  not null default 0,
  portes        numeric(10,2) not null default 0,
  total         numeric(10,2) not null default 0,    -- subtotal·(1−dto) + portes
  nota          text,
  created_at    timestamptz default now(),
  recibido_at   timestamptz
);

create table if not exists public.purchase_order_items (
  id                   uuid primary key default gen_random_uuid(),
  po_id                uuid not null references public.purchase_orders(id) on delete cascade,
  product_id           integer references public.products(id),
  cantidad             integer not null check (cantidad > 0),
  coste_unitario_bruto numeric(10,4) not null
);

alter table public.purchase_orders      enable row level security;
alter table public.purchase_order_items enable row level security;
drop policy if exists "compras admin" on public.purchase_orders;
create policy "compras admin" on public.purchase_orders
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "compras items admin" on public.purchase_order_items;
create policy "compras items admin" on public.purchase_order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- Vista de conveniencia: pedidos de compra con el nombre del proveedor
-- y el nº de líneas. security_invoker → respeta la RLS de quien consulta.
create or replace view public.vista_compras
  with (security_invoker = true) as
  select po.id, po.numero, po.proveedor_id, s.nombre as proveedor,
         po.estado, po.subtotal, po.descuento_pct, po.portes, po.total,
         po.nota, po.created_at, po.recibido_at,
         (select count(*) from public.purchase_order_items i where i.po_id = po.id) as lineas
  from public.purchase_orders po
  left join public.suppliers s on s.id = po.proveedor_id;

-- ---------- Descuento aplicable a un subtotal ----------
create or replace function public.descuento_proveedor(p_proveedor_id integer, p_subtotal numeric)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(max(descuento_pct), 0)
  from public.supplier_discount_tiers
  where proveedor_id = p_proveedor_id and umbral_eur <= p_subtotal;
$$;
grant execute on function public.descuento_proveedor(integer, numeric) to authenticated;

-- ---------- Crear pedido de compra (borrador) ----------
-- p_items: [{ "product_id":1, "cantidad":200, "coste_bruto":0.42 }, ...]
-- Calcula subtotal, aplica el tramo de descuento del proveedor y guarda
-- el total estimado. No toca stock todavía (eso pasa en la recepción).
create or replace function public.crear_pedido_compra(
  p_proveedor_id integer, p_items jsonb, p_portes numeric default 0, p_nota text default null
) returns table(id uuid, numero text)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_numero text; it jsonb;
  v_pid int; v_cant int; v_bruto numeric;
  v_subtotal numeric := 0; v_dto numeric; v_total numeric; v_portes numeric;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'El pedido no tiene líneas'; end if;
  v_portes := greatest(coalesce(p_portes, 0), 0);

  insert into public.purchase_orders (proveedor_id, estado, portes, nota)
  values (p_proveedor_id, 'borrador', v_portes, nullif(p_nota,''))
  returning purchase_orders.id, purchase_orders.numero into v_id, v_numero;

  for it in select * from jsonb_array_elements(p_items) loop
    v_pid   := nullif(it->>'product_id','')::int;
    v_cant  := nullif(it->>'cantidad','')::int;
    v_bruto := coalesce(nullif(it->>'coste_bruto','')::numeric, 0);
    if v_pid is null or v_cant is null or v_cant <= 0 then
      raise exception 'Línea no válida (producto/cantidad)';
    end if;
    insert into public.purchase_order_items (po_id, product_id, cantidad, coste_unitario_bruto)
    values (v_id, v_pid, v_cant, v_bruto);
    v_subtotal := v_subtotal + v_bruto * v_cant;
  end loop;

  v_dto   := public.descuento_proveedor(p_proveedor_id, v_subtotal);
  v_total := round(v_subtotal * (1 - v_dto/100.0), 2) + v_portes;
  update public.purchase_orders
     set subtotal = round(v_subtotal,2), descuento_pct = v_dto, total = v_total
   where purchase_orders.id = v_id;

  return query select v_id, v_numero;
end; $$;
grant execute on function public.crear_pedido_compra(integer, jsonb, numeric, text) to authenticated;

-- ---------- Recibir mercancía (WAC) ----------
-- Idempotente: si el pedido ya está 'recibido' no hace nada.
-- Por cada línea:
--   coste_neto_unit = coste_bruto × (1 − dto)
--   portes_linea    = portes × (valor_neto_linea / valor_neto_total)
--   coste_efectivo  = coste_neto_unit + portes_linea / cantidad
-- y recalcula el coste medio ponderado del producto:
--   nuevo = (stock·coste_actual + cantidad·coste_efectivo) / (stock + cantidad)
create or replace function public.recibir_pedido_compra(p_po_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  po record; it record;
  v_dto numeric; v_neto_total numeric; v_neto_linea numeric;
  v_coste_neto numeric; v_portes_linea numeric; v_efectivo numeric;
  v_stock int; v_coste numeric; v_nuevo numeric;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;

  select * into po from public.purchase_orders where id = p_po_id;
  if po.id is null then raise exception 'Pedido de compra no encontrado'; end if;
  if po.estado = 'recibido' then return; end if;            -- ya recibido
  if po.estado = 'cancelado' then raise exception 'El pedido está cancelado'; end if;

  v_dto := coalesce(po.descuento_pct, 0) / 100.0;

  -- Valor neto total (tras descuento) para prorratear los portes.
  select coalesce(sum(coste_unitario_bruto * (1 - v_dto) * cantidad), 0)
    into v_neto_total
    from public.purchase_order_items where po_id = p_po_id;

  for it in select * from public.purchase_order_items where po_id = p_po_id loop
    v_coste_neto := it.coste_unitario_bruto * (1 - v_dto);
    v_neto_linea := v_coste_neto * it.cantidad;
    v_portes_linea := case when v_neto_total > 0
      then coalesce(po.portes,0) * (v_neto_linea / v_neto_total) else 0 end;
    v_efectivo := round(v_coste_neto + v_portes_linea / it.cantidad, 4);

    select coalesce(stock,0), coalesce(precio_coste,0) into v_stock, v_coste
      from public.products where id = it.product_id;

    -- Coste medio ponderado (si no había stock, el nuevo coste es el de entrada).
    if (greatest(v_stock,0) + it.cantidad) > 0 then
      v_nuevo := round(
        (greatest(v_stock,0) * v_coste + it.cantidad * v_efectivo)
        / (greatest(v_stock,0) + it.cantidad), 4);
    else
      v_nuevo := v_efectivo;
    end if;

    update public.products
       set stock = stock + it.cantidad, precio_coste = v_nuevo, updated_at = now()
     where id = it.product_id;

    insert into public.stock_movements (product_id, delta, motivo, purchase_order_id, coste_unit, actor)
    values (it.product_id, it.cantidad, 'reposicion', p_po_id, v_efectivo, 'compra');
  end loop;

  update public.purchase_orders set estado = 'recibido', recibido_at = now() where id = p_po_id;
end; $$;
grant execute on function public.recibir_pedido_compra(uuid) to authenticated;

-- ---------- Cancelar / borrar un pedido de compra en borrador ----------
create or replace function public.cancelar_pedido_compra(p_po_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_estado text;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select estado into v_estado from public.purchase_orders where id = p_po_id;
  if v_estado is null then raise exception 'Pedido de compra no encontrado'; end if;
  if v_estado = 'recibido' then
    raise exception 'No se puede borrar un pedido ya recibido (afectó al stock).';
  end if;
  delete from public.purchase_orders where id = p_po_id;  -- items en cascada
end; $$;
grant execute on function public.cancelar_pedido_compra(uuid) to authenticated;
