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

    /* Política de contraseña (segura pero no excesivamente estricta):
       mínimo 8 caracteres, con al menos una letra y un número. Se usa en
       el alta, el cambio de contraseña y el restablecimiento. */
    validarPassword(password) {
      password = password || '';
      if (password.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return { ok: false, error: 'La contraseña debe incluir letras y números.' };
      }
      return { ok: true };
    },

    /* ---------- alta ---------- */
    async register({ nombre, email, password, marketing }) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      nombre = (nombre || '').trim();
      email = (email || '').trim().toLowerCase();
      if (nombre.length < 2)     return { ok: false, error: 'Indica tu nombre.' };
      if (!EMAIL_RE.test(email))  return { ok: false, error: 'El correo no es válido.' };
      const val = this.validarPassword(password);
      if (!val.ok) return val;

      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { nombre, marketing: !!marketing } },
      });
      if (error) return { ok: false, error: traducir(error) };
      // Correo ya registrado: con la confirmación de correo activada,
      // Supabase NO devuelve error (para no revelar qué correos existen),
      // sino un usuario "vacío" con identities: []. Lo detectamos para
      // invitar a iniciar sesión, en vez de mostrar un falso "cuenta creada".
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
      }
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
      const val = this.validarPassword(nueva);
      if (!val.ok) return val;
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
      const val = this.validarPassword(nueva);
      if (!val.ok) return { ok: false, error: val.error };
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
        .from('catalogo_publico')
        .select('id, nombre, categoria, cat_label, slug, img, precio, precio_comp, stock');
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
      const { data } = await sb.from('catalogo_publico')
        .select('id, nombre, categoria, cat_label, slug, img, precio, precio_comp, stock')
        .eq('id', id).maybeSingle();
      if (!data) return null;
      return {
        id: data.id, nombre: data.nombre, cat: data.categoria, cat_label: data.cat_label,
        slug: data.slug, img: data.img, price: Number(data.precio) || 0,
        precio_comp: data.precio_comp != null ? Number(data.precio_comp) : null,
        stock: data.stock, en_stock: (data.stock | 0) > 0,
      };
    },

    /* Fusiona el catálogo en vivo de la BD (qué productos existen + precio
       y stock) con el contenido estático (descripciones, iconos…) por id.
       - La EXISTENCIA la manda la BD: altas aparecen, bajas/desactivados
         desaparecen.
       - El CONTENIDO se toma del catálogo estático cuando existe.
       Si la BD no responde o está vacía, devuelve el estático tal cual
       (respaldo seguro). `estaticos` es PRODUCTS o PRODUCTOS_DATA. */
    fusionarCatalogo(live, estaticos) {
      const base = Array.isArray(estaticos) ? estaticos : [];
      if (!live || !live.length) return base.slice();
      const byId = {}; base.forEach(p => { byId[p.id] = p; });
      const ART_CAT = { gominolas:'bear', nubes:'nube', caramelos:'wrapped', chocolate:'choc',
        regaliz:'licorice', chicles:'gum', conos:'gift', decoracion:'balloon' };
      return live.map(lp => {
        const b = byId[lp.id] || {};
        const m = Object.assign({}, b);
        m.id = lp.id;
        m.nombre = lp.nombre || b.nombre || b.name || '';
        m.name = m.nombre;
        m.cat = lp.cat || b.cat || '';
        m.cat_label = lp.cat_label || b.cat_label || '';
        m.slug = lp.slug || b.slug || '';
        m.img = lp.img || b.img || '';
        m.art = b.art || ART_CAT[m.cat] || 'bear';
        m.price = lp.price;
        m.precio_comp = (lp.precio_comp != null) ? lp.precio_comp : b.precio_comp;
        m.meta = b.meta || m.cat_label || '';
        m.en_stock = lp.en_stock;
        m.stock = lp.stock;
        return m;
      });
    },

    /* Superpone precio/stock en vivo (de la BD) sobre los catálogos en
       memoria (PRODUCTS / PRODUCTOS_DATA). Devuelve true si aplicó datos.
       Si la BD no responde o está vacía, no toca nada (respaldo seguro). */
    async aplicarInventario(...arrays) {
      const live = await this.getProductos();
      if (!live.length) return false;
      const map = {};
      live.forEach(p => { map[p.id] = p; });
      arrays.forEach(arr => {
        if (!Array.isArray(arr)) return;
        arr.forEach(item => {
          const u = map[item.id];
          if (!u) return;
          item.price = u.price;
          item.stock = u.stock;
          item.en_stock = u.en_stock;
          if (u.precio_comp != null) item.precio_comp = u.precio_comp;
        });
      });
      return true;
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

    /* ---------- analítica (embudo de compra) ---------- */
    /* Registra un evento de negocio (añadir al carrito, clic en "Tramitar
       pedido", pedido creado, etc.). Nunca lanza: un fallo aquí no debe
       romper la compra (lo llama analytics.js con .catch() de todas
       formas, pero se protege también aquí). */
    async trackEvent(tipo, datos, sessionId) {
      if (!sb) return;
      try {
        const { data } = await sb.auth.getUser().catch(() => ({ data: {} }));
        await sb.from('eventos_analitica').insert({
          tipo, datos: datos || {}, session_id: sessionId,
          user_id: (data && data.user) ? data.user.id : null,
        });
      } catch (e) {}
    },

    /* ---------- informes (admin) ---------- */
    /* Resumen del periodo: {pedidos, unidades, ingresos, coste, margen}. */
    async getInformeResumen(desde, hasta) {
      if (!sb) return null;
      const { data, error } = await sb.rpc('informe_resumen', { p_desde: desde, p_hasta: hasta });
      if (error || !data || !data.length) return null;
      return data[0];
    },
    /* Ventas por día: [{dia, pedidos, unidades, ingresos, margen}]. */
    async getInformeDiario(desde, hasta) {
      if (!sb) return [];
      const { data, error } = await sb.rpc('informe_ventas_diarias', { p_desde: desde, p_hasta: hasta });
      if (error || !data) return [];
      return data;
    },
    /* Más vendidos: [{product_id, nombre, unidades, ingresos, margen}]. */
    async getInformeTop(desde, hasta, limite) {
      if (!sb) return [];
      const { data, error } = await sb.rpc('informe_mas_vendidos', { p_desde: desde, p_hasta: hasta, p_limite: limite || 20 });
      if (error || !data) return [];
      return data;
    },
    /* Embudo de compra: [{tipo, sesiones, eventos}]. */
    async getInformeEmbudo(desde, hasta) {
      if (!sb) return [];
      const { data, error } = await sb.rpc('informe_embudo', { p_desde: desde, p_hasta: hasta });
      if (error || !data) return [];
      return data;
    },
    /* Sesiones con clic en "Tramitar pedido" que nunca crearon un pedido. */
    async getInformeCheckoutAbandonado(desde, hasta) {
      if (!sb) return null;
      const { data, error } = await sb.rpc('informe_checkout_abandonado', { p_desde: desde, p_hasta: hasta });
      if (error || !data || !data.length) return null;
      return data[0];
    },
    /* Sesiones con carrito que nunca llegaron a pulsar "Tramitar pedido". */
    async getInformeCarritosSinCheckout(desde, hasta) {
      if (!sb) return null;
      const { data, error } = await sb.rpc('informe_carritos_sin_checkout', { p_desde: desde, p_hasta: hasta });
      if (error || !data || !data.length) return null;
      return data[0];
    },
    /* Valor medio del carrito al ver el checkout frente al pedido creado. */
    async getInformeValorCarrito(desde, hasta) {
      if (!sb) return null;
      const { data, error } = await sb.rpc('informe_valor_carrito', { p_desde: desde, p_hasta: hasta });
      if (error || !data || !data.length) return null;
      return data[0];
    },
    /* De los pagos cancelados, cuántos se recuperaron (pagaron después). */
    async getInformeRecuperacionPago(desde, hasta) {
      if (!sb) return null;
      const { data, error } = await sb.rpc('informe_recuperacion_pago', { p_desde: desde, p_hasta: hasta });
      if (error || !data || !data.length) return null;
      return data[0];
    },

    /* ---------- inventario (admin) ---------- */
    /* Todos los productos con coste, proveedor y margen (vista_inventario). */
    async getInventario() {
      if (!sb) return [];
      const { data, error } = await sb.from('vista_inventario').select('*').order('nombre');
      if (error || !data) return [];
      return data;
    },

    async crearProducto(prod) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { data, error } = await sb.rpc('crear_producto', { p: prod });
      return error ? { ok: false, error: error.message } : { ok: true, id: data };
    },

    async actualizarProducto(id, cambios) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { error } = await sb.rpc('actualizar_producto', { p_id: id, p_cambios: cambios });
      return error ? { ok: false, error: error.message } : { ok: true };
    },

    async eliminarProducto(id) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { error } = await sb.rpc('eliminar_producto', { p_id: id });
      return error ? { ok: false, error: error.message } : { ok: true };
    },

    async ajustarStock(id, delta, motivo) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { error } = await sb.rpc('ajustar_stock', { p_id: id, p_delta: delta, p_motivo: motivo || 'ajuste' });
      return error ? { ok: false, error: error.message } : { ok: true };
    },

    /* ---------- compras a proveedor (admin) ---------- */
    /* Pedidos de compra con proveedor y nº de líneas (vista_compras). */
    async getCompras() {
      if (!sb) return [];
      const { data, error } = await sb.from('vista_compras').select('*').order('created_at', { ascending: false });
      if (error || !data) return [];
      return data;
    },
    /* Un pedido de compra con sus líneas (incluye nombre de producto). */
    async getCompra(id) {
      if (!sb || !id) return null;
      const { data, error } = await sb
        .from('purchase_orders')
        .select('*, purchase_order_items(*, products(nombre, precio_coste))')
        .eq('id', id).maybeSingle();
      if (error || !data) return null;
      return data;
    },
    /* Crea un pedido de compra (borrador). items: [{product_id, cantidad, coste_bruto}]. */
    async crearCompra(proveedorId, items, portes, nota) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { data, error } = await sb.rpc('crear_pedido_compra', {
        p_proveedor_id: proveedorId, p_items: items, p_portes: portes || 0, p_nota: nota || null,
      });
      if (error) return { ok: false, error: error.message };
      const row = Array.isArray(data) ? data[0] : data;
      return { ok: true, id: row && row.id, numero: row && row.numero };
    },
    /* Recibe la mercancía: aplica descuento/portes y recalcula el WAC. */
    async recibirCompra(id) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { error } = await sb.rpc('recibir_pedido_compra', { p_po_id: id });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    /* Borra un pedido de compra en borrador. */
    async cancelarCompra(id) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { error } = await sb.rpc('cancelar_pedido_compra', { p_po_id: id });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    /* Tramos de descuento de un proveedor (o todos si no se indica). */
    async getTramos(proveedorId) {
      if (!sb) return [];
      let q = sb.from('supplier_discount_tiers').select('*').order('umbral_eur');
      if (proveedorId) q = q.eq('proveedor_id', proveedorId);
      const { data, error } = await q;
      if (error || !data) return [];
      return data;
    },
    async crearTramo(proveedorId, umbral, pct) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { error } = await sb.from('supplier_discount_tiers')
        .insert({ proveedor_id: proveedorId, umbral_eur: umbral, descuento_pct: pct });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    async eliminarTramo(id) {
      if (!sb) return { ok: false, error: 'Servicio no disponible.' };
      const { error } = await sb.from('supplier_discount_tiers').delete().eq('id', id);
      return error ? { ok: false, error: error.message } : { ok: true };
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
