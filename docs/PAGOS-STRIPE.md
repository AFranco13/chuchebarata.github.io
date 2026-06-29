# Activar los pagos con Stripe

Guía para poner en marcha el cobro real. El código ya está listo; aquí solo
configuras Stripe y Supabase. Mientras no termines, deja `paymentsEnabled: false`
en `supabase-config.js` (el pedido se crea sin cobro, modo pruebas).

> ⚠️ La clave **secreta** de Stripe (`sk_test_…`) y el **webhook secret**
> (`whsec_…`) NO van en el código ni en este repositorio. Se guardan como
> *secretos* en Supabase. La única clave de Stripe que va en el navegador es la
> **publicable** (`pk_test_…`), que ya está en `supabase-config.js`.

---

## 1. Base de datos

En Supabase → **SQL Editor**, ejecuta el archivo **`db/supabase-pagos.sql`**
(permite crear el pedido como "pendiente" mientras se paga).

## 2. Instalar la CLI de Supabase (en tu ordenador)

```bash
npm install -g supabase
supabase login
supabase link --project-ref kfoawabtfzjeikcpdnjf
```

## 3. Desplegar las dos Edge Functions

Las funciones están en `supabase/functions/`.

```bash
# Crea la sesión de pago (requiere usuario autenticado)
supabase functions deploy crear-sesion-pago

# Recibe los avisos de Stripe (NO debe pedir JWT: lo valida la firma de Stripe)
supabase functions deploy stripe-webhook --no-verify-jwt
```

## 4. Configurar los secretos

Obtén tu **clave secreta** en Stripe → Developers → API keys (`sk_test_…`).

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_TU_CLAVE_SECRETA
```

(`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya están
disponibles automáticamente en las funciones; no hace falta añadirlas.)

## 5. Crear el webhook en Stripe

1. Stripe → **Developers → Webhooks → Add endpoint**.
2. **Endpoint URL**:
   `https://kfoawabtfzjeikcpdnjf.supabase.co/functions/v1/stripe-webhook`
3. **Eventos a escuchar**: marca estos tres (los dos últimos cubren Bizum/SEPA):
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
4. Guarda y copia el **Signing secret** (`whsec_…`). Luego:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_TU_SIGNING_SECRET
```

> Tras añadir/cambiar secretos, vuelve a desplegar las funciones para que los
> tomen: repite el paso 3.

## 6. (Opcional) Activar Bizum / Apple Pay / Google Pay

En Stripe → **Settings → Payment methods**, activa **Bizum** (requiere tu DNI/NIE)
y los wallets. No hay que tocar código: aparecerán solos en la página de pago.

## 7. Encender los pagos en la web

En **`supabase-config.js`** cambia:

```js
paymentsEnabled: true,
```

…haz commit y sube. A partir de ahí, "Tramitar pedido" llevará a la página de
pago de Stripe.

## 8. Probar (modo test)

- Usa una tarjeta de prueba de Stripe: **4242 4242 4242 4242**, fecha futura,
  CVC cualquiera.
- Tras pagar, deberías volver a `pedido.html?...&pago=ok` con el aviso verde y,
  en unos segundos, el pedido en estado **Confirmado** (lo hace el webhook).
- Si cancelas, vuelves a la portada con un aviso y el pedido queda **Pendiente**.

## Cómo funciona (resumen)

1. El cliente pulsa *Tramitar pedido* → se crea el pedido como **pendiente**.
2. La función `crear-sesion-pago` crea la sesión de Stripe con los importes
   **leídos de la base de datos** (no del navegador) y devuelve la URL de pago.
3. El cliente paga en la página segura de Stripe.
4. Stripe avisa a `stripe-webhook`, que verifica la firma y marca el pedido como
   **confirmado**, añadiendo el evento de seguimiento que ve el cliente.

## Antes de cobrar de verdad (paso a producción)

- Cambia las claves `pk_test_…`/`sk_test_…` por las **live** (`pk_live_…`/`sk_live_…`).
- Endurecimiento recomendado: validar los precios contra un catálogo guardado en
  la base de datos (hoy los importes provienen del pedido creado desde el
  navegador). Te lo puedo montar cuando quieras.
