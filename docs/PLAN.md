# Plan de implementación · El Kiosquillo

Leyenda: 🤖 = lo hace Claude (código/SQL) · 🧑 = lo haces tú (Supabase/Stripe/datos).
Estado: marca cada casilla al completarla.

---

## FASE 1 — Catálogo en base de datos + blindaje de precios ⭐ (en curso)

- [x] 🤖 SQL `db/inventario-1.sql`: tablas `products` y `suppliers` + RLS + vista `vista_inventario`
- [x] 🤖 Migración del catálogo (32 productos + 10 proveedores desde la marca; stock inicial 100, mínimo 20)
- [x] 🧑 Ejecutar `db/inventario-1.sql` en el SQL Editor de Supabase ✓ (32 filas)
- [x] 🤖 `auth.js`: `getProductos()` / `getProducto(id)` + `aplicarInventario()` (con respaldo a `productos_data.js`)
- [x] 🤖 Tienda lee de la BD: `app.js`, `producto.js`, `caja.js` (precio y stock en vivo, respaldo al fichero)
- [x] 🤖 Blindaje: `crear_pedido` toma el **precio desde `products`** y recalcula totales (`db/inventario-2.sql`)
- [ ] 🧑 Ejecutar `db/inventario-2.sql` en Supabase
- [x] 🤖 Validar y subir

---

## FASE 2 — Panel de administración de productos y proveedores

- [x] 🤖 RPC `crear_producto`, `actualizar_producto`, `ajustar_stock` + seguridad (`db/inventario-3.sql`: vista pública `catalogo_publico`, tabla solo-admin)
- [x] 🤖 `admin.html`/`admin.js`: pestaña **Productos** (listado, alta, edición de precio/stock, activar/desactivar)
- [x] 🤖 Filtro por proveedor + columna de proveedor en el listado
- [x] 🤖 Vista **"Proveedores"** (nº productos, valor stock, plazo) → sus productos
- [x] 🤖 Coste y margen por producto en el listado admin
- [ ] 🧑 Ejecutar `db/inventario-3.sql` y probar
- [x] 🤖 Escaparate desde la BD: altas/bajas/precio/stock del admin se reflejan en la tienda (`fusionarCatalogo`)

---

## FASE 3 — Stock automático con las ventas

- [x] 🤖 Tabla `stock_movements` + RPC `descontar_stock_pedido` / `reponer_stock_pedido` (`db/inventario-5.sql`)
- [x] 🤖 `stripe-webhook`: descuenta stock al confirmar el pago
- [x] 🤖 Admin: reponer stock al cancelar (en `actualizar_estado_pedido`)
- [x] 🤖 Tienda: "Agotado" en portada y ficha; bloqueo de añadir; aviso ⚠ stock bajo en el panel
- [ ] 🧑 Ejecutar `db/inventario-5.sql` + re-desplegar `stripe-webhook` + probar compra

---

## FASE 4 — Informes

- [x] 🤖 SQL `db/inventario-7.sql`: RPCs solo-admin `informe_resumen` / `informe_ventas_diarias` / `informe_mas_vendidos`
- [x] 🤖 Admin: pestaña **Informes** (resumen, ventas por día, más vendidos, margen) con selector de fechas
- [x] 🤖 Exportar a CSV
- [ ] 🧑 Ejecutar `db/inventario-7.sql` en Supabase

---

## FASE 5 — Compras a proveedor (descuentos + coste medio WAC)

- [x] 🤖 SQL `db/inventario-8.sql`: tablas `purchase_orders`, `purchase_order_items`, `supplier_discount_tiers` + RLS
- [x] 🤖 RPC `recibir_pedido_compra`: descuento por umbral + portes prorrateados + recálculo WAC + movimiento `reposicion`
- [x] 🤖 RPCs `crear_pedido_compra`, `cancelar_pedido_compra`, `descuento_proveedor` + vista `vista_compras`
- [x] 🤖 Admin: pestaña **Compras** (crear borrador con líneas y descuento en vivo, recibir mercancía, tramos por proveedor)
- [x] 🤖 `precio_coste` ampliado a `numeric(10,4)` para no perder precisión en el WAC
- [x] 🤖 `db/inventario-9.sql`: separa **marca** (atributo del producto) de **proveedor**; crea el proveedor real "Lekkerland" y reapunta el catálogo
- [x] 🤖 Admin: columna **Marca** editable/buscable en Productos y campo de marca en el alta
- [ ] 🧑 Ejecutar `db/inventario-8.sql` y `db/inventario-9.sql` en Supabase
- [ ] 🧑 Cargar reglas de descuento de proveedores + probar recepción

---

## FASE 6 — Pedidos predictivos · ⏸️ APLAZADA (se retoma más adelante)

- [ ] 🤖 Punto de pedido por producto (con el plazo de cada proveedor)
- [ ] 🤖 Sugerencias de reposición agrupadas por proveedor
- [ ] 🤖 (después) media móvil + estacionalidad

---

## BLOQUE GO-LIVE (en paralelo)

- [ ] 🧑 Rellenar datos legales `[ ]` (NIF, domicilio, contacto)
- [ ] 🤖 Auto-hospedar las fuentes de Google (requiere entorno con red)
- [ ] 🧑 Catálogo real (precios/fotos/stock) y tarifa de envío real
- [ ] 🧑 WhatsApp/redes reales
- [ ] 🧑 Pasar Stripe a producción (claves live + webhook live)

---

### Documentos de referencia
- `ARQUITECTURA.md` — visión global del e-commerce
- `INVENTARIO.md` — diseño de inventario, proveedores, compras y WAC
- `PAGOS-STRIPE.md` — configuración de la pasarela de pago
- `db/supabase-schema.sql` · `db/supabase-admin.sql` · `db/supabase-pagos.sql` · `db/inventario-1.sql`…`db/inventario-9.sql` — SQL a ejecutar en Supabase
