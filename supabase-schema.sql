-- =========================================================
-- El Kiosquillo — Esquema de base de datos para Supabase
-- Pega TODO este archivo en:  Supabase → SQL Editor → New query → Run
-- Crea las tablas, la seguridad por fila (RLS) y las funciones
-- necesarias para cuentas, pedidos y seguimiento.
-- Es idempotente: puedes ejecutarlo varias veces sin romper nada.
-- =========================================================

-- ---------- PERFILES ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text default '',
  telefono   text default '',
  direccion  jsonb default '{}'::jsonb,
  marketing  boolean default false,
  created_at timestamptz default now()
);

-- ---------- PEDIDOS ----------
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  numero     text,
  estado     text default 'confirmado',
  subtotal   numeric(10,2) default 0,
  envio      numeric(10,2) default 0,
  total      numeric(10,2) default 0,
  direccion  jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references public.orders(id) on delete cascade,
  product_id integer,
  nombre     text,
  precio     numeric(10,2),
  cantidad   integer,
  img        text,
  tint       text
);

create table if not exists public.order_tracking_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references public.orders(id) on delete cascade,
  estado      text,
  descripcion text,
  actor       text default 'sistema',
  created_at  timestamptz default now()
);

-- ---------- NUMERACIÓN DE PEDIDOS (KQ-AAAA-00001) ----------
create sequence if not exists public.order_number_seq;

create or replace function public.set_order_number()
returns trigger language plpgsql as $$
begin
  if new.numero is null then
    new.numero := 'KQ-' || extract(year from now())::text || '-' ||
                  lpad(nextval('public.order_number_seq')::text, 5, '0');
  end if;
  return new;
end; $$;

drop trigger if exists trg_order_number on public.orders;
create trigger trg_order_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- ---------- CREAR PERFIL AUTOMÁTICAMENTE AL REGISTRARSE ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre, marketing)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce((new.raw_user_meta_data->>'marketing')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists trg_new_user on auth.users;
create trigger trg_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- SEGURIDAD POR FILA (RLS) ----------
alter table public.profiles              enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_tracking_events enable row level security;

-- Perfiles: cada usuario gestiona el suyo.
drop policy if exists "perfil propio (select)" on public.profiles;
create policy "perfil propio (select)" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "perfil propio (update)" on public.profiles;
create policy "perfil propio (update)" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "perfil propio (insert)" on public.profiles;
create policy "perfil propio (insert)" on public.profiles
  for insert with check (auth.uid() = id);

-- Pedidos: cada usuario ve y crea los suyos.
drop policy if exists "pedidos propios (select)" on public.orders;
create policy "pedidos propios (select)" on public.orders
  for select using (auth.uid() = user_id);
drop policy if exists "pedidos propios (insert)" on public.orders;
create policy "pedidos propios (insert)" on public.orders
  for insert with check (auth.uid() = user_id);

-- Líneas de pedido: accesibles si el pedido es del usuario.
drop policy if exists "items propios (select)" on public.order_items;
create policy "items propios (select)" on public.order_items
  for select using (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Eventos de seguimiento: solo lectura del propio pedido.
drop policy if exists "seguimiento propio (select)" on public.order_tracking_events;
create policy "seguimiento propio (select)" on public.order_tracking_events
  for select using (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ---------- CREAR PEDIDO (atómico, vía RPC) ----------
create or replace function public.crear_pedido(
  p_items     jsonb,
  p_direccion jsonb,
  p_subtotal  numeric,
  p_envio     numeric,
  p_total     numeric
) returns table(id uuid, numero text)
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_numero text; it jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  insert into public.orders (user_id, estado, subtotal, envio, total, direccion)
  values (auth.uid(), 'confirmado', p_subtotal, p_envio, p_total, p_direccion)
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

  insert into public.order_tracking_events (order_id, estado, descripcion, actor)
  values (v_id, 'confirmado', 'Hemos recibido tu pedido y confirmado el pago.', 'sistema');

  return query select v_id, v_numero;
end; $$;

grant execute on function public.crear_pedido(jsonb,jsonb,numeric,numeric,numeric) to authenticated;

-- ---------- ELIMINAR / ANONIMIZAR CUENTA (derecho de supresión) ----------
-- Anonimiza la dirección de los pedidos (se conservan por obligación
-- fiscal de 5 años) y elimina la cuenta de autenticación. El perfil se
-- borra en cascada y el user_id de los pedidos queda a NULL.
create or replace function public.eliminar_mi_cuenta()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  update public.orders
     set direccion = jsonb_build_object('anonimizado', true)
   where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end; $$;

grant execute on function public.eliminar_mi_cuenta() to authenticated;
