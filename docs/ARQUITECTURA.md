# Arquitectura de El Kiosquillo

Mapa visual de la solución de e-commerce. Los diagramas se renderizan
automáticamente al ver este archivo en GitHub.

---

## 1. Componentes y cómo se conectan

```mermaid
flowchart TB
  subgraph NAV["🖥️ Navegador del cliente · GitHub Pages (estático)"]
    direction TB
    Tienda["Tienda<br/>index · producto · caja"]
    Cuenta["Cuenta<br/>registro · login · perfil · pedido"]
    Admin["Panel admin<br/>admin.html"]
    Carrito["Carrito<br/>sessionStorage 'kq_cart'"]
    AuthJS["auth.js<br/>cliente Supabase + API"]
    CheckoutPage["checkout.html<br/>dirección de envío + resumen"]
    CheckoutJS["checkout.js<br/>orquesta pedido y pago"]
  end

  subgraph SUPA["☁️ Supabase · backend en la UE"]
    direction TB
    AuthSB["Auth<br/>usuarios · sesiones · correos"]
    DB[("PostgreSQL<br/>profiles · orders · order_items · tracking<br/>RLS + funciones RPC")]
    EF1["Edge Function<br/>crear-sesion-pago"]
    EF2["Edge Function<br/>stripe-webhook"]
  end

  subgraph STRIPE["💳 Stripe"]
    Checkout["Checkout alojado<br/>tarjeta · Bizum · wallets"]
  end

  Tienda --> Carrito
  Cuenta --> AuthJS
  Admin --> AuthJS
  Carrito -->|"Tramitar pedido"| CheckoutPage
  CheckoutPage --> CheckoutJS
  CheckoutJS --> AuthJS
  AuthJS <-->|"login / perfil"| AuthSB
  AuthJS <-->|"pedidos / seguimiento"| DB
  CheckoutJS -->|"iniciar pago"| EF1
  EF1 -->|"lee importes reales"| DB
  EF1 -->|"crea sesión"| Checkout
  Checkout -. "webhook: pago confirmado" .-> EF2
  EF2 -->|"estado = confirmado"| DB
```

---

## 2. Flujo de compra y pago (paso a paso)

```mermaid
sequenceDiagram
  actor C as Cliente
  participant Web as Navegador
  participant SB as Supabase (BD)
  participant EF as Edge Functions
  participant ST as Stripe

  C->>Web: Añade productos y pulsa "Tramitar pedido"
  Web->>SB: ¿Hay sesión?
  alt Sin sesión
    Web-->>C: Redirige a login.html (returnTo=checkout.html)
  else Con sesión
    Web-->>C: Muestra checkout.html (resumen del pedido + dirección precargada)
    C->>Web: Revisa/edita la dirección y pulsa "Continuar"
    Web->>SB: Guarda la dirección en el perfil (no bloquea si falla)
    Web->>SB: crear_pedido (estado = pendiente)
    Web->>EF: crear-sesion-pago(orderId)
    EF->>SB: Lee los importes del pedido (fuente de verdad)
    EF->>ST: Crea la sesión de pago
    EF-->>Web: Devuelve la URL de pago
    Web->>ST: Redirige a la página de Stripe
    C->>ST: Paga (tarjeta / Bizum)
    alt Pago completado
      ST-->>Web: Vuelve a pedido.html (pago=ok) y vacía el carrito
      ST->>EF: webhook checkout.session.completed
      EF->>SB: estado = confirmado + evento de seguimiento
      Note over C,SB: El cliente ve "Confirmado" y su seguimiento
    else Pago cancelado
      ST-->>Web: Vuelve a checkout.html (pago=cancelado), pedido sigue pendiente
    end
  end
```

---

## 3. Modelo de datos (tablas y relaciones)

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "1 a 1"
  PROFILES ||--o{ ORDERS : "realiza"
  ORDERS ||--o{ ORDER_ITEMS : "contiene"
  ORDERS ||--o{ ORDER_TRACKING_EVENTS : "tiene"

  PROFILES {
    uuid id PK
    text nombre
    text telefono
    jsonb direccion
    bool marketing
    bool is_admin
  }
  ORDERS {
    uuid id PK
    text numero
    text estado
    numeric total
    jsonb direccion
  }
  ORDER_ITEMS {
    int product_id
    text nombre
    numeric precio
    int cantidad
  }
  ORDER_TRACKING_EVENTS {
    text estado
    text descripcion
    timestamptz created_at
  }
```

---

## 4. Estados de un pedido

```mermaid
flowchart LR
  P["Pendiente<br/>de pago"] -->|"pago OK (webhook)"| C["Confirmado"]
  C -->|"almacén"| PR["En preparación"]
  PR -->|"transportista"| E["Enviado"]
  E -->|"entrega"| EN["Entregado"]
  P -.->|"cancelación"| X["Cancelado"]
  C -.-> X
```

> El cliente solo avanza hasta **Confirmado** (al pagar). De ahí en adelante,
> los estados los cambia el administrador desde `admin.html`, y cada cambio
> genera un evento que el cliente ve en el seguimiento de su pedido.

---

## 5. Seguridad en una mirada

```mermaid
flowchart TB
  subgraph Publico["Lo que ve el navegador (público, seguro)"]
    PK["Clave publicable de Supabase y Stripe"]
  end
  subgraph Servidor["Solo en el servidor (secreto)"]
    SK["STRIPE_SECRET_KEY<br/>STRIPE_WEBHOOK_SECRET<br/>service_role"]
  end
  RLS["RLS: cada usuario solo accede a SUS datos"]
  Firma["Webhook firmado: solo Stripe confirma pagos"]
  Val["Edge Functions validan importe y dirección"]

  PK --> RLS
  SK --> Val
  SK --> Firma
```
