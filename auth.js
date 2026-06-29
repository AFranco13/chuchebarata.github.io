/* =========================================================
   El Kiosquillo — auth.js (backend real: Supabase)
   Capa de datos de cuenta, pedidos y seguimiento.

   Todos los métodos que tocan el servidor son ASÍNCRONOS (devuelven
   Promesas), por lo que en las páginas se usan con await.
   Requiere cargar antes: la librería @supabase/supabase-js y
   supabase-config.js (window.SUPABASE_CONFIG).
   ========================================================= */

(function (global) {
  'use strict';

  /* ---- inicialización del cliente ---- */
  let sb = null;
  const cfg = global.SUPABASE_CONFIG;
  if (global.supabase && cfg && cfg.url && cfg.anonKey) {
    sb = global.supabase.createClient(cfg.url, cfg.anonKey);
  } else {
    console.error('[auth] Supabase no está configurado. Revisa supabase-config.js y la librería @supabase/supabase-js.');
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

  /* Normaliza un pedido de la base de datos al formato que usan las páginas. */
  function normalizeOrder(o) {
    return {
      id: o.id,
      numero: o.numero,
      estado: o.estado,
      subtotal: Number(o.subtotal) || 0,
      envio: Number(o.envio) || 0,
      total: Number(o.total) || 0,
      direccion: o.direccion || {},
      createdAt: o.created_at,
      items: (o.order_items || []).map(i => ({
        id: i.product_id, nombre: i.nombre, precio: Number(i.precio) || 0,
        cantidad: i.cantidad, img: i.img, tint: i.tint,
      })),
      tracking: [],
    };
  }

  /* =========================================================
     API pública: Auth
     ========================================================= */
  const Auth = {
    estados: ESTADOS,
    orderFlow: ORDER_FLOW,
    get client() { return sb; },

    /* ---------- sesión ---------- */
    async getCurrentUser() {
      if (!sb) return null;
      const { data: { session } } = await sb.auth.getSession();
      const user = session && session.user;
      if (!user) return null;
      const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
      return {
        id: user.id,
        email: user.email,
        nombre: (profile && profile.nombre) || '',
        telefono: (profile && profile.telefono) || '',
        direccion: (profile && profile.direccion) || {},
        marketing: !!(profile && profile.marketing),
        isAdmin: !!(profile && profile.is_admin),
      };
    },

    async isLoggedIn() {
      if (!sb) return false;
      const { data: { session } } = await sb.auth.getSession();
      return !!session;
    },

    /* Redirige a login si no hay sesión. Devuelve el usuario si la hay. */
    async requireAuth(redirectTo) {
      const u = await this.getCurrentUser();
      if (!u) {
        const back = redirectTo
          ? encodeURIComponent(redirectTo)
          : encodeURIComponent(location.pathname.split('/').pop() + location.search);
        location.href = `login.html?returnTo=${back}`;
        return null;
      }
      return u;
    },

    /* ---------- alta ---------- */
    async register({ nombre, email, password, marketing }) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      nombre = (nombre || '').trim();
      email = (email || '').trim().toLowerCase();
      if (nombre.length < 2)     return { ok: false, error: 'Indica tu nombre.' };
      if (!EMAIL_RE.test(email))  return { ok: false, error: 'El correo no es válido.' };
      if (!password || password.length < 6) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };

      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { nombre, marketing: !!marketing } },
      });
      if (error) return { ok: false, error: traducir(error) };
      // Si el proyecto exige confirmar el correo, no habrá sesión todavía.
      return { ok: true, needsConfirm: !data.session };
    },

    /* ---------- acceso ---------- */
    async login({ email, password }) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { error } = await sb.auth.signInWithPassword({
        email: (email || '').trim().toLowerCase(),
        password: password || '',
      });
      if (error) return { ok: false, error: traducir(error) };
      return { ok: true };
    },

    async logout() { if (sb) await sb.auth.signOut(); },

    /* Envía el correo de restablecimiento de contraseña. */
    async resetPassword(email) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const redirectTo = location.origin + location.pathname.replace(/[^/]*$/, 'nueva-contrasena.html');
      const { error } = await sb.auth.resetPasswordForEmail((email || '').trim().toLowerCase(), { redirectTo });
      // No revelamos si el correo existe (buena práctica): devolvemos ok igualmente.
      return { ok: !error, error: error ? traducir(error) : null };
    },

    /* Fija una nueva contraseña (tras seguir el enlace del correo). */
    async setNewPassword(nueva) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      if (!nueva || nueva.length < 6) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
      const { error } = await sb.auth.updateUser({ password: nueva });
      return error ? { ok: false, error: traducir(error) } : { ok: true };
    },

    /* ---------- perfil ---------- */
    async updateProfile(data) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return { ok: false, error: 'Sesión no iniciada.' };
      const patch = {};
      ['nombre', 'telefono', 'direccion', 'marketing'].forEach(k => { if (k in data) patch[k] = data[k]; });
      const { error } = await sb.from('profiles').update(patch).eq('id', user.id);
      return error ? { ok: false, error: error.message } : { ok: true };
    },

    async changePassword(actual, nueva) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      if (!nueva || nueva.length < 6) return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return { ok: false, error: 'Sesión no iniciada.' };
      // Verifica la contraseña actual reautenticando.
      const { error: e1 } = await sb.auth.signInWithPassword({ email: user.email, password: actual || '' });
      if (e1) return { ok: false, error: 'La contraseña actual no es correcta.' };
      const { error: e2 } = await sb.auth.updateUser({ password: nueva });
      return e2 ? { ok: false, error: traducir(e2) } : { ok: true };
    },

    /* ---------- derechos RGPD ---------- */
    async exportData() {
      const perfil = await this.getCurrentUser();
      if (!perfil) return null;
      return { exportadoEl: new Date().toISOString(), perfil, pedidos: await this.getOrders() };
    },

    async deleteAccount() {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { error } = await sb.rpc('eliminar_mi_cuenta');
      if (error) return { ok: false, error: error.message };
      await sb.auth.signOut();
      return { ok: true };
    },

    /* ---------- pedidos ---------- */
    async createOrder({ items, direccion, subtotal, envio, total, estado }) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      if (!items || !items.length) return { ok: false, error: 'El carrito está vacío.' };
      const { data, error } = await sb.rpc('crear_pedido', {
        p_items: items, p_direccion: direccion,
        p_subtotal: subtotal, p_envio: envio, p_total: total,
        p_estado: estado || 'confirmado',
      });
      if (error) return { ok: false, error: error.message };
      const row = Array.isArray(data) ? data[0] : data;
      return { ok: true, id: row.id, numero: row.numero };
    },

    /* Crea una sesión de pago en Stripe (vía Edge Function) y devuelve la
       URL a la que redirigir al cliente para pagar. */
    async crearSesionPago(orderId) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      // Base = carpeta donde vive la web (soporta subcarpetas de GitHub Pages,
      // p. ej. /chuchebarata.github.io/). Termina en "/".
      const dir = location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1);
      const base = location.origin + dir;
      const { data, error } = await sb.functions.invoke('crear-sesion-pago', {
        body: { orderId, base },
      });
      if (error) return { ok: false, error: error.message };
      if (data && data.error) return { ok: false, error: data.error };
      if (!data || !data.url) return { ok: false, error: 'No se pudo iniciar el pago.' };
      return { ok: true, url: data.url };
    },

    async getOrders() {
      if (!sb) return [];
      const { data: { session } } = await sb.auth.getSession();
      const user = session && session.user;
      if (!user) return [];
      // Filtramos explícitamente por el usuario: un admin también tiene
      // pedidos propios y aquí solo deben verse los suyos.
      const { data, error } = await sb
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error || !data) return [];
      return data.map(normalizeOrder);
    },

    /* ---------- catálogo (inventario en BD) ---------- */
    /* Lee los productos activos desde Supabase. Devuelve [] si no se puede
       (el frontend usará entonces el respaldo de productos_data.js). */
    async getProductos() {
      if (!sb) return [];
      const { data, error } = await sb
        .from('products')
        .select('id, nombre, categoria, cat_label, slug, img, precio, precio_comp, stock, activo')
        .eq('activo', true);
      if (error || !data) return [];
      return data.map(p => ({
        id: p.id, nombre: p.nombre, cat: p.categoria, cat_label: p.cat_label,
        slug: p.slug, img: p.img, price: Number(p.precio) || 0,
        precio_comp: p.precio_comp != null ? Number(p.precio_comp) : null,
        stock: p.stock, en_stock: (p.stock | 0) > 0,
      }));
    },

    async getProducto(id) {
      if (!sb) return null;
      const { data } = await sb.from('products')
        .select('id, nombre, categoria, cat_label, slug, img, precio, precio_comp, stock, activo')
        .eq('id', id).maybeSingle();
      if (!data) return null;
      return {
        id: data.id, nombre: data.nombre, cat: data.categoria, cat_label: data.cat_label,
        slug: data.slug, img: data.img, price: Number(data.precio) || 0,
        precio_comp: data.precio_comp != null ? Number(data.precio_comp) : null,
        stock: data.stock, en_stock: (data.stock | 0) > 0,
      };
    },

    /* ---------- administración ---------- */
    /* Todos los pedidos (solo administradores; la RLS lo garantiza). */
    async getAllOrders() {
      if (!sb) return [];
      const { data, error } = await sb
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      if (error || !data) return [];
      return data.map(normalizeOrder);
    },

    /* Cambia el estado de un pedido y registra el evento de seguimiento. */
    async updateOrderStatus(orderId, estado, descripcion) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { error } = await sb.rpc('actualizar_estado_pedido', {
        p_order_id: orderId, p_estado: estado, p_descripcion: descripcion || null,
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    },

    async getOrder(id) {
      if (!sb || !id) return null;
      const { data, error } = await sb
        .from('orders')
        .select('*, order_items(*), order_tracking_events(*)')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) return null;
      const o = normalizeOrder(data);
      o.tracking = (data.order_tracking_events || [])
        .map(t => ({ estado: t.estado, descripcion: t.descripcion, fecha: t.created_at, actor: t.actor }))
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
      return o;
    },

    /* Pasos del seguimiento marcando los alcanzados (función pura). */
    getTrackingSteps(order) {
      if (!order) return [];
      if (order.estado === 'cancelado') {
        return [{ estado: 'cancelado', label: ESTADOS.cancelado.label, alcanzado: true, actual: true }];
      }
      const idx = ORDER_FLOW.indexOf(order.estado);
      return ORDER_FLOW.map((est, i) => ({
        estado: est, label: ESTADOS[est].label, alcanzado: i <= idx, actual: i === idx,
      }));
    },
  };

  /* Traduce algunos errores frecuentes de Supabase al español. */
  function traducir(error) {
    const m = (error && error.message) || '';
    if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
    if (/already registered|already been registered|User already/i.test(m)) return 'Ya existe una cuenta con ese correo.';
    if (/Email not confirmed/i.test(m)) return 'Debes confirmar tu correo antes de acceder. Revisa tu bandeja de entrada.';
    if (/Password should be at least/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
    if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Inténtalo de nuevo en unos minutos.';
    return m || 'Ha ocurrido un error. Inténtalo de nuevo.';
  }

  global.Auth = Auth;
})(window);
