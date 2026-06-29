# Plan de implementación · El Kiosquillo

Leyenda: 🤖 = lo hace Claude (código/SQL) · 🧑 = lo haces tú (Supabase/Stripe/datos).
Estado: marca cada casilla al completarla.

---

## FASE 1 — Catálogo en base de datos + blindaje de precios ⭐ (en curso)

- [x] 🤖 SQL `inventario-1.sql`: tablas `products` y `suppliers` + RLS + vista `vista_inventario`
- [x] 🤖 Migración del catálogo (32 productos + 10 proveedores desde la marca; stock inicial 100, mínimo 20)
- [ ] 🧑 Ejecutar `inventario-1.sql` en el SQL Editor de Supabase
- [ ] 🤖 `auth.js`: `getProductos()` / `getProducto(id)` (lee de Supabase, con respaldo a `productos_data.js`)
- [ ] 🤖 Tienda lee de la BD: `app.js`, `producto.js`, `caja.js` (precio y stock en vivo, respaldo al fichero)
- [ ] 🤖 Blindaje: `crear_pedido` toma el **precio desde `products`** (ignora el del navegador) + FK `order_items.product_id → products`
- [ ] 🧑 Ejecutar el SQL actualizado de `crear_pedido`
- [ ] 🤖 Validar y subir

---

## FASE 2 — Panel de administración de productos y proveedores

- [ ] 🤖 RPC `crear_producto`, `actualizar_producto`, `ajustar_stock(id, delta, motivo)` (solo admin)
- [ ] 🤖 `admin.html`/`admin.js`: pestaña **Productos** (listado, alta, edición de precio/stock, activar/desactivar)
- [ ] 🤖 Filtro por proveedor + columna de proveedor en el listado
- [ ] 🤖 Vista **"Proveedores"** (nº productos, valor stock, plazo) → sus productos
- [ ] 🤖 Ficha de producto admin: proveedor, referencia, coste, margen, enlace de reposición
- [ ] 🧑 Ejecutar SQL y probar

---

## FASE 3 — Stock automático con las ventas

- [ ] 🤖 Tabla `stock_movements` + RPC `descontar_stock_pedido` / `reponer_stock_pedido`
- [ ] 🤖 `stripe-webhook`: descuenta stock al confirmar el pago
- [ ] 🤖 Admin: reponer stock al cancelar/reembolsar
- [ ] 🤖 Tienda: "Agotado" si `stock ≤ 0`; aviso de stock bajo en el panel
- [ ] 🧑 Ejecutar SQL + re-desplegar `stripe-webhook` + probar compra

---

## FASE 4 — Informes

- [ ] 🤖 Ventas por día, más vendidos, margen (precio − coste)
- [ ] 🤖 Exportar a CSV

---

## FASE 5 — Compras a proveedor (descuentos + coste medio WAC)

- [ ] 🤖 Tablas `purchase_orders`, `purchase_order_items`, `supplier_discount_tiers`
- [ ] 🤖 RPC `recibir_pedido_compra`: descuento por umbral + portes + recálculo WAC + movimiento `reposicion`
- [ ] 🤖 Admin: crear/recibir pedidos de compra y ver coste medio
- [ ] 🧑 Cargar reglas de descuento de proveedores + probar recepción

---

## FASE 6 — Pedidos predictivos

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
- `supabase-schema.sql` · `supabase-admin.sql` · `supabase-pagos.sql` · `inventario-1.sql` — SQL a ejecutar en Supabase
