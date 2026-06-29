# El Kiosquillo · chuchebarata.com

Tienda online de chucherías. Sitio estático (HTML/CSS/JS) servido por
**GitHub Pages**, con backend en **Supabase** (autenticación, base de
datos, funciones) y pagos con **Stripe Checkout**.

🔗 Web: https://afranco13.github.io/chuchebarata.github.io/

## Estructura del repositorio

```
.
├── *.html                 Páginas del sitio (servidas por GitHub Pages)
├── app.js                 Portada / catálogo
├── producto.js            Ficha de producto
├── caja.js                Montar caja de chuches
├── carrito.js, checkout.js, pedido.js   Carrito y proceso de compra
├── auth.js                Cliente de Supabase + capa de datos (window.Auth)
├── perfil.js, sesion.js   Cuenta de usuario y sesión
├── admin.js               Panel de administración
├── cookies-consent.js     Banner de cookies (RGPD)
├── productos_data.js      Catálogo estático (respaldo si la BD no responde)
├── supabase-config.js     URL y claves públicas de Supabase/Stripe
├── styles.css, producto.css, cuenta.css   Estilos
├── images/                Imágenes (productos, etc.)
│
├── db/                    Scripts SQL para Supabase (ver db/README.md)
├── supabase/functions/    Edge Functions (Stripe): crear-sesion-pago, stripe-webhook
└── docs/                  Documentación del proyecto
```

## Documentación

- [`docs/PLAN.md`](docs/PLAN.md) — plan de implementación por fases (estado actual)
- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — visión global del e-commerce
- [`docs/INVENTARIO.md`](docs/INVENTARIO.md) — inventario, proveedores, compras y coste medio (WAC)
- [`docs/PAGOS-STRIPE.md`](docs/PAGOS-STRIPE.md) — configuración de la pasarela de pago
- [`db/README.md`](db/README.md) — scripts SQL y orden de ejecución

## Desarrollo

Es un sitio estático: basta servir la carpeta raíz para verlo en local, p. ej.

```sh
python3 -m http.server 8000
```

Las claves **públicas** (Supabase anon, Stripe publishable) viven en
`supabase-config.js`. Las claves **secretas** (Stripe `sk_…`, webhook
`whsec_…`) NUNCA van en el repositorio: se configuran como *secrets* de
las Edge Functions en Supabase.
