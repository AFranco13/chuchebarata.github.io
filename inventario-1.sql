-- =========================================================
-- El Kiosquillo — Inventario Fase 1: tablas + migración del catálogo
-- Ejecuta DESPUÉS de supabase-schema.sql y supabase-admin.sql.
-- Crea suppliers y products, aplica RLS y migra los productos actuales.
-- Idempotente.
-- =========================================================

create table if not exists public.suppliers (
  id serial primary key,
  nombre text unique not null,
  contacto_email text,
  telefono text,
  web text,
  plazo_entrega_dias int default 5,
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id integer primary key,
  sku text,
  nombre text not null,
  categoria text,
  cat_label text,
  slug text,
  img text,
  precio numeric(10,2) not null default 0,
  precio_coste numeric(10,2) default 0,
  precio_comp numeric(10,2),
  stock integer not null default 0,
  stock_minimo integer default 0,
  proveedor_id integer references public.suppliers(id),
  ref_proveedor text,
  url_proveedor text,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.products  enable row level security;
alter table public.suppliers enable row level security;

drop policy if exists "productos visibles" on public.products;
create policy "productos visibles" on public.products
  for select using (activo = true or public.is_admin());
drop policy if exists "productos admin" on public.products;
create policy "productos admin" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "proveedores admin select" on public.suppliers;
create policy "proveedores admin select" on public.suppliers
  for select using (public.is_admin());
drop policy if exists "proveedores admin all" on public.suppliers;
create policy "proveedores admin all" on public.suppliers
  for all using (public.is_admin()) with check (public.is_admin());

create or replace view public.vista_inventario as
  select p.id, p.sku, p.nombre, p.categoria, p.stock, p.stock_minimo,
         p.precio_coste, p.precio,
         round(p.precio - p.precio_coste, 2) as margen_eur,
         p.proveedor_id, s.nombre as proveedor, s.plazo_entrega_dias, p.activo
  from public.products p
  left join public.suppliers s on s.id = p.proveedor_id;

-- ---------- Proveedores (desde las marcas actuales) ----------
insert into public.suppliers (nombre) values ('Fini') on conflict (nombre) do nothing;
insert into public.suppliers (nombre) values ('Burmar') on conflict (nombre) do nothing;
insert into public.suppliers (nombre) values ('Cerdán') on conflict (nombre) do nothing;
insert into public.suppliers (nombre) values ('Smint') on conflict (nombre) do nothing;
insert into public.suppliers (nombre) values ('Orbit') on conflict (nombre) do nothing;
insert into public.suppliers (nombre) values ('Oreo') on conflict (nombre) do nothing;
insert into public.suppliers (nombre) values ('Gerio') on conflict (nombre) do nothing;
insert into public.suppliers (nombre) values ('King Regal') on conflict (nombre) do nothing;
insert into public.suppliers (nombre) values ('Damel') on conflict (nombre) do nothing;
insert into public.suppliers (nombre) values ('Nestlé') on conflict (nombre) do nothing;

-- ---------- Productos (migrados de productos_data.js) ----------
-- Stock inicial por defecto: 100 uds · stock mínimo: 20 uds
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (1, 'REF-7757', 'Taco Relleno Regaliz 1 kg Fini', 'regaliz', 'Regaliz', 'taco-relleno-regaliz-1-kg-fini', 'images/productos/taco-relleno-regaliz-1-kg-fini.jpg', 10.69, 4.98, 11.55, 100, 20, (select id from public.suppliers where nombre='Fini'), '7757', 'https://www.lekkerlandstore.com/regalices/661-taco-relleno-regaliz-1-kg-fini.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (2, 'REF-2189', 'Ranas gigantes brillo 1 kg Fini', 'gominolas', 'Gominolas', 'ranas-gigantes-brillo-1-kg-fini', 'images/productos/ranas-gigantes-brillo-1-kg-fini.jpg', 6.59, 3.56, 7.1, 100, 20, (select id from public.suppliers where nombre='Fini'), '2189', 'https://www.lekkerlandstore.com/gominolas/3843-ranas-gigantes-brillo-1kg-fini.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (3, 'REF-10114', 'Crunchy Asteroides Surtidos 1 kg Burmar', 'gominolas', 'Gominolas', 'crunchy-asteroides-surtidos-1-kg-burmar', 'images/productos/crunchy-asteroides-surtidos-1-kg-burmar.jpg', 10.39, 6.34, 11.2, 100, 20, (select id from public.suppliers where nombre='Burmar'), '10114', 'https://www.lekkerlandstore.com/gominolas/3699-crunchy-asteroides-surtidos-1-kg-burmar.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (4, 'REF-2515', 'Piruletas Corazon 110 ud Cerdan', 'caramelos', 'Caramelos', 'piruletas-corazon-110-ud-cerdan', 'images/productos/piruletas-corazon-110-ud-cerdan.jpg', 10.09, 6.34, 10.95, 100, 20, (select id from public.suppliers where nombre='Cerdán'), '2515', 'https://www.lekkerlandstore.com/piruletas/3842-piruletas-corazon-110-ud-cerdan.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (5, 'REF-1670', 'Smint Tabs Menta 12 ud', 'caramelos', 'Caramelos', 'smint-tabs-menta-12-ud', 'images/productos/smint-tabs-menta-12-ud.jpg', 23.69, 15.01, 25.5, 100, 20, (select id from public.suppliers where nombre='Smint'), '1670', 'https://www.lekkerlandstore.com/caramelos/3219-smint-tabs-menta-12-ud.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (6, 'REF-8554', 'Cereza envuelta gragea 80 g (12 ud) Fini', 'gominolas', 'Gominolas', 'cereza-envuelta-gragea-80-g-12-ud-fini', 'images/productos/cereza-envuelta-gragea-80-g-12-ud-fini.jpg', 11.19, 7.26, 12.05, 100, 20, (select id from public.suppliers where nombre='Fini'), '8554', 'https://www.lekkerlandstore.com/gominolas/1377-cereza-envuelta-gragea-80-g-12-ud-fini.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (7, 'REF-7929', 'Orbit Refreshers Hierbabuena (16 ud)', 'chicles', 'Chicles', 'orbit-refreshers-hierbabuena-16-ud', 'images/productos/orbit-refreshers-hierbabuena-16-ud.jpg', 21.29, 14.47, 22.95, 100, 20, (select id from public.suppliers where nombre='Orbit'), '7929', 'https://www.lekkerlandstore.com/chicles/4288-orbit-refreshers-hierbabuena-16-ud.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (8, 'REF-15061', 'Sobres Soda Unicornios Fresa Plátano (40 ud) Cerdán', 'caramelos', 'Caramelos', 'sobres-soda-unicornios-fresa-platano-40-ud-cerdan', 'images/productos/sobres-soda-unicornios-fresa-platano-40-ud-cerdan.jpg', 9.79, 6.65, 10.55, 100, 20, (select id from public.suppliers where nombre='Cerdán'), '15061', 'https://www.lekkerlandstore.com/caramelos-con-palo/3817-sobres-soda-unicornios-fresa-platano-40-ud-cerdan.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (9, 'REF-9813', 'Orbit Refreshers Tropical (16 ud)', 'chicles', 'Chicles', 'orbit-refreshers-tropical-16-ud', 'images/productos/orbit-refreshers-tropical-16-ud.jpg', 21.29, 14.47, 22.95, 100, 20, (select id from public.suppliers where nombre='Orbit'), '9813', 'https://www.lekkerlandstore.com/chicles/3423-orbit-refreshers-tropical-16-ud.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (10, 'REF-15109', 'Mesa Dulce Rosa', 'conos', 'Conos y cestas', 'mesa-dulce-rosa', 'images/productos/mesa-dulce-rosa.jpg', 55.79, 37.95, 60, 100, 20, (select id from public.suppliers where nombre='Fini'), '15109', 'https://www.lekkerlandstore.com/golosinas/3992-mesa-dulce-rosa.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (11, 'REF-1364', 'Oreo doble crema 157 g (16 ud)', 'chocolate', 'Chocolate', 'oreo-doble-crema-157-g-16-ud', 'images/productos/oreo-doble-crema-157-g-16-ud.jpg', 30.59, 20.85, 32.95, 100, 20, (select id from public.suppliers where nombre='Oreo'), '1364', 'https://www.lekkerlandstore.com/galletas/3218-oreo-doble-crema-185-g-12-ud.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (12, 'REF-7819', 'Panna Fragola 200 Ud Fini', 'chicles', 'Chicles', 'panna-fragola-200-ud-fini', 'images/productos/panna-fragola-200-ud-fini.jpg', 10.89, 7.56, 11.75, 100, 20, (select id from public.suppliers where nombre='Fini'), '7819', 'https://www.lekkerlandstore.com/chicles/3853-chicle-panna-fragola-200-ud-fini.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (13, 'REF-2651', 'Caramelo relleno de miel 1 kg Gerio', 'caramelos', 'Caramelos', 'caramelo-relleno-de-miel-1-kg-gerio', 'images/productos/caramelo-relleno-de-miel-1-kg-gerio.jpg', 11.59, 8.08, 12.5, 100, 20, (select id from public.suppliers where nombre='Gerio'), '2651', 'https://www.lekkerlandstore.com/caramelos/1925-caramelo-relleno-de-miel-1-kg-gerio.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (14, 'REF-4507', 'Taco Lápiz Nata Fresa 1 kg King Regal', 'regaliz', 'Regaliz', 'taco-lapiz-nata-fresa-1-kg-king-regal', 'images/productos/taco-lapiz-nata-fresa-1-kg-king-regal.jpg', 6.19, 4.41, 6.75, 100, 20, (select id from public.suppliers where nombre='King Regal'), '4507', 'https://www.lekkerlandstore.com/regalices/3846-taco-lapiz-nata-fresa-1-kg-king-regal.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (15, 'REF-15062', 'Sobres Soda Dinos Lima Limón (40 ud) Cerdán', 'caramelos', 'Caramelos', 'sobres-soda-dinos-lima-limon-40-ud-cerdan', 'images/productos/sobres-soda-dinos-lima-limon-40-ud-cerdan.jpg', 9.79, 7, 10.55, 100, 20, (select id from public.suppliers where nombre='Cerdán'), '15062', 'https://www.lekkerlandstore.com/piruletas/3816-sobres-soda-dinos-lima-limon-40-ud-cerdan.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (16, 'REF-15241', 'Lagrimas de eucalipto 1 kg Damel', 'gominolas', 'Gominolas', 'lagrimas-de-eucalipto-1-kg-damel', 'images/productos/lagrimas-de-eucalipto-1-kg-damel.jpg', 5.99, 4.35, 6.55, 100, 20, (select id from public.suppliers where nombre='Damel'), '15241', 'https://www.lekkerlandstore.com/gominolas/4091-lagrimas-de-eucalipto-1-kg-damel.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (17, 'REF-9498', 'Barrita Jungly 34 g (30 ud) Nestlé', 'chocolate', 'Chocolate', 'barrita-jungly-34-g-30-ud-nestle', 'images/productos/barrita-jungly-34-g-30-ud-nestle.jpg', 18.49, 13.5, 19.9, 100, 20, (select id from public.suppliers where nombre='Nestlé'), '9498', 'https://www.lekkerlandstore.com/barritas-de-chocolate/3112-snack-jungly-barrita-34-g-30-ud-nestle.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (18, 'REF-8044', 'Macedonia 250 ud Fini', 'chicles', 'Chicles', 'macedonia-250-ud-fini', 'images/productos/macedonia-250-ud-fini.jpg', 11.49, 8.51, 12.4, 100, 20, (select id from public.suppliers where nombre='Fini'), '8044', 'https://www.lekkerlandstore.com/chicles/1228-macedonia-250-ud-fini.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (19, 'REF-15174', 'Mesa Dulce Azul', 'conos', 'Conos y cestas', 'mesa-dulce-azul', 'images/productos/mesa-dulce-azul.jpg', 51.09, 37.95, 55, 100, 20, (select id from public.suppliers where nombre='Fini'), '15174', 'https://www.lekkerlandstore.com/golosinas/3993-mesa-dulce-azul.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (20, 'REF-2075', 'Aros fresa pica 1 kg Fini', 'gominolas', 'Gominolas', 'aros-fresa-pica-1-kg-fini', 'images/productos/aros-fresa-pica-1-kg-fini.jpg', 5.39, 4.08, 5.9, 100, 20, (select id from public.suppliers where nombre='Fini'), '2075', 'https://www.lekkerlandstore.com/gominolas/386-aros-fresa-pica-1-kg-fini.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (21, 'REF-8021', 'Burguer Gum 200 ud Fini', 'chicles', 'Chicles', 'burguer-gum-200-ud-fini', 'images/productos/burguer-gum-200-ud-fini.jpg', 12.59, 9.46, 13.64, 100, 20, (select id from public.suppliers where nombre='Fini'), '8021', 'https://www.lekkerlandstore.com/chicles/1402-chicles-burguer-gum-200-ud-fini.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (22, 'REF-1317', 'Snack Crunch 33 g (30 ud) Nestlé', 'chocolate', 'Chocolate', 'snack-crunch-33-g-30-ud-nestle', 'images/productos/snack-crunch-33-g-30-ud-nestle.jpg', 18.49, 13.95, 19.9, 100, 20, (select id from public.suppliers where nombre='Nestlé'), '1317', 'https://www.lekkerlandstore.com/chocolatinas/1003-chocolate-crujiente-con-avellana-nestle-snack.html', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (23, 'REF-2515-ud', 'Piruleta Corazón Cerdán', 'caramelos', 'Caramelos', 'piruleta-corazon-cerdan', 'images/productos/piruletas-corazon-110-ud-cerdan.jpg', 0.25, 0.06, 0.35, 100, 20, (select id from public.suppliers where nombre='Cerdán'), '2515-ud', '', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (24, 'REF-1670-ud', 'Smint Tabs Menta 1 cajita', 'caramelos', 'Caramelos', 'smint-tabs-menta-1-cajita', 'images/productos/smint-tabs-menta-12-ud.jpg', 1.99, 1.25, 2.29, 100, 20, (select id from public.suppliers where nombre='Smint'), '1670-ud', '', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (25, 'REF-8554-ud', 'Cereza envuelta gragea 80 g Fini', 'gominolas', 'Gominolas', 'cereza-envuelta-gragea-80-g-fini', 'images/productos/cereza-envuelta-gragea-80-g-12-ud-fini.jpg', 0.99, 0.61, 1.1, 100, 20, (select id from public.suppliers where nombre='Fini'), '8554-ud', '', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (26, 'REF-7929-ud', 'Orbit Refreshers Hierbabuena 1 ud', 'chicles', 'Chicles', 'orbit-refreshers-hierbabuena-1-ud', 'images/productos/orbit-refreshers-hierbabuena-16-ud.jpg', 1.49, 0.9, 1.65, 100, 20, (select id from public.suppliers where nombre='Orbit'), '7929-ud', '', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (27, 'REF-15061-ud', 'Sobre Soda Unicornios Fresa Plátano Cerdán', 'caramelos', 'Caramelos', 'sobre-soda-unicornios-fresa-platano-cerdan', 'images/productos/sobres-soda-unicornios-fresa-platano-40-ud-cerdan.jpg', 0.35, 0.17, 0.45, 100, 20, (select id from public.suppliers where nombre='Cerdán'), '15061-ud', '', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (28, 'REF-9813-ud', 'Orbit Refreshers Tropical 1 ud', 'chicles', 'Chicles', 'orbit-refreshers-tropical-1-ud', 'images/productos/orbit-refreshers-tropical-16-ud.jpg', 1.49, 0.9, 1.65, 100, 20, (select id from public.suppliers where nombre='Orbit'), '9813-ud', '', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (29, 'REF-1364-ud', 'Oreo doble crema 157 g', 'chocolate', 'Chocolate', 'oreo-doble-crema-157-g', 'images/productos/oreo-doble-crema-157-g-16-ud.jpg', 1.99, 1.3, 2.29, 100, 20, (select id from public.suppliers where nombre='Oreo'), '1364-ud', '', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (30, 'REF-15062-ud', 'Sobre Soda Dinos Lima Limón Cerdán', 'caramelos', 'Caramelos', 'sobre-soda-dinos-lima-limon-cerdan', 'images/productos/sobres-soda-dinos-lima-limon-40-ud-cerdan.jpg', 0.35, 0.18, 0.45, 100, 20, (select id from public.suppliers where nombre='Cerdán'), '15062-ud', '', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (31, 'REF-9498-ud', 'Barrita Jungly 34 g Nestlé', 'chocolate', 'Chocolate', 'barrita-jungly-34-g-nestle', 'images/productos/barrita-jungly-34-g-30-ud-nestle.jpg', 0.79, 0.45, 0.89, 100, 20, (select id from public.suppliers where nombre='Nestlé'), '9498-ud', '', true) on conflict (id) do nothing;
insert into public.products (id, sku, nombre, categoria, cat_label, slug, img, precio, precio_coste, precio_comp, stock, stock_minimo, proveedor_id, ref_proveedor, url_proveedor, activo) values (32, 'REF-1317-ud', 'Snack Crunch 33 g Nestlé', 'chocolate', 'Chocolate', 'snack-crunch-33-g-nestle', 'images/productos/snack-crunch-33-g-30-ud-nestle.jpg', 0.79, 0.47, 0.89, 100, 20, (select id from public.suppliers where nombre='Nestlé'), '1317-ud', '', true) on conflict (id) do nothing;
