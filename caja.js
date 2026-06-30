/* =========================================================
   caja.js — Página "Crea tu caja" (standalone, sin app.js)
   ========================================================= */

/* ── helpers ─────────────────────────────────────────────── */
const $ = s => document.querySelector(s);
const eur = n => n.toFixed(2).replace('.', ',') + ' €';
const FREE_SHIPPING = 49;

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

const cartIcon = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 7h14l-1.2 10.5a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 7a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

/* ── carrito ─────────────────────────────────────────────── */
/* Persistido en sessionStorage para no perderlo al navegar. */
let cart = (() => { try { return JSON.parse(sessionStorage.getItem('kq_cart')) || {}; } catch { return {}; } })();
let toastTimer;

function showToast(msg) {
  const t = $('#toast');
  if (!t) return;
  $('#toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function bump() {
  const c = $('#cartCount');
  if (!c) return;
  c.style.transform = 'scale(1.35)';
  setTimeout(() => c.style.transform = '', 170);
}

function updateCart() {
  const ids = Object.keys(cart);
  const count = ids.reduce((s, id) => s + cart[id], 0);
  const cc = $('#cartCount');
  if (cc) { cc.textContent = count; cc.classList.toggle('show', count > 0); }
  const clearBtn = $('#clearCartBtn');
  if (clearBtn) clearBtn.style.display = ids.length ? '' : 'none';

  let total = 0;
  const html = ids.map(id => {
    const p = PRODUCTOS_DATA.find(x => x.id == id);
    if (!p) return '';
    const q = cart[id];
    total += p.price * q;
    const bg = TINTS[p.cat] || 'var(--blush)';
    const thumb = p.img ? `<img src="${p.img}" alt="${p.nombre||p.name}">` : (ART[p.art] || '');
    return `<div class="ci">
      <span class="ci-art" style="background:${bg}">${thumb}</span>
      <div class="ci-info"><b>${p.nombre||p.name}</b><span>${eur(p.price * q)}</span></div>
      <div class="qty">
        <button data-q="-1" data-id="${id}" aria-label="Quitar uno">−</button>
        <span>${q}</span>
        <button data-q="1" data-id="${id}" aria-label="Añadir uno">+</button>
      </div>
    </div>`;
  }).join('');

  try { sessionStorage.setItem('kq_cart', JSON.stringify(cart)); } catch {}

  const cartItems = $('#cartItems');
  if (cartItems) cartItems.innerHTML = ids.length ? html
    : '<div class="cart-empty"><b>Tu carrito está vacío</b>Añade algo dulce para empezar.</div>';

  const cartTotal = $('#cartTotal');
  if (cartTotal) cartTotal.textContent = eur(total);

  const left = FREE_SHIPPING - total;
  const shipMsg = $('#shipMsg');
  const shipFill = $('#shipFill');
  if (shipMsg) shipMsg.innerHTML = total >= FREE_SHIPPING
    ? '✓ <strong>Envío gratis conseguido</strong>'
    : `Te faltan <strong>${eur(left)}</strong> para el envío gratis`;
  if (shipFill) shipFill.style.width = Math.min(100, total / FREE_SHIPPING * 100) + '%';
}

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  const p = PRODUCTOS_DATA.find(x => x.id === id);
  showToast(`${p ? (p.nombre || p.name) : 'Producto'} · añadido`);
  bump();
  updateCart();
}

function changeQty(id, d) {
  cart[id] = (cart[id] || 0) + d;
  if (cart[id] <= 0) delete cart[id];
  updateCart();
}

function openCart()  { $('#cart').classList.add('show');    $('#scrim').classList.add('show'); }
function closeCart() { $('#cart').classList.remove('show'); $('#scrim').classList.remove('show'); }

/* ── generador de caja ───────────────────────────────────── */
let cajaSelection = [];
let cajaBudget = 0;

function cajaGenerarSeleccion(budget) {
  const pool = PRODUCTOS_DATA.filter(p => p.en_stock && p.price <= budget);
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  const sel = [];
  let remaining = budget;
  for (const p of shuffled) {
    if (p.price <= remaining) { sel.push(p); remaining -= p.price; }
    if (sel.length >= 8) break;
  }
  return sel;
}

function cajaTotal() { return cajaSelection.reduce((s, p) => s + p.price, 0); }

function cajaRenderItems() {
  const el = $('#cajaItems');
  if (!el) return;
  el.innerHTML = cajaSelection.length
    ? cajaSelection.map(p => {
        const bg = TINTS[p.cat] || 'var(--blush)';
        return `<div class="caja-item">
          <div class="caja-item-thumb" style="background:${bg}">
            ${p.img ? `<img src="${p.img}" alt="" loading="lazy">` : ''}
          </div>
          <span class="caja-item-name">${p.nombre || p.name}</span>
          <span class="caja-item-price">${eur(p.price)}</span>
          <button class="caja-item-remove" data-remove="${p.id}" aria-label="Quitar">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>`;
      }).join('')
    : '<p class="caja-empty">Sin productos. Ajusta el presupuesto o añade uno del desplegable.</p>';

  cajaRenderTotal();
  cajaRenderPicker();
}

function cajaRenderTotal() {
  const total = cajaTotal();
  const tEl = $('#cajaTotalDisplay');
  const bEl = $('#cajaBudgetDisplay');
  const lEl = document.querySelector('.caja-total-line');
  if (tEl) tEl.textContent = eur(total);
  if (bEl) bEl.textContent = eur(cajaBudget);
  if (lEl) lEl.classList.toggle('caja-total-over', total > cajaBudget + 0.01);
}

/* Selector visual de productos para añadir a la caja (rejilla con miniatura,
   nombre y precio + buscador), en sustitución del antiguo desplegable. */
let cajaPickerQuery = '';
function cajaRenderPicker() {
  const grid = $('#cajaPickerGrid');
  if (!grid) return;
  const ids = new Set(cajaSelection.map(p => p.id));
  const q = cajaPickerQuery.trim().toLowerCase();
  let available = PRODUCTOS_DATA.filter(p => p.en_stock && !ids.has(p.id));
  if (q) available = available.filter(p =>
    ((p.nombre || p.name || '') + ' ' + (p.cat_label || '') + ' ' + (p.marca || '')).toLowerCase().includes(q));
  grid.innerHTML = available.length
    ? available.map(p => {
        const bg = TINTS[p.cat] || 'var(--blush)';
        const thumb = p.img ? `<img src="${p.img}" alt="" loading="lazy">` : (ART[p.art] || '');
        const nombre = p.nombre || p.name;
        return `<button class="caja-pick" data-pick="${p.id}" type="button" title="Añadir ${nombre}">
          <span class="caja-pick-add" aria-hidden="true">+</span>
          <span class="caja-pick-thumb" style="background:${bg}">${thumb}</span>
          <span class="caja-pick-name">${nombre}</span>
          <span class="caja-pick-price">${eur(p.price)}</span>
        </button>`;
      }).join('')
    : `<p class="caja-picker-empty">${q ? 'No hay productos que coincidan.' : 'No quedan más productos para añadir.'}</p>`;
}

/* ── sugerencias ─────────────────────────────────────────── */
function renderSugerencias() {
  const grid = $('#cajaSugerencias');
  if (!grid) return;
  const picks = PRODUCTOS_DATA
    .filter(p => p.en_stock)
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, 8);
  grid.innerHTML = picks.map(p => {
    const bg = TINTS[p.cat] || 'var(--blush)';
    const thumb = p.img
      ? `<img src="${p.img}" alt="${p.nombre}" loading="lazy">`
      : (ART[p.art] || '');
    return `<article class="product">
      <a href="producto.html?id=${p.id}" style="display:contents">
        <div class="product-thumb" style="background:${bg}">${thumb}</div>
        <div class="product-body">
          <h3>${p.nombre}</h3>
          <p class="meta">${p.desc_short || p.meta || ''}</p>
        </div>
      </a>
      <div class="product-foot" style="padding:0 17px 16px">
        <span class="price">${eur(p.price)}</span>
        <button class="add" data-add="${p.id}" aria-label="Añadir ${p.nombre}">${cartIcon}</button>
      </div>
    </article>`;
  }).join('');
}

/* ── init ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  // Escaparate desde la BD: el catálogo en vivo (altas/bajas/precio/stock)
  // sustituye al estático cuando responde; si no, queda el de respaldo.
  if (window.Auth) {
    try {
      const live = await Auth.getProductos();
      if (live && live.length) {
        const full = Auth.fusionarCatalogo(live, PRODUCTOS_DATA);
        PRODUCTOS_DATA.length = 0;
        full.forEach(x => PRODUCTOS_DATA.push(x));
      }
    } catch (e) {}
  }

  /* carrito */
  updateCart();
  $('#cartBtn').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  $('#scrim').addEventListener('click', closeCart);
  if ($('#clearCartBtn')) $('#clearCartBtn').addEventListener('click', () => {
    if (!Object.keys(cart).length) return;
    if (!confirm('¿Vaciar el carrito?')) return;
    cart = {}; sessionStorage.removeItem('kq_cart'); updateCart();
  });
  $('#checkoutBtn').addEventListener('click', async () => {
    const res = await Checkout.tramitar({
      cart,
      resolve: (id, q) => {
        const p = PRODUCTOS_DATA.find(x => x.id == id);
        if (!p) return null;
        return { id: +id, nombre: p.nombre || p.name, precio: p.price, cantidad: q, img: p.img || '', tint: '' };
      },
    });
    if (res.reason === 'empty') { showToast('Tu carrito está vacío'); return; }
    if (res.reason === 'auth' || res.reason === 'redirect' || res.reason === 'address') return;   // navegando a login/Stripe/perfil
    if (res.ok) { cart = {}; sessionStorage.removeItem('kq_cart'); updateCart(); closeCart(); location.href = 'pedido.html?id=' + res.id; return; }
    if (res.error) { showToast(res.error); }
  });
  document.addEventListener('click', e => {
    const q = e.target.closest('[data-q]');
    if (q) { changeQty(+q.dataset.id, +q.dataset.q); return; }
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) { addToCart(parseInt(addBtn.dataset.add, 10)); return; }
    const rem = e.target.closest('[data-remove]');
    if (rem && rem.closest('#caja')) {
      const id = parseInt(rem.dataset.remove, 10);
      cajaSelection = cajaSelection.filter(p => p.id !== id);
      cajaRenderItems();
      return;
    }
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const id = parseInt(pick.dataset.pick, 10);
      const prod = PRODUCTOS_DATA.find(p => p.id === id);
      if (prod && !cajaSelection.find(p => p.id === id)) {
        cajaSelection.push(prod);
        showToast(`${prod.nombre || prod.name} · añadido a la caja`);
        cajaRenderItems();   // refresca la lista y el selector (quita el añadido)
      }
      return;
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

  /* búsqueda */
  const searchBtn = $('#searchBtn');
  if (searchBtn) searchBtn.addEventListener('click', () => {
    const w = $('#searchWrap');
    if (w) { w.classList.toggle('open'); if (w.classList.contains('open')) $('#searchInput').focus(); }
  });

  /* menú móvil */
  const menuBtn = $('#menuBtn');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    const nav = $('#mobileNav');
    if (!nav) return;
    const isOpen = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
  });
  document.addEventListener('click', e => {
    if (e.target.closest('.mobile-nav a')) {
      const nav = $('#mobileNav');
      if (nav) { nav.classList.remove('open'); if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); }
    }
  });

  /* caja surtida */
  $('#cajaGenBtn').addEventListener('click', () => {
    const input = $('#cajaPresupuesto');
    cajaBudget = Math.max(5, parseFloat(input.value) || 25);
    input.value = cajaBudget;
    cajaSelection = cajaGenerarSeleccion(cajaBudget);
    const result = $('#cajaResult');
    result.hidden = false;
    setTimeout(() => result.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    cajaRenderItems();
  });

  // Botón "Añadir producto": despliega/oculta el selector visual.
  $('#cajaAddBtn').addEventListener('click', () => {
    const picker = $('#cajaPicker');
    const btn = $('#cajaAddBtn');
    const abrir = picker.hidden;
    picker.hidden = !abrir;
    btn.setAttribute('aria-expanded', String(abrir));
    if (abrir) {
      cajaRenderPicker();
      const s = $('#cajaPickerSearch');
      if (s) s.focus();
      picker.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  // Buscador del selector.
  const pickerSearch = $('#cajaPickerSearch');
  if (pickerSearch) pickerSearch.addEventListener('input', e => {
    cajaPickerQuery = e.target.value;
    cajaRenderPicker();
  });

  $('#cajaCartBtn').addEventListener('click', () => {
    if (!cajaSelection.length) return;
    cajaSelection.forEach(p => addToCart(p.id));
    const btn = $('#cajaCartBtn');
    const orig = btn.innerHTML;
    btn.textContent = '¡Añadido al carrito!';
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
  });

  renderSugerencias();

});
