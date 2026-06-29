# Base de datos (Supabase)

Scripts SQL que se ejecutan **a mano** en Supabase → **SQL Editor**.
No forman parte del sitio publicado; son la definición del backend
(tablas, RLS, vistas y funciones RPC).

## Orden de ejecución

Ejecútalos en este orden. Todos son **idempotentes**: puedes volver a
lanzarlos sin romper nada.

| # | Archivo | Qué hace |
|---|---------|----------|
| 1 | `supabase-schema.sql` | Perfiles, pedidos, seguimiento y RLS base |
| 2 | `supabase-admin.sql` | Rol de administrador (`is_admin`) |
| 3 | `supabase-pagos.sql` | Soporte de pagos (sesión de pago, estado pendiente) |
| 4 | `inventario-1.sql` | Tablas `products` y `suppliers` + vista `vista_inventario` + migración del catálogo |
| 5 | `inventario-2.sql` | `crear_pedido` toma el precio desde `products` (blindaje) |
| 6 | `inventario-3.sql` | Vista pública `catalogo_publico`, tabla solo-admin, RPCs de producto |
| 7 | `inventario-4.sql` | Desactiva los productos "pack" duplicados |
| 8 | `inventario-5.sql` | `stock_movements` + descuento/reposición de stock con las ventas |
| 9 | `inventario-6.sql` | `eliminar_producto` (borrado seguro desde el panel) |
| 10 | `inventario-7.sql` | Informes: `informe_resumen`, `informe_ventas_diarias`, `informe_mas_vendidos` |
| 11 | `inventario-8.sql` | Compras a proveedor: pedidos de compra, tramos de descuento y recepción con coste medio (WAC) |
| 12 | `inventario-9.sql` | Separa marca (atributo del producto) de proveedor; crea el proveedor real "Lekkerland" |

## Edge Functions

El código de las funciones (Deno/TypeScript) está en `../supabase/functions/`:
`crear-sesion-pago` y `stripe-webhook`. Se despliegan con la CLI de Supabase,
no desde el SQL Editor.
