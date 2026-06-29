-- =========================================================
-- El Kiosquillo — Inventario: eliminar packs duplicados
-- Ejecuta DESPUÉS de inventario-1.sql.
-- Desactiva los 10 packs que duplicaban a su unidad suelta. Se venden
-- por unidad suelta; el cliente añade varias unidades al carrito.
-- (Soft-delete: se conservan las filas por si hay pedidos históricos.)
-- Idempotente.
-- =========================================================

update public.products
   set activo = false, updated_at = now()
 where id in (4, 5, 6, 7, 8, 9, 11, 15, 17, 22);

-- Para comprobar lo que queda visible:
-- select id, nombre, precio, activo from public.products order by id;
