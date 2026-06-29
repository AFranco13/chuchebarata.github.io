/* =========================================================
   El Kiosquillo — carrito.js
   Carrito reutilizable para páginas que no tienen el suyo propio
   (perfil, detalle de pedido, etc.). Se auto-inyecta en la cabecera
   y lee/escribe el mismo carrito de sessionStorage que la tienda.
   No hace nada si la página ya tiene carrito (app.js / caja.js).
   Requiere: productos_data.js y checkout.js.
   ========================================================= */

(function (global) {
  'use strict';

  const tools = document.querySelector('.header-tools');
  if (!tools) return;
  if (document.getElementById('cartBtn')) return;   // la página ya tiene carrito

  const $ = s => document.querySelector(s);
  const eur = n => (Number(n) || 0).toFixed(2).replace('.', ',') + ' €';
  const FREE_SHIPPING = 49;
  const TINTS = {
    gominolas:'var(--t-gominolas)', nubes:'var(--t-nubes)', caramelos:'var(--t-caramelos)',
    chocolate:'var(--t-chocolate)', regaliz:'var(--t-regaliz)', chicles:'var(--t-chicles)',
    conos:'var(--t-conos)', decoracion:'var(--t-decoracion)',
  };
  const cartIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1.2 10.5a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 7a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

  let cart = readCart();
  function readCart(){ try { return JSON.parse(sessionStorage.getItem('kq_cart')) || {}; } catch { return {}; } }
  function saveCart(){ try { sessionStorage.setItem('kq_cart', JSON.stringify(cart)); } catch {} }

  /* Resuelve un producto desde el catálogo de portada o el completo. */
  function resolve(id){
    if (typeof PRODUCTS !== 'undefined'){ const p = PRODUCTS.find(x => x.id == id); if(p) return { nombre:p.name, price:p.price, img:p.img, cat:p.cat }; }
    if (typeof PRODUCTOS_DATA !== 'undefined'){ const d = PRODUCTOS_DATA.find(x => x.id == id); if(d) return { nombre:d.nombre||d.name, price:d.price, img:d.img, cat:d.cat }; }
    return null;
  }

  /* ---- inyección de la interfaz ---- */
  const btn = document.createElement('button');
  btn.className = 'tool cart-toggle';
  btn.id = 'cartBtn';
  btn.setAttribute('aria-label', 'Abrir carrito');
  btn.innerHTML = cartIcon + '<span class="cart-count" id="cartCount">0</span>';
  tools.insertBefore(btn, tools.firstChild);

  const scrim = document.createElement('div');
  scrim.className = 'scrim'; scrim.id = 'scrim';
  document.body.appendChild(scrim);

  const aside = document.createElement('aside');
  aside.className = 'cart'; aside.id = 'cart';
  aside.setAttribute('aria-label', 'Carrito de compra');
  aside.innerHTML = `
    <div class="cart-head">
      <h3>Tu pedido</h3>
      <button class="cart-close" id="cartClose" aria-label="Cerrar">
        <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="ship"><p id="shipMsg"></p><div class="ship-track"><div class="ship-fill" id="shipFill"></div></div></div>
    <div class="cart-items" id="cartItems"></div>
    <div class="cart-foot">
      <div class="cart-total"><span>Total · IVA incl.</span><b id="cartTotal">0,00 €</b></div>
      <button class="btn btn-primary btn-block" id="checkoutBtn">Tramitar pedido</button>
      <button class="cart-clear" id="clearCartBtn" type="button">Vaciar carrito</button>
    </div>`;
  document.body.appendChild(aside);

  if (!document.getElementById('toast')){
    const t = document.createElement('div');
    t.className = 'toast'; t.id = 'toast';
    t.innerHTML = '<span id="toastMsg"></span>';
    document.body.appendChild(t);
  }

  let toastTimer;
  function showToast(msg){
    const t = $('#toast'); if(!t) return;
    $('#toastMsg').textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function updateCart(){
    cart = readCart();   // por si otra pestaña/página lo cambió
    const ids = Object.keys(cart);
    const count = ids.reduce((s, id) => s + cart[id], 0);
    const cc = $('#cartCount');
    cc.textContent = count;
    cc.classList.toggle('show', count > 0);
    const clearBtn = $('#clearCartBtn');
    if(clearBtn) clearBtn.style.display = ids.length ? '' : 'none';

    let total = 0;
    const html = ids.map(id => {
      const p = resolve(id);
      if(!p) return '';
      const q = cart[id]; total += p.price * q;
      return `<div class="ci">
        <span class="ci-art" style="background:${TINTS[p.cat]||'var(--blush)'}">${p.img ? `<img src="${p.img}" alt="${p.nombre}">` : ''}</span>
        <div class="ci-info"><b>${p.nombre}</b><span>${eur(p.price*q)}</span></div>
        <div class="qty"><button data-q="-1" data-id="${id}" aria-label="Quitar uno">−</button><span>${q}</span><button data-q="1" data-id="${id}" aria-label="Añadir uno">+</button></div>
      </div>`;
    }).join('');

    $('#cartItems').innerHTML = ids.length ? html
      : `<div class="cart-empty"><b>Tu carrito está vacío</b>Añade algo dulce para empezar.</div>`;
    $('#cartTotal').textContent = eur(total);

    const left = FREE_SHIPPING - total;
    if(total >= FREE_SHIPPING){
      $('#shipMsg').innerHTML = '✓ <strong>Envío gratis conseguido</strong>';
      $('#shipFill').style.width = '100%';
    } else {
      $('#shipMsg').innerHTML = `Te faltan <strong>${eur(left)}</strong> para el envío gratis`;
      $('#shipFill').style.width = Math.min(100, total/FREE_SHIPPING*100) + '%';
    }
    saveCart();
  }

  function changeQty(id, d){ cart[id] = (cart[id]||0) + d; if(cart[id] <= 0) delete cart[id]; updateCart(); }
  function openCart(){ aside.classList.add('show'); scrim.classList.add('show'); }
  function closeCart(){ aside.classList.remove('show'); scrim.classList.remove('show'); }

  btn.addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  scrim.addEventListener('click', closeCart);
  $('#clearCartBtn').addEventListener('click', () => {
    if(!Object.keys(cart).length) return;
    if(!confirm('¿Vaciar el carrito?')) return;
    cart = {}; sessionStorage.removeItem('kq_cart'); updateCart();
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeCart(); });
  document.addEventListener('click', e => {
    const q = e.target.closest('[data-q]');
    if(q){ changeQty(+q.dataset.id, +q.dataset.q); }
  });

  $('#checkoutBtn').addEventListener('click', async () => {
    if(!global.Checkout){ showToast('No se puede tramitar aquí.'); return; }
    const res = await Checkout.tramitar({
      cart,
      resolve: (id, qty) => {
        const p = resolve(id);
        if(!p) return null;
        return { id:+id, nombre:p.nombre, precio:p.price, cantidad:qty, img:p.img||'', tint:TINTS[p.cat]||'' };
      },
    });
    if(res.reason === 'empty'){ showToast('Tu carrito está vacío'); return; }
    if(res.reason === 'auth' || res.reason === 'redirect' || res.reason === 'address') return;
    if(res.ok){ cart = {}; sessionStorage.removeItem('kq_cart'); updateCart(); closeCart(); location.href = 'pedido.html?id=' + res.id; return; }
    if(res.error){ showToast(res.error); }
  });

  updateCart();
})(window);
