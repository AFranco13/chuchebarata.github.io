/* =========================================================
   El Kiosquillo — checkout-page.js
   Página "Finalizar compra" (checkout.html): resumen del pedido +
   dirección de envío editable en la misma pantalla + paso de pago.
   Requiere: auth.js, productos_data.js, checkout.js.
   ========================================================= */

(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const eur = n => (Number(n) || 0).toFixed(2).replace('.', ',') + ' €';
  const FREE_SHIPPING = 49;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let modoInvitado = false;

  const TINTS = {
    gominolas:'var(--t-gominolas)', nubes:'var(--t-nubes)', caramelos:'var(--t-caramelos)',
    chocolate:'var(--t-chocolate)', regaliz:'var(--t-regaliz)', chicles:'var(--t-chicles)',
    conos:'var(--t-conos)', decoracion:'var(--t-decoracion)',
  };

  const ART = {
    bear:`<svg viewBox="0 0 80 80"><g fill="#C2375F"><circle cx="28" cy="20" r="7"/><circle cx="52" cy="20" r="7"/><circle cx="40" cy="29" r="13"/><rect x="24" y="38" width="32" height="30" rx="14"/><circle cx="20" cy="46" r="8"/><circle cx="60" cy="46" r="8"/><circle cx="28" cy="66" r="8"/><circle cx="52" cy="66" r="8"/></g><ellipse cx="40" cy="51" rx="9" ry="11" fill="#fff" opacity=".22"/><circle cx="35" cy="28" r="1.7" fill="#5E1030"/><circle cx="45" cy="28" r="1.7" fill="#5E1030"/><circle cx="33" cy="23" r="3" fill="#fff" opacity=".4"/></svg>`,
    lolly:`<svg viewBox="0 0 80 80"><rect x="38" y="38" width="4" height="36" rx="2" fill="#E2D2C6"/><circle cx="40" cy="30" r="22" fill="#D9B23E"/><circle cx="40" cy="30" r="16" fill="#C2375F"/><circle cx="40" cy="30" r="10" fill="#D9B23E"/><circle cx="40" cy="30" r="4" fill="#C2375F"/></svg>`,
    wrapped:`<svg viewBox="0 0 80 80"><path d="M22 40 8 31l4 9-4 9z" fill="#E89BB0"/><path d="M58 40l14-9-4 9 4 9z" fill="#E89BB0"/><ellipse cx="40" cy="40" rx="20" ry="16" fill="#C2375F"/></svg>`,
    choc:`<svg viewBox="0 0 80 80"><rect x="21" y="16" width="38" height="48" rx="5" fill="#4A2C1A"/><g fill="#6E4427"><rect x="25" y="20" width="13" height="18" rx="2"/><rect x="42" y="20" width="13" height="18" rx="2"/><rect x="25" y="42" width="13" height="18" rx="2"/><rect x="42" y="42" width="13" height="18" rx="2"/></g></svg>`,
    licorice:`<svg viewBox="0 0 80 80"><clipPath id="lc"><rect x="22" y="20" width="36" height="42" rx="7"/></clipPath><g clip-path="url(#lc)"><rect x="22" y="20" width="36" height="9" fill="#2A1A24"/><rect x="22" y="29" width="36" height="8" fill="#D9B23E"/><rect x="22" y="37" width="36" height="8" fill="#C2375F"/><rect x="22" y="45" width="36" height="8" fill="#F3E2DA"/><rect x="22" y="53" width="36" height="9" fill="#2A1A24"/></g></svg>`,
    gum:`<svg viewBox="0 0 80 80"><circle cx="30" cy="34" r="12" fill="#C2375F"/><circle cx="52" cy="30" r="11" fill="#6FA98E"/><circle cx="45" cy="50" r="13" fill="#D9B23E"/><circle cx="26" cy="54" r="10" fill="#7A4B8F"/><circle cx="58" cy="50" r="9" fill="#C07A2E"/></svg>`,
    gift:`<svg viewBox="0 0 80 80"><rect x="18" y="34" width="44" height="30" rx="4" fill="#6E1A3C"/><rect x="18" y="27" width="44" height="11" rx="3" fill="#8A2350"/><rect x="36" y="22" width="8" height="42" fill="#D9B23E"/><path d="M40 24c-7-9-18-2-0 0-18-2-7 9 0 0z" fill="#D9B23E"/></svg>`,
    cone:`<svg viewBox="0 0 80 80"><path d="M31 32h18l-7 38h-4z" fill="#EFE0D2"/><circle cx="34" cy="28" r="6" fill="#C2375F"/><circle cx="45" cy="26" r="6" fill="#6FA98E"/><circle cx="40" cy="31" r="6" fill="#D9B23E"/></svg>`,
    nube:`<svg viewBox="0 0 80 80"><rect x="20" y="36" width="40" height="24" rx="11" fill="#E089A5"/><rect x="24" y="22" width="32" height="22" rx="11" fill="#F6D6DF"/></svg>`,
  };

  let toastTimer;
  function showToast(msg) {
    const t = $('#toast');
    if (!t) return;
    $('#toastMsg').textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ── carrito ─────────────────────────────────────────────── */
  let cart = (() => { try { return JSON.parse(sessionStorage.getItem('kq_cart')) || {}; } catch { return {}; } })();

  function guardarCarrito() {
    try { sessionStorage.setItem('kq_cart', JSON.stringify(cart)); } catch {}
  }

  /* Fusiona el catálogo en vivo (precio/stock reales) sobre PRODUCTOS_DATA,
     igual que ya hacen app.js/caja.js/producto.js. Con respaldo silencioso
     si la BD no responde. */
  async function resolverCatalogo() {
    if (!window.Auth || typeof PRODUCTOS_DATA === 'undefined') return;
    try {
      const live = await Auth.getProductos();
      if (live && live.length) {
        const full = Auth.fusionarCatalogo(live, PRODUCTOS_DATA);
        PRODUCTOS_DATA.length = 0;
        full.forEach(x => PRODUCTOS_DATA.push(x));
      }
    } catch (e) {}
  }

  function resolverItem(id, cantidad) {
    if (typeof PRODUCTOS_DATA === 'undefined') return null;
    const p = PRODUCTOS_DATA.find(x => x.id == id);
    if (!p || p.en_stock === false) return null;
    return { id: +id, nombre: p.nombre || p.name, precio: p.price, cantidad, img: p.img || '', cat: p.cat, art: p.art };
  }

  function itemsActuales() {
    return Object.keys(cart).map(id => resolverItem(id, cart[id])).filter(Boolean);
  }

  /* ── resumen del pedido ──────────────────────────────────── */
  function pintarResumen() {
    const items = itemsActuales();
    const { subtotal, envio, total } = Checkout.calcularTotales(items);

    const html = items.map(p => {
      const bg = TINTS[p.cat] || 'var(--blush)';
      const thumb = p.img ? `<img src="${p.img}" alt="${p.nombre}">` : (ART[p.art] || '');
      return `<div class="ci">
        <span class="ci-art" style="background:${bg}">${thumb}</span>
        <div class="ci-info"><b>${p.nombre}</b><span>${eur(p.precio * p.cantidad)}</span></div>
        <div class="qty">
          <button data-q="-1" data-id="${p.id}" aria-label="Quitar uno">−</button>
          <span>${p.cantidad}</span>
          <button data-q="1" data-id="${p.id}" aria-label="Añadir uno">+</button>
        </div>
      </div>`;
    }).join('');

    $('#checkoutItems').innerHTML = html || '<p style="color:var(--muted)">Tu carrito está vacío.</p>';
    $('#checkoutTotal').textContent = eur(total);

    const left = FREE_SHIPPING - subtotal;
    $('#shipMsg').innerHTML = subtotal >= FREE_SHIPPING
      ? '✓ <strong>Envío gratis conseguido</strong>'
      : `Te faltan <strong>${eur(left)}</strong> para el envío gratis`;
    $('#shipFill').style.width = Math.min(100, subtotal / FREE_SHIPPING * 100) + '%';

    return items;
  }

  function mostrarVacio() {
    $('#checkoutGrid').hidden = true;
    $('#checkoutEmpty').hidden = false;
  }

  /* ── formulario de dirección ─────────────────────────────── */
  function precargarFormulario(user) {
    $('#co-nombre').value = user.nombre || '';
    $('#co-tel').value = user.telefono || '';
    const d = user.direccion || {};
    $('#co-linea1').value = d.linea1 || '';
    $('#co-linea2').value = d.linea2 || '';
    $('#co-cp').value = d.cp || '';
    $('#co-ciudad').value = d.ciudad || '';
    $('#co-provincia').value = d.provincia || '';
  }

  function flash(msg, ok, html) {
    const el = $('#checkoutMsg');
    if (html) el.innerHTML = msg; else el.textContent = msg;
    el.classList.remove('ok', 'error');
    el.classList.add(ok ? 'ok' : 'error', 'show');
  }

  function flashLogin(msg, ok) {
    const el = $('#loginMsg');
    el.textContent = msg;
    el.classList.remove('ok', 'error');
    el.classList.add(ok ? 'ok' : 'error', 'show');
  }

  /* Conmuta, dentro de la misma vista (con el resumen a la derecha), entre
     el formulario de "Crea tu cuenta" y el de "Inicia sesión". */
  function mostrarLogin(prefillEmail) {
    $('#checkoutForm').hidden = true;
    $('#loginForm').hidden = false;
    if (prefillEmail) $('#lo-email').value = prefillEmail;
    ($('#lo-email').value ? $('#lo-password') : $('#lo-email')).focus();
  }
  function mostrarRegistro() {
    $('#loginForm').hidden = true;
    $('#checkoutForm').hidden = false;
  }

  /* Tras iniciar sesión (o crear la cuenta) sin salir del checkout: oculta
     los campos de invitado y deja el formulario como cliente autenticado. */
  function entrarComoUsuario(user) {
    modoInvitado = false;
    document.querySelectorAll('.guest-only').forEach(el => { el.hidden = true; });
    $('#loginForm').hidden = true;
    $('#checkoutForm').hidden = false;
    $('#checkoutTitle').textContent = 'Dirección de envío';
    $('#checkoutSub').textContent = 'La usaremos para este pedido y la guardaremos como dirección por defecto.';
    if (user) precargarFormulario(user);
  }

  async function onLogin(e) {
    e.preventDefault();
    const email = $('#lo-email').value.trim();
    const password = $('#lo-password').value;
    if (!email || !password) { flashLogin('Escribe tu correo y tu contraseña.', false); return; }

    const btn = $('#loginSubmit');
    btn.disabled = true;
    const txt = btn.textContent;
    btn.textContent = 'Entrando…';

    const res = await Auth.login({ email, password });
    if (!res.ok) {
      btn.disabled = false;
      btn.textContent = txt;
      flashLogin(res.error || 'No se ha podido iniciar sesión.', false);
      return;
    }
    const user = await Auth.getCurrentUser();
    entrarComoUsuario(user);
  }

  function validarFormulario() {
    const requeridos = ['co-nombre', 'co-linea1', 'co-cp', 'co-ciudad', 'co-provincia'];
    if (modoInvitado) requeridos.unshift('co-email', 'co-password', 'co-password2');
    document.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
    let primero = null;
    requeridos.forEach(id => {
      const input = $('#' + id);
      const val = input.value.trim();
      let invalido = !val;
      if (id === 'co-email' && val && !EMAIL_RE.test(val)) invalido = true;
      if (invalido) {
        input.closest('.field').classList.add('invalid');
        if (!primero) primero = input;
      }
    });
    if (primero) { primero.focus(); return false; }
    return true;
  }

  /* Valida la contraseña del alta (fortaleza + repetición). Devuelve un
     mensaje de error o null si es correcta; marca el campo problemático. */
  function validarPasswordInvitado() {
    const pw = $('#co-password').value;
    const pw2 = $('#co-password2').value;
    const val = Auth.validarPassword(pw);
    if (!val.ok) {
      $('#co-password').closest('.field').classList.add('invalid');
      $('#co-password').focus();
      return val.error;
    }
    if (pw !== pw2) {
      $('#co-password2').closest('.field').classList.add('invalid');
      $('#co-password2').focus();
      return 'Las contraseñas no coinciden.';
    }
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (modoInvitado && (!$('#co-legal').checked || !$('#co-edad').checked)) {
      flash('Debes aceptar la política de privacidad y confirmar tu edad.', false);
      return;
    }
    if (!validarFormulario()) {
      flash('Completa los campos obligatorios.', false);
      return;
    }
    if (modoInvitado) {
      const errPw = validarPasswordInvitado();
      if (errPw) { flash(errPw, false); return; }
    }

    const btn = $('#checkoutSubmit');
    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = 'Procesando…';

    const direccion = {
      nombre: $('#co-nombre').value.trim(),
      telefono: $('#co-tel').value.trim(),
      linea1: $('#co-linea1').value.trim(),
      linea2: $('#co-linea2').value.trim(),
      cp: $('#co-cp').value.trim(),
      ciudad: $('#co-ciudad').value.trim(),
      provincia: $('#co-provincia').value.trim(),
    };

    // Cliente invitado: crea la cuenta sobre la marcha en vez de pedirle
    // que inicie sesión antes. Si ya existe una cuenta con ese correo, se
    // le invita a iniciar sesión con ella (el carrito no se pierde: sigue
    // en sessionStorage al volver de login.html).
    if (modoInvitado) {
      const email = $('#co-email').value.trim();
      const password = $('#co-password').value;
      const alta = await Auth.register({ nombre: direccion.nombre, email, password });

      if (!alta.ok) {
        btn.disabled = false;
        btn.textContent = textoOriginal;
        if (/ya existe una cuenta/i.test(alta.error || '')) {
          $('#co-email').closest('.field').classList.add('invalid');
          flash('Ya existe una cuenta con ese correo. <a href="#" data-action="login">Inicia sesión</a> para continuar con tu pedido.', false, true);
        } else {
          flash(alta.error || 'No se ha podido crear la cuenta.', false);
        }
        return;
      }
      if (alta.needsConfirm) {
        btn.disabled = false;
        btn.textContent = textoOriginal;
        flash('¡Cuenta creada! Te hemos enviado un correo para confirmarla. Confírmala y vuelve para completar tu pedido.', true);
        return;
      }
      // Sesión iniciada automáticamente: seguimos como cliente ya autenticado.
      modoInvitado = false;
      document.querySelectorAll('.guest-only').forEach(el => { el.hidden = true; });
    }

    // Guarda el perfil de cara a futuros pedidos; si falla, no bloquea la
    // compra (no tiene sentido perder una venta por esto).
    try {
      await Auth.updateProfile({
        nombre: direccion.nombre, telefono: direccion.telefono, direccion: {
          linea1: direccion.linea1, linea2: direccion.linea2,
          cp: direccion.cp, ciudad: direccion.ciudad, provincia: direccion.provincia,
        },
      });
    } catch (e) {}

    const items = itemsActuales();
    if (!items.length) { mostrarVacio(); return; }
    const { subtotal, envio, total } = Checkout.calcularTotales(items);

    const res = await Checkout.crearPedido({ items, direccion, subtotal, envio, total });

    if (res.reason === 'redirect') return;   // ya navegando a Stripe
    if (res.ok) {
      sessionStorage.removeItem('kq_cart');
      location.href = 'pedido.html?id=' + res.id;
      return;
    }
    btn.disabled = false;
    btn.textContent = textoOriginal;
    flash(res.error || 'No se ha podido completar el pedido. Inténtalo de nuevo.', false);
  }

  /* ── init ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', async () => {
    if (!Object.keys(cart).length) { mostrarVacio(); return; }

    // Sin sesión: no se manda a login/registro, se rellena todo aquí mismo
    // (incluida la contraseña) y la cuenta se crea al confirmar el pedido.
    const user = await Auth.getCurrentUser();
    modoInvitado = !user;
    if (modoInvitado) {
      $('#checkoutTitle').textContent = 'Crea tu cuenta';
      $('#checkoutSub').textContent = 'Rellena tus datos y crea una contraseña; usaremos la dirección para enviarte el pedido.';
      document.querySelectorAll('.guest-only').forEach(el => { el.hidden = false; });
    }

    await resolverCatalogo();
    const items = pintarResumen();
    if (!items.length) { mostrarVacio(); return; }

    if (window.Analytics) {
      const { subtotal, total } = Checkout.calcularTotales(items);
      Analytics.track('checkout_view', { items: items.length, subtotal, total });
    }

    if (user) precargarFormulario(user);

    const params = new URLSearchParams(location.search);
    if (params.get('pago') === 'cancelado') {
      flash('Has cancelado el pago. Tu pedido sigue pendiente, puedes intentarlo de nuevo.', false);
      if (window.Analytics) Analytics.track('payment_cancelled', { order_id: params.get('pedido') || null });
    }

    $('#checkoutForm').addEventListener('submit', onSubmit);
    $('#loginForm').addEventListener('submit', onLogin);

    // Conmutación login/registro dentro de la misma vista (no navega).
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      e.preventDefault();
      if (a.dataset.action === 'login') mostrarLogin($('#co-email').value.trim());
      else if (a.dataset.action === 'registro') mostrarRegistro();
    });

    document.addEventListener('click', e => {
      const q = e.target.closest('[data-q]');
      if (!q) return;
      const id = +q.dataset.id;
      cart[id] = (cart[id] || 0) + Number(q.dataset.q);
      if (cart[id] <= 0) delete cart[id];
      guardarCarrito();
      const restantes = pintarResumen();
      if (!restantes.length) mostrarVacio();
    });
  });
})();
