-- =========================================================
-- El Kiosquillo — Inventario Fase 10 (Métricas y embudo de compra)
-- Ejecuta DESPUÉS de inventario-1..9.sql.
--
-- Registro de eventos de negocio (añadir al carrito, clic en "Tramitar
-- pedido", vista de checkout, pago cancelado, pedido creado/pagado) para
-- calcular el embudo de conversión y el abandono de carrito/checkout,
-- que no se pueden obtener de Google Analytics porque requieren cruzar
-- con los pedidos reales (orders). Cada sesión de compra se identifica
-- por un UUID de sesión (sessionStorage del navegador, vive mientras
-- dura la pestaña) — sin cookies persistentes entre visitas ni datos
-- personales directos.
--
-- Primera tabla del esquema con INSERT permitido a "anon" (añadir al
-- carrito y pulsar "Tramitar pedido" ocurren antes de iniciar sesión).
-- Solo INSERT: nadie lee las filas salvo los RPCs de informe de abajo
-- (security definer, solo-admin).
-- Idempotente.
-- =========================================================

-- 1) Tabla de eventos.
create table if not exists public.eventos_analitica (
  id         bigint generated always as identity primary key,
  session_id uuid not null,
  tipo       text not null,
  datos      jsonb not null default '{}'::jsonb,
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Taxonomía cerrada de eventos (evita que la tabla se use como cajón de
-- sastre). Amplía esta lista aquí si se añaden más eventos en el futuro.
alter table public.eventos_analitica drop constraint if exists eventos_analitica_tipo_check;
alter table public.eventos_analitica add constraint eventos_analitica_tipo_check
  check (tipo = any(array[
    'add_to_cart', 'checkout_click', 'checkout_view',
    'payment_cancelled', 'order_created', 'order_paid'
  ]));

-- Límite de tamaño del payload (evita abuso: nadie necesita más que esto
-- para describir un evento de carrito/pedido).
alter table public.eventos_analitica drop constraint if exists eventos_analitica_datos_check;
alter table public.eventos_analitica add constraint eventos_analitica_datos_check
  check (octet_length(datos::text) < 2000);

create index if not exists idx_eventos_analitica_tipo_fecha
  on public.eventos_analitica (tipo, created_at);
create index if not exists idx_eventos_analitica_sesion_tipo
  on public.eventos_analitica (session_id, tipo);

-- 2) RLS: solo INSERT para anon/authenticated. Nadie hace SELECT directo
--    (ni siquiera admin): todo pasa por los RPCs de abajo.
alter table public.eventos_analitica enable row level security;

drop policy if exists "eventos analitica insert" on public.eventos_analitica;
create policy "eventos analitica insert" on public.eventos_analitica
  for insert to anon, authenticated with check (true);

grant insert on public.eventos_analitica to anon, authenticated;
-- Sin grant de select/update/delete para anon/authenticated: la tabla es
-- de solo escritura desde el cliente.

-- 3) RPCs solo-admin: embudo, abandono, valor de carrito y recuperación.

-- Sesiones y eventos por etapa del embudo, en orden lógico de compra.
create or replace function public.informe_embudo(p_desde date, p_hasta date)
returns table(tipo text, sesiones bigint, eventos bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  return query
  select
    e.tipo,
    count(distinct e.session_id) as sesiones,
    count(*)                    as eventos
  from public.eventos_analitica e
  where e.created_at::date between p_desde and p_hasta
  group by e.tipo
  order by array_position(
    array['add_to_cart','checkout_click','checkout_view','payment_cancelled','order_created','order_paid'],
    e.tipo
  );
end; $$;

-- Sesiones que hicieron clic en "Tramitar pedido" en el rango pero NUNCA
-- (en cualquier fecha) llegaron a crear un pedido. No se filtra por fecha
-- el lado de order_created: si el pedido se completó más tarde (aunque
-- sea fuera del rango), no cuenta como abandono.
create or replace function public.informe_checkout_abandonado(p_desde date, p_hasta date)
returns table(sesiones_abandonadas bigint, sesiones_con_click bigint, pct numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_abandonadas bigint;
  v_total bigint;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;

  select count(distinct e.session_id) into v_total
  from public.eventos_analitica e
  where e.tipo = 'checkout_click'
    and e.created_at::date between p_desde and p_hasta;

  select count(distinct e.session_id) into v_abandonadas
  from public.eventos_analitica e
  where e.tipo = 'checkout_click'
    and e.created_at::date between p_desde and p_hasta
    and not exists (
      select 1 from public.eventos_analitica o
      where o.session_id = e.session_id and o.tipo = 'order_created'
    );

  return query select
    coalesce(v_abandonadas, 0),
    coalesce(v_total, 0),
    case when coalesce(v_total, 0) = 0 then 0
         else round(v_abandonadas::numeric / v_total * 100, 1) end;
end; $$;

-- Sesiones que añadieron algo al carrito en el rango pero nunca (en
-- cualquier fecha) llegaron a pulsar "Tramitar pedido".
create or replace function public.informe_carritos_sin_checkout(p_desde date, p_hasta date)
returns table(sesiones_sin_checkout bigint, sesiones_con_carrito bigint, pct numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_sin bigint;
  v_total bigint;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;

  select count(distinct e.session_id) into v_total
  from public.eventos_analitica e
  where e.tipo = 'add_to_cart'
    and e.created_at::date between p_desde and p_hasta;

  select count(distinct e.session_id) into v_sin
  from public.eventos_analitica e
  where e.tipo = 'add_to_cart'
    and e.created_at::date between p_desde and p_hasta
    and not exists (
      select 1 from public.eventos_analitica c
      where c.session_id = e.session_id and c.tipo = 'checkout_click'
    );

  return query select
    coalesce(v_sin, 0),
    coalesce(v_total, 0),
    case when coalesce(v_total, 0) = 0 then 0
         else round(v_sin::numeric / v_total * 100, 1) end;
end; $$;

-- Valor medio de carrito al ver el checkout (ya con precios reales
-- resueltos) frente al valor medio de pedido realmente creado.
create or replace function public.informe_valor_carrito(p_desde date, p_hasta date)
returns table(valor_medio_vista numeric, valor_medio_pedido numeric)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  return query
  select
    (select coalesce(avg((e.datos->>'total')::numeric), 0)
       from public.eventos_analitica e
      where e.tipo = 'checkout_view' and e.created_at::date between p_desde and p_hasta
        and e.datos ? 'total'),
    (select coalesce(avg((e.datos->>'total')::numeric), 0)
       from public.eventos_analitica e
      where e.tipo = 'order_created' and e.created_at::date between p_desde and p_hasta
        and e.datos ? 'total');
end; $$;

-- De los pagos cancelados en el rango (identificados por el order_id que
-- llevan en datos), cuántos terminaron pagándose de todas formas. Se
-- cruza por order_id, no por session_id: el webhook de Stripe (donde se
-- registra order_paid) no tiene el session_id del navegador.
create or replace function public.informe_recuperacion_pago(p_desde date, p_hasta date)
returns table(recuperadas bigint, total_cancelados bigint, pct numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_rec bigint;
  v_total bigint;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;

  select count(distinct e.datos->>'order_id') into v_total
  from public.eventos_analitica e
  where e.tipo = 'payment_cancelled'
    and e.datos ? 'order_id'
    and e.created_at::date between p_desde and p_hasta;

  select count(distinct e.datos->>'order_id') into v_rec
  from public.eventos_analitica e
  where e.tipo = 'payment_cancelled'
    and e.datos ? 'order_id'
    and e.created_at::date between p_desde and p_hasta
    and exists (
      select 1 from public.eventos_analitica o
      where o.tipo = 'order_paid' and o.datos->>'order_id' = e.datos->>'order_id'
    );

  return query select
    coalesce(v_rec, 0),
    coalesce(v_total, 0),
    case when coalesce(v_total, 0) = 0 then 0
         else round(v_rec::numeric / v_total * 100, 1) end;
end; $$;

grant execute on function public.informe_embudo(date, date) to authenticated;
grant execute on function public.informe_checkout_abandonado(date, date) to authenticated;
grant execute on function public.informe_carritos_sin_checkout(date, date) to authenticated;
grant execute on function public.informe_valor_carrito(date, date) to authenticated;
grant execute on function public.informe_recuperacion_pago(date, date) to authenticated;
