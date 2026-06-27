/* =========================================================
   El Kiosquillo — auth.js
   Capa de datos de cuenta, pedidos y seguimiento.

   ⚠️  IMPORTANTE — VERSIÓN DE PROTOTIPO
   Esta capa guarda los datos en el navegador (localStorage) para que
   el flujo completo (registro, acceso, perfil, pedidos, seguimiento)
   funcione sin servidor en GitHub Pages.

   NO es segura para datos reales de clientes: las contraseñas viven en
   el propio navegador y los datos no se comparten entre dispositivos.
   Para producción se debe sustituir el objeto `Backend` de abajo por
   llamadas a un backend real (p. ej. Supabase) sin tocar el resto de
   las páginas: la API pública (`Auth`) se mantiene igual.
   ========================================================= */

(function (global) {
  'use strict';

  /* ---- claves de almacenamiento ---- */
  const K_USERS   = 'kq_users';
  const K_SESSION = 'kq_session';
  const K_ORDERS  = 'kq_orders';
  const K_COUNTER = 'kq_order_counter';

  /* ---- utilidades ---- */
  const read  = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
  const write = (k, v)   => localStorage.setItem(k, JSON.stringify(v));
  const uid   = ()       => 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* Hash no criptográfico: sólo evita guardar la contraseña en claro en
     este prototipo. En producción el hash lo hace el backend. */
  function weakHash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return 'h' + h.toString(36);
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---- estados de pedido y su orden lógico ---- */
  const ORDER_FLOW = ['confirmado', 'preparando', 'enviado', 'entregado'];
  const ESTADOS = {
    pendiente:  { label: 'Pendiente de pago', tono: 'gris' },
    confirmado: { label: 'Confirmado',        tono: 'azul' },
    preparando: { label: 'En preparación',    tono: 'naranja' },
    enviado:    { label: 'Enviado',           tono: 'morado' },
    entregado:  { label: 'Entregado',         tono: 'verde' },
    cancelado:  { label: 'Cancelado',         tono: 'rojo' },
  };

  /* =========================================================
     Backend de prototipo (localStorage).
     Sustituir esta sección por el backend real en producción.
     ========================================================= */
  const Backend = {
    users()        { return read(K_USERS, []); },
    saveUsers(u)   { write(K_USERS, u); },
    orders()       { return read(K_ORDERS, []); },
    saveOrders(o)  { write(K_ORDERS, o); },

    nextOrderNumber() {
      const n = (read(K_COUNTER, 0) | 0) + 1;
      write(K_COUNTER, n);
      const year = new Date().getFullYear();
      return `KQ-${year}-${String(n).padStart(5, '0')}`;
    },
  };

  /* =========================================================
     API pública: Auth
     ========================================================= */
  const Auth = {
    estados: ESTADOS,
    orderFlow: ORDER_FLOW,

    /* ---------- sesión ---------- */
    getCurrentUser() {
      const s = read(K_SESSION, null);
      if (!s) return null;
      const u = Backend.users().find(x => x.id === s.userId);
      if (!u) return null;
      const { passwordHash, ...safe } = u;   // nunca exponer el hash
      return safe;
    },

    isLoggedIn() { return !!this.getCurrentUser(); },

    /* Redirige a login si no hay sesión. Devuelve el usuario si la hay. */
    requireAuth(redirectTo) {
      const u = this.getCurrentUser();
      if (!u) {
        const back = encodeURIComponent(location.pathname.split('/').pop() + location.search);
        location.href = `login.html?returnTo=${redirectTo ? encodeURIComponent(redirectTo) : back}`;
        return null;
      }
      return u;
    },

    /* ---------- alta ---------- */
    register({ nombre, email, password, marketing }) {
      nombre = (nombre || '').trim();
      email  = (email  || '').trim().toLowerCase();

      if (nombre.length < 2)        return { ok: false, error: 'Indica tu nombre.' };
      if (!EMAIL_RE.test(email))    return { ok: false, error: 'El correo no es válido.' };
      if (!password || password.length < 6) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };

      const users = Backend.users();
      if (users.some(u => u.email === email))
        return { ok: false, error: 'Ya existe una cuenta con ese correo.' };

      const user = {
        id: uid(),
        nombre,
        email,
        passwordHash: weakHash(password),
        telefono: '',
        direccion: { linea1: '', linea2: '', ciudad: '', cp: '', provincia: '' },
        marketing: !!marketing,
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      Backend.saveUsers(users);
      write(K_SESSION, { userId: user.id, since: Date.now() });
      const { passwordHash, ...safe } = user;
      return { ok: true, user: safe };
    },

    /* ---------- acceso ---------- */
    login({ email, password }) {
      email = (email || '').trim().toLowerCase();
      const user = Backend.users().find(u => u.email === email);
      if (!user || user.passwordHash !== weakHash(password || ''))
        return { ok: false, error: 'Correo o contraseña incorrectos.' };
      write(K_SESSION, { userId: user.id, since: Date.now() });
      const { passwordHash, ...safe } = user;
      return { ok: true, user: safe };
    },

    logout() { localStorage.removeItem(K_SESSION); },

    /* ---------- perfil ---------- */
    updateProfile(data) {
      const s = read(K_SESSION, null);
      if (!s) return { ok: false, error: 'Sesión no iniciada.' };
      const users = Backend.users();
      const i = users.findIndex(u => u.id === s.userId);
      if (i < 0) return { ok: false, error: 'Usuario no encontrado.' };

      const allowed = ['nombre', 'telefono', 'direccion', 'marketing'];
      allowed.forEach(k => { if (k in data) users[i][k] = data[k]; });
      Backend.saveUsers(users);
      const { passwordHash, ...safe } = users[i];
      return { ok: true, user: safe };
    },

    changePassword(actual, nueva) {
      const s = read(K_SESSION, null);
      if (!s) return { ok: false, error: 'Sesión no iniciada.' };
      const users = Backend.users();
      const i = users.findIndex(u => u.id === s.userId);
      if (i < 0) return { ok: false, error: 'Usuario no encontrado.' };
      if (users[i].passwordHash !== weakHash(actual || ''))
        return { ok: false, error: 'La contraseña actual no es correcta.' };
      if (!nueva || nueva.length < 6)
        return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
      users[i].passwordHash = weakHash(nueva);
      Backend.saveUsers(users);
      return { ok: true };
    },

    /* ---------- derechos RGPD ---------- */

    /* Portabilidad: exporta todos los datos del usuario en JSON. */
    exportData() {
      const u = this.getCurrentUser();
      if (!u) return null;
      return {
        exportadoEl: new Date().toISOString(),
        perfil: u,
        pedidos: this.getOrders(),
      };
    },

    /* Supresión: anonimiza el perfil, conserva los pedidos de forma anónima
       (obligación fiscal de 5 años) y cierra la sesión. */
    deleteAccount() {
      const s = read(K_SESSION, null);
      if (!s) return { ok: false, error: 'Sesión no iniciada.' };
      const users = Backend.users();
      const i = users.findIndex(u => u.id === s.userId);
      if (i < 0) return { ok: false, error: 'Usuario no encontrado.' };

      // Anonimizar pedidos (no se borran por obligación legal).
      const orders = Backend.orders().map(o =>
        o.userId === s.userId ? { ...o, userId: 'anon', anonimizado: true } : o);
      Backend.saveOrders(orders);

      users.splice(i, 1);
      Backend.saveUsers(users);
      this.logout();
      return { ok: true };
    },

    /* ---------- pedidos ---------- */

    /* Crea un pedido a partir del carrito y devuelve su id. */
    createOrder({ items, direccion, subtotal, envio, total }) {
      const s = read(K_SESSION, null);
      if (!s) return { ok: false, error: 'Debes iniciar sesión para tramitar el pedido.' };
      if (!items || !items.length) return { ok: false, error: 'El carrito está vacío.' };

      const now = new Date().toISOString();
      const order = {
        id: 'o_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        numero: Backend.nextOrderNumber(),
        userId: s.userId,
        estado: 'confirmado',
        items,
        subtotal, envio, total,
        direccion,
        createdAt: now,
        updatedAt: now,
        tracking: [
          { estado: 'confirmado', descripcion: 'Hemos recibido tu pedido y confirmado el pago.', fecha: now, actor: 'sistema' },
        ],
      };
      const orders = Backend.orders();
      orders.push(order);
      Backend.saveOrders(orders);
      return { ok: true, id: order.id, numero: order.numero };
    },

    /* Pedidos del usuario actual, más recientes primero. */
    getOrders() {
      const s = read(K_SESSION, null);
      if (!s) return [];
      return Backend.orders()
        .filter(o => o.userId === s.userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    getOrder(id) {
      const s = read(K_SESSION, null);
      if (!s) return null;
      return Backend.orders().find(o => o.id === id && o.userId === s.userId) || null;
    },

    /* Devuelve los pasos del seguimiento marcando los ya alcanzados.
       Útil para pintar una línea de tiempo aunque el pedido sea reciente. */
    getTrackingSteps(order) {
      if (!order) return [];
      if (order.estado === 'cancelado') {
        return [{ estado: 'cancelado', label: ESTADOS.cancelado.label, alcanzado: true, actual: true }];
      }
      const idx = ORDER_FLOW.indexOf(order.estado);
      return ORDER_FLOW.map((est, i) => ({
        estado: est,
        label: ESTADOS[est].label,
        alcanzado: i <= idx,
        actual: i === idx,
      }));
    },
  };

  global.Auth = Auth;
})(window);
