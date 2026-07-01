# Plan de negocio · El Kiosquillo (chuchebarata.com)

> Punto de partida: pre-lanzamiento, capital inicial 1.000–5.000 €, proyecto
> secundario (dedicación a tiempo parcial), canales previstos: redes sociales
> orgánicas + publicidad de pago + boca a boca/local.

---

## 1. Modelo de negocio

**Tipo:** e-commerce D2C (venta directa online) de chucherías a granel y por
unidad, con un único proveedor mayorista.

**Mecánica económica ("stacking de margen + volumen"):**

1. Se compra a **Lekkerland** a precio de mayorista (con posibilidad de
   descuento por volumen — ya construido en el panel: `supplier_discount_tiers`,
   Fase 5 del roadmap técnico).
2. Se revende en 3 formatos con márgenes distintos:
   - **Bolsas de 1 kg / multiunidad** (grueso del catálogo): margen ~27-40%.
     Volumen, no margen.
   - **Unidad suelta** (piruletas, chocolatinas): margen ~40-76%. Compra de
     impulso, ticket bajo.
   - **Packs de evento "Mesa Dulce"**: margen ~30-32% pero ticket alto
     (50-56 €) → un solo pedido ya casi cubre el umbral de envío gratis y
     aporta el margen absoluto más alto por pedido.
3. El envío gratis a partir de 49 € empuja al cliente a añadir más productos
   al carrito (barra de progreso "te faltan X € para envío gratis", ya
   implementada).

**Ingresos:** una única fuente — venta de producto. No hay suscripción ni
servicios adicionales (aún).

**Fuentes de coste:** producto (proveedor único), envío al cliente, comisión
de Stripe, embalaje, marketing, y (aún no aplica) cuota de Supabase si se
supera el nivel gratuito.

**Riesgo estructural a vigilar:** dependencia de un único proveedor
(Lekkerland) — sin poder de negociación de descuentos hasta alcanzar volumen;
y margen fino en el producto que más se vende (bolsas 1 kg), lo que exige
mucho control sobre coste de envío y coste de adquisición de cliente (CAC).

### Datos reales del catálogo (base de este análisis)

- 32 productos activos (marcas Fini, Burmar, Damel, Nestlé… todas compradas a
  un único proveedor: Lekkerland).
- Precio de venta: de 0,25 € (unidad suelta) a 55,79 € (packs "Mesa Dulce").
  Grueso del catálogo entre 5,99–12,59 € (bolsas de 1 kg).
- Margen bruto medio **~35-40%** (calculado sobre precio con IVA incluido,
  ver advertencia en la sección 3).
- Envío gratis a partir de 49 €; si no, 2,95 € de gastos de envío.
- Precios mostrados **con IVA incluido** (ver `terminos.html`).

⚠️ **Antes de publicar:** la portada afirma "4,8/5 · 5.000+ pedidos
servidos" — es contenido de relleno (placeholder), no una cifra real. Hay
que quitarlo o sustituirlo por algo verídico antes de abrir al público:
afirmar un historial de ventas falso es publicidad engañosa (Ley General de
Publicidad / competencia desleal).

---

## 2. Cliente objetivo (segmentos, por prioridad)

| # | Segmento | Por qué encaja | Ticket típico |
|---|---|---|---|
| 1 | **Familias con niños** (compra recurrente) | Compra de reposición para casa: 1-2 bolsas de 1kg + algún capricho suelto | 15-35 € |
| 2 | **Organizadores de fiestas/eventos** (comuniones, cumpleaños, baby showers) | Packs "Mesa Dulce" ya montados, ticket alto, decisión de compra por conveniencia no por precio | 50-90 € |
| 3 | **Compra de impulso / regalo pequeño** | Unidades sueltas, sin mínimo de pedido, margen alto | 5-15 € |
| 4 | **Con restricciones alimentarias** (transversal a los anteriores) | Filtro de alérgenos ya en la ficha de producto — nicho defendible, poca competencia lo hace bien | variable |

Con redes orgánicas + boca a boca + algo de pago, y siendo proyecto
secundario, la prioridad recomendada es:

- **Empezar por el segmento 2 (eventos):** mejor relación esfuerzo/ingreso
  por pedido (ticket alto, casi siempre supera el envío gratis, decisión de
  compra menos sensible al precio) — ideal para validar con poco tráfico.
- **Apoyarse en el boca a boca/local** para los primeros pedidos reales
  (grupos de WhatsApp, colegios, conocidos con eventos) antes de invertir en
  publicidad de pago.
- **Redes orgánicas** para contenido evergreen (packs de fiesta, ideas para
  cumpleaños) que alimenten después la publicidad de pago con público ya
  "caliente" (retargeting), en lugar de pagar tráfico frío desde el día 1.

---

## 3. Objetivos de rentabilidad

*(Año 1, proyecto secundario, 1.000-5.000 € de capital)*

**Supuestos que hay que validar con datos reales antes de tomarlos como
definitivos** (⚠️ no están en el código, son estimaciones de mercado):

- ⚠️ Coste de envío real al cliente (Correos/GLS/similar) para un paquete de
  1-3 kg en España: se asume 3,50-4,90 €/envío.
- ⚠️ Comisión Stripe (tarjeta UE): ~1,5% + 0,25 € por operación.
- ⚠️ Coste de embalaje: ~0,50-1,50 €/pedido.
- ⚠️ IVA aplicable a chucherías en España: previsiblemente **21% (tipo
  general)**, no el reducido de alimentación básica — a confirmar con
  gestoría, porque cambia el margen neto real de forma importante frente al
  ~35-40% bruto calculado sobre precio con IVA incluido.
- ⚠️ CAC (coste de adquisición por cliente) en redes de pago para un ticket
  medio de 25-40 €: sin campañas activas aún, se estima de forma
  conservadora 5-12 €/pedido en los primeros meses.

### Objetivo Año 1 (realista para "proyecto secundario")

- **Facturación:** 15.000–30.000 € (≈ 1-2 pedidos/día de media, ticket medio
  30-40 €).
- **Margen bruto:** 35-38% sobre venta (antes de envío, Stripe, marketing,
  embalaje).
- **Margen neto objetivo:** 8-12% el primer año — normal reinvertir buena
  parte en stock y en probar canales de captación; no forzar rentabilidad
  alta desde el mes 1.
- **Punto de equilibrio por pedido:** con ticket medio ~35 €, margen bruto
  ~37%, menos envío/Stripe/embalaje (~6-8 € de coste variable si no llega a
  los 49 €), el margen de contribución por pedido ronda 4-7 €. Con
  1.000-5.000 € de capital, esto da margen para 3-6 meses de rodaje sin
  necesidad de rentabilidad inmediata.

### Objetivo Año 2 (una vez con historial de ventas real)

- **Margen neto:** 15-20%, apoyado en:
  1. Activar los tramos de descuento por volumen con Lekkerland (ya
     construido en el panel de Compras).
  2. Mayor peso de packs de evento (mejor ticket, mejor uso del envío
     gratis).
  3. Menor CAC gracias a repetición de compra y retargeting sobre audiencia
     orgánica ya construida en el año 1.

**Antes de fijar cualquier cifra como compromiso**, se recomienda un primer
sprint de validación con datos reales de 4-8 semanas: coste de envío real
cotizado con transportista, tarifa real de Stripe de la cuenta, y CAC real
de una primera campaña pequeña — con eso se puede ajustar la tabla anterior
con precisión.

---

## 4. Próximos pasos de negocio (antes de abrir al público)

1. Quitar/corregir el "5.000+ pedidos servidos" de la portada (dato falso,
   riesgo legal de publicidad engañosa).
2. Confirmar con gestoría el tipo de IVA real aplicable a chucherías (afecta
   directamente al margen neto real, no solo al bruto).
3. Cotizar coste de envío real con 1-2 transportistas (Correos Express, GLS,
   Seur) para paquetes de 1-3 kg.
4. Decidir el primer canal a testear con presupuesto reducido: recomendado
   empezar por contenido orgánico + boca a boca (coste ≈0) durante 4-6
   semanas, y solo entonces destinar una parte pequeña del capital a
   publicidad de pago con datos reales de conversión.
5. Cargar los tramos de descuento reales de Lekkerland en el panel de
   Compras (ya construido) para que el margen del año 2 sea alcanzable.
