/* =========================================================
   El Kiosquillo (chuchebarata.com) — app.js
   Ilustraciones SVG propias + tienda interactiva
   ========================================================= */

/* ---- Biblioteca de ilustraciones (SVG hechos a mano) ---- */
const ART = {
  bear: `<svg viewBox="0 0 80 80"><g fill="#C2375F"><circle cx="28" cy="20" r="7"/><circle cx="52" cy="20" r="7"/><circle cx="40" cy="29" r="13"/><rect x="24" y="38" width="32" height="30" rx="14"/><circle cx="20" cy="46" r="8"/><circle cx="60" cy="46" r="8"/><circle cx="28" cy="66" r="8"/><circle cx="52" cy="66" r="8"/></g><ellipse cx="40" cy="51" rx="9" ry="11" fill="#fff" opacity=".22"/><circle cx="35" cy="28" r="1.7" fill="#5E1030"/><circle cx="45" cy="28" r="1.7" fill="#5E1030"/><circle cx="33" cy="23" r="3" fill="#fff" opacity=".4"/></svg>`,

  lolly: `<svg viewBox="0 0 80 80"><rect x="38" y="38" width="4" height="36" rx="2" fill="#E2D2C6"/><circle cx="40" cy="30" r="22" fill="#D9B23E"/><circle cx="40" cy="30" r="16" fill="#C2375F"/><circle cx="40" cy="30" r="10" fill="#D9B23E"/><circle cx="40" cy="30" r="4" fill="#C2375F"/><path d="M28 22a22 22 0 0 1 12-7" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".5"/></svg>`,

  wrapped: `<svg viewBox="0 0 80 80"><path d="M22 40 8 31l4 9-4 9z" fill="#E89BB0"/><path d="M58 40l14-9-4 9 4 9z" fill="#E89BB0"/><ellipse cx="40" cy="40" rx="20" ry="16" fill="#C2375F"/><ellipse cx="33" cy="34" rx="6" ry="4" fill="#fff" opacity=".35"/></svg>`,

  choc: `<svg viewBox="0 0 80 80"><rect x="21" y="16" width="38" height="48" rx="5" fill="#4A2C1A"/><g fill="#6E4427"><rect x="25" y="20" width="13" height="18" rx="2"/><rect x="42" y="20" width="13" height="18" rx="2"/><rect x="25" y="42" width="13" height="18" rx="2"/><rect x="42" y="42" width="13" height="18" rx="2"/></g><rect x="25" y="20" width="13" height="4" fill="#fff" opacity=".12"/></svg>`,

  bonbon: `<svg viewBox="0 0 80 80"><circle cx="40" cy="44" r="22" fill="#5A341F"/><path d="M26 38c4-6 24-6 28 0" stroke="#C9A27A" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/><path d="M28 50c4 4 20 4 24 0" stroke="#C9A27A" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/><ellipse cx="33" cy="36" rx="6" ry="3.5" fill="#fff" opacity=".25"/></svg>`,

  licorice: `<svg viewBox="0 0 80 80"><clipPath id="lc"><rect x="22" y="20" width="36" height="42" rx="7"/></clipPath><g clip-path="url(#lc)"><rect x="22" y="20" width="36" height="9" fill="#2A1A24"/><rect x="22" y="29" width="36" height="8" fill="#D9B23E"/><rect x="22" y="37" width="36" height="8" fill="#C2375F"/><rect x="22" y="45" width="36" height="8" fill="#F3E2DA"/><rect x="22" y="53" width="36" height="9" fill="#2A1A24"/></g><rect x="22" y="20" width="36" height="42" rx="7" fill="none" stroke="#2A1A24" stroke-width="1" opacity=".15"/></svg>`,

  nube: `<svg viewBox="0 0 80 80"><rect x="20" y="36" width="40" height="24" rx="11" fill="#E089A5"/><rect x="24" y="22" width="32" height="22" rx="11" fill="#F6D6DF"/><ellipse cx="40" cy="31" rx="13" ry="6" fill="#fff" opacity=".5"/></svg>`,

  gum: `<svg viewBox="0 0 80 80"><circle cx="30" cy="34" r="12" fill="#C2375F"/><circle cx="52" cy="30" r="11" fill="#6FA98E"/><circle cx="45" cy="50" r="13" fill="#D9B23E"/><circle cx="26" cy="54" r="10" fill="#7A4B8F"/><circle cx="58" cy="50" r="9" fill="#C07A2E"/><circle cx="26" cy="30" r="3.4" fill="#fff" opacity=".45"/><circle cx="48" cy="26" r="3" fill="#fff" opacity=".45"/></svg>`,

  cone: `<svg viewBox="0 0 80 80"><path d="M31 32h18l-7 38h-4z" fill="#EFE0D2"/><path d="M31 32h18l-2 10H33z" fill="#E2CBB8"/><circle cx="34" cy="28" r="6" fill="#C2375F"/><circle cx="45" cy="26" r="6" fill="#6FA98E"/><circle cx="40" cy="31" r="6" fill="#D9B23E"/><circle cx="49" cy="31" r="5" fill="#7A4B8F"/><circle cx="30" cy="31" r="5" fill="#C07A2E"/></svg>`,

  gift: `<svg viewBox="0 0 80 80"><rect x="18" y="34" width="44" height="30" rx="4" fill="#6E1A3C"/><rect x="18" y="27" width="44" height="11" rx="3" fill="#8A2350"/><rect x="36" y="22" width="8" height="42" fill="#D9B23E"/><path d="M40 24c-7-9-18-2-0 0-18-2-7 9 0 0z" fill="#D9B23E"/><circle cx="40" cy="24" r="3" fill="#C07A2E"/></svg>`,

  balloon: `<svg viewBox="0 0 80 80"><ellipse cx="31" cy="29" rx="14" ry="17" fill="#C2375F"/><path d="M31 45l-2.5 5h5z" fill="#C2375F"/><path d="M31 50q6 8 0 16" stroke="#2A1A24" stroke-width="1.4" fill="none"/><ellipse cx="51" cy="35" rx="12" ry="15" fill="#6FA98E"/><path d="M51 49l-2.5 4.5h5z" fill="#6FA98E"/><path d="M51 53q-5 7 0 13" stroke="#2A1A24" stroke-width="1.4" fill="none"/><ellipse cx="25" cy="22" rx="3" ry="4.5" fill="#fff" opacity=".4"/></svg>`,
};

const plusIcon = `<svg viewBox="0 0 24 24"><line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

/* ---- Catálogo ---- */
const CATEGORIES = [
  { id:'gominolas',  name:'Gominolas', art:'bear',     sub:'Azucaradas, brillo y pica' },
  { id:'nubes',      name:'Nubes',     art:'nube',     sub:'Esponjitas y marshmallows' },
  { id:'caramelos',  name:'Caramelos', art:'wrapped',  sub:'Piruletas y masticables' },
  { id:'chocolate',  name:'Chocolate', art:'choc',     sub:'Tabletas y bombones' },
  { id:'regaliz',    name:'Regaliz',   art:'licorice', sub:'Dulce y picante' },
  { id:'chicles',    name:'Chicles',   art:'gum',      sub:'Con y sin azúcar' },
  { id:'conos',      name:'Conos y cestas', art:'cone', sub:'Listos para regalar' },
  { id:'decoracion', name:'Decoración', art:'balloon', sub:'Globos y mesa de fiesta' },
];

const PRODUCTS = [
  { id:1,  name:'Taco Relleno Regaliz 1 kg Fini',                  cat:'regaliz',   art:'licorice', img:'images/productos/taco-relleno-regaliz-1-kg-fini.jpg',                    price:10.69, tag:'top',    meta:'1 kg · regaliz surtido Fini' },
  { id:2,  name:'Ranas gigantes brillo 1 kg Fini',                 cat:'gominolas', art:'bear',     img:'images/productos/ranas-gigantes-brillo-1-kg-fini.jpg',                   price:6.59,  tag:'top',    meta:'1 kg · gominolas brillo' },
  { id:3,  name:'Crunchy Asteroides Surtidos 1 kg Burmar',         cat:'gominolas', art:'bear',     img:'images/productos/crunchy-asteroides-surtidos-1-kg-burmar.jpg',           price:10.39,              meta:'1 kg · surtido crujiente' },
  { id:4,  name:'Piruletas Corazón 110 ud Cerdan',                 cat:'caramelos', art:'lolly',    img:'images/productos/piruletas-corazon-110-ud-cerdan.jpg',                   price:10.09,              meta:'110 ud · corazón de fresa' },
  { id:5,  name:'Smint Tabs Menta 12 ud',                          cat:'caramelos', art:'wrapped',  img:'images/productos/smint-tabs-menta-12-ud.jpg',                            price:23.69,              meta:'12 ud · sin azúcar' },
  { id:6,  name:'Cereza envuelta gragea 80 g (12 ud) Fini',        cat:'gominolas', art:'bear',     img:'images/productos/cereza-envuelta-gragea-80-g-12-ud-fini.jpg',            price:11.19,              meta:'12 ud · cereza con gragea' },
  { id:7,  name:'Orbit Refreshers Hierbabuena (16 ud)',            cat:'chicles',   art:'gum',      img:'images/productos/orbit-refreshers-hierbabuena-16-ud.jpg',                price:21.29,              meta:'16 ud · sin azúcar' },
  { id:8,  name:'Sobres Soda Unicornios Fresa Plátano (40 ud)',    cat:'caramelos', art:'wrapped',  img:'images/productos/sobres-soda-unicornios-fresa-platano-40-ud-cerdan.jpg',  price:9.79,               meta:'40 ud · pica pica' },
  { id:9,  name:'Orbit Refreshers Tropical (16 ud)',               cat:'chicles',   art:'gum',      img:'images/productos/orbit-refreshers-tropical-16-ud.jpg',                   price:21.29,              meta:'16 ud · sin azúcar' },
  { id:10, name:'Mesa Dulce Rosa',                                  cat:'conos',     art:'gift',     img:'images/productos/mesa-dulce-rosa.jpg',                                   price:55.79, tag:'top',    meta:'Lista para usar · candy bar' },
  { id:11, name:'Oreo Doble Crema 157 g (16 ud)',                  cat:'chocolate', art:'choc',     img:'images/productos/oreo-doble-crema-157-g-16-ud.jpg',                      price:30.59,              meta:'16 ud · doble relleno' },
  { id:12, name:'Panna Fragola 200 ud Fini',                       cat:'chicles',   art:'gum',      img:'images/productos/panna-fragola-200-ud-fini.jpg',                         price:10.89,              meta:'200 ud · sabor fresa' },
  { id:13, name:'Caramelo relleno de miel 1 kg Gerio',             cat:'caramelos', art:'wrapped',  img:'images/productos/caramelo-relleno-de-miel-1-kg-gerio.jpg',               price:11.59,              meta:'1 kg · relleno de miel' },
  { id:14, name:'Taco Lápiz Nata Fresa 1 kg King Regal',           cat:'regaliz',   art:'licorice', img:'images/productos/taco-lapiz-nata-fresa-1-kg-king-regal.jpg',             price:6.19,               meta:'1 kg · nata y fresa' },
  { id:15, name:'Sobres Soda Dinos Lima Limón (40 ud)',            cat:'caramelos', art:'wrapped',  img:'images/productos/sobres-soda-dinos-lima-limon-40-ud-cerdan.jpg',          price:9.79,               meta:'40 ud · pica lima limón' },
  { id:16, name:'Lágrimas de eucalipto 1 kg Damel',               cat:'gominolas', art:'bear',     img:'images/productos/lagrimas-de-eucalipto-1-kg-damel.jpg',                  price:5.99,               meta:'1 kg · sabor eucalipto' },
  { id:17, name:'Barrita Jungly 34 g (30 ud) Nestlé',             cat:'chocolate', art:'choc',     img:'images/productos/barrita-jungly-34-g-30-ud-nestle.jpg',                  price:18.49,              meta:'30 ud · chocolate con leche' },
  { id:18, name:'Macedonia 250 ud Fini',                           cat:'chicles',   art:'gum',      img:'images/productos/macedonia-250-ud-fini.jpg',                             price:11.49,              meta:'250 ud · frutas surtidas' },
  { id:19, name:'Mesa Dulce Azul',                                  cat:'conos',     art:'gift',     img:'images/productos/mesa-dulce-azul.jpg',                                   price:51.09, tag:'oferta', meta:'Lista para usar · candy bar' },
  { id:20, name:'Aros fresa pica 1 kg Fini',                       cat:'gominolas', art:'bear',     img:'images/productos/aros-fresa-pica-1-kg-fini.jpg',                         price:5.39,               meta:'1 kg · pica pica fresa' },
  { id:21, name:'Burguer Gum 200 ud Fini',                         cat:'chicles',   art:'gum',      img:'images/productos/burguer-gum-200-ud-fini.jpg',                           price:12.59,              meta:'200 ud · sabor hamburguesa' },
  { id:22, name:'Snack Crunch 33 g (30 ud) Nestlé',               cat:'chocolate', art:'choc',     img:'images/productos/snack-crunch-33-g-30-ud-nestle.jpg',                    price:18.49,              meta:'30 ud · chocolate crujiente' },
];

const EVENTS = [
  { art:'cone',    title:'Conos de chuches', sub:'desde 0,65 €/ud' },
  { art:'gift',    title:'Cestas gigantes',  sub:'para sorprender' },
  { art:'lolly',   title:'Brochetas',        sub:'decora la mesa' },
  { art:'balloon', title:'Packs completos',  sub:'por nº de invitados' },
];

const TINTS = {
  gominolas:'var(--t-gominolas)', nubes:'var(--t-nubes)', caramelos:'var(--t-caramelos)',
  chocolate:'var(--t-chocolate)', regaliz:'var(--t-regaliz)', chicles:'var(--t-chicles)',
  conos:'var(--t-conos)', decoracion:'var(--t-decoracion)',
};
const FREE_SHIPPING = 49;

/* ---- helpers ---- */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const eur = n => n.toFixed(2).replace('.', ',') + ' €';

/* El carrito se guarda en sessionStorage para que sobreviva a la
   navegación (p. ej. ir a acceder y volver) sin perderse. */
let cart = (() => { try { return JSON.parse(sessionStorage.getItem('kq_cart')) || {}; } catch { return {}; } })();
let activeCat = 'todo';

/* Datos normalizados de un producto del carrito, buscando primero en el
   catálogo de portada (PRODUCTS) y, si no, en el completo (PRODUCTOS_DATA). */
function cartItemData(id){
  const p = PRODUCTS.find(x => x.id == id);
  if(p) return { name:p.name, price:p.price, cat:p.cat, img:p.img, art:p.art };
  if(typeof PRODUCTOS_DATA !== 'undefined'){
    const d = PRODUCTOS_DATA.find(x => x.id == id);
    if(d) return { name:d.nombre||d.name, price:d.price, cat:d.cat, img:d.img, art:d.art };
  }
  return null;
}

/* ---- categorías ---- */
function renderCategories(){
  $('#catGrid').innerHTML = CATEGORIES.map(c => `
    <button class="cat" data-filter="${c.id}">
      <span class="cat-art" style="background:${TINTS[c.id]}">${ART[c.art]}</span>
      <span class="cat-name">${c.name}<span class="arrow">→</span></span>
      <small>${c.sub}</small>
    </button>`).join('');
}

/* ---- filtros ---- */
function renderFilters(){
  const cats = [{id:'todo',name:'Todo'}, ...CATEGORIES.filter(c=>c.id!=='decoracion')];
  $('#filters').innerHTML = cats.map(c =>
    `<button class="filter${c.id==='todo'?' active':''}" data-filter="${c.id}">${c.name}</button>`).join('');
}

/* ---- productos ---- */
function renderProducts(list){
  const grid = $('#productGrid');
  if(!grid) return;
  if(!list.length){
    grid.innerHTML = `<div class="empty-grid"><b>Sin resultados</b>Prueba con otra familia o término de búsqueda.</div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <article class="product">
      ${p.tag ? `<span class="product-tag ${p.tag}">${p.tag==='oferta'?'Oferta':p.tag==='nuevo'?'Novedad':'Más vendido'}</span>`:''}
      <a href="producto.html?id=${p.id}" class="product-link" aria-label="Ver detalle de ${p.name}">
        <div class="product-thumb" style="background:${TINTS[p.cat]}">${p.img ? `<img src="${p.img}" alt="${p.name}" loading="lazy">` : ART[p.art]}</div>
      </a>
      <div class="product-body">
        <h3><a href="producto.html?id=${p.id}" class="product-name-link">${p.name}</a></h3>
        <p class="meta">${p.meta}</p>
        ${p.allergen ? `<span class="allergen">● Sin gluten</span>` : ''}
        <div class="product-foot">
          <span class="price ${p.old?'sale':''}">${p.old?`<s>${eur(p.old)}</s>`:''}${eur(p.price)}</span>
          <button class="add" data-add="${p.id}" aria-label="Añadir ${p.name}">${plusIcon}</button>
        </div>
      </div>
    </article>`).join('');
}

function currentList(){
  let list = PRODUCTS;
  const q = ($('#searchInput') ? $('#searchInput').value.trim() : '').toLowerCase();
  if(activeCat !== 'todo') list = list.filter(p => p.cat === activeCat);
  if(q) list = list.filter(p => (p.name+' '+p.meta+' '+p.cat).toLowerCase().includes(q));
  const note = $('#resultNote');
  if(q) note.textContent = `${list.length} resultado${list.length!==1?'s':''} para «${$('#searchInput').value.trim()}».`;
  else if(activeCat==='todo') note.textContent = 'Lo más vendido esta semana.';
  else note.textContent = `${list.length} referencia${list.length!==1?'s':''} en esta familia.`;
  return list;
}
function refresh(){ renderProducts(currentList()); }

function setCat(cat){
  activeCat = cat;
  $$('.filter').forEach(f => f.classList.toggle('active', f.dataset.filter === cat));
  refresh();
}

/* ---- eventos ---- */
function renderEvents(){
  $('#eventCards').innerHTML = EVENTS.map(e => `
    <button class="event-card" data-filter="conos">
      <span class="ea">${ART[e.art]}</span>
      <b>${e.title}</b><small>${e.sub}</small>
    </button>`).join('');
}

/* ---- chips del hero ---- */
function renderChips(){
  $('#chipArtA').innerHTML = ART.bear;
  $('#chipArtB').innerHTML = ART.cone;
}

/* ---- carrito ---- */
function findProduct(id){
  return PRODUCTS.find(x => x.id === id)
    || (typeof PRODUCTOS_DATA !== 'undefined' && PRODUCTOS_DATA.find(x => x.id === id && (x.nombre||x.name) && { ...x, name: x.nombre, price: x.price }))
    || null;
}
function addToCart(id){
  cart[id] = (cart[id]||0) + 1;
  const p = findProduct(id);
  showToast(`${p ? (p.name||p.nombre) : 'Producto'} · añadido`);
  bump();
  updateCart();
}
function changeQty(id, d){
  cart[id] = (cart[id]||0) + d;
  if(cart[id] <= 0) delete cart[id];
  updateCart();
}
function bump(){
  const c = $('#cartCount');
  c.style.transform = 'scale(1.35)';
  setTimeout(() => c.style.transform = '', 170);
}
function updateCart(){
  const ids = Object.keys(cart);
  const count = ids.reduce((s,id) => s + cart[id], 0);
  const cc = $('#cartCount');
  cc.textContent = count;
  cc.classList.toggle('show', count > 0);

  let total = 0;
  const html = ids.map(id => {
    const p = cartItemData(id);
    if(!p) return '';
    const q = cart[id]; total += p.price * q;
    return `<div class="ci">
      <span class="ci-art" style="background:${TINTS[p.cat]||'var(--blush)'}">${p.img ? `<img src="${p.img}" alt="${p.name}">` : (ART[p.art]||'')}</span>
      <div class="ci-info"><b>${p.name}</b><span>${eur(p.price*q)}</span></div>
      <div class="qty"><button data-q="-1" data-id="${id}" aria-label="Quitar uno">−</button><span>${q}</span><button data-q="1" data-id="${id}" aria-label="Añadir uno">+</button></div>
    </div>`;
  }).join('');

  try { sessionStorage.setItem('kq_cart', JSON.stringify(cart)); } catch {}

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
}
function openCart(){ $('#cart').classList.add('show'); $('#scrim').classList.add('show'); }
function closeCart(){ $('#cart').classList.remove('show'); $('#scrim').classList.remove('show'); }

/* ---- toast ---- */
let toastTimer;
function showToast(msg){
  $('#toastMsg').textContent = msg;
  const t = $('#toast');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---- reveal al hacer scroll ---- */
function initReveal(){
  if(!('IntersectionObserver' in window)){ $$('.reveal').forEach(e=>e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:.12 });
  $$('.reveal').forEach(e => io.observe(e));
}

/* ---- eventos globales (delegación) ---- */
function bindEvents(){
  document.addEventListener('click', e => {
    if(e.target.closest('.mobile-nav a')){
      const nav = $('#mobileNav');
      if(nav){ nav.classList.remove('open'); if($('#menuBtn')) $('#menuBtn').setAttribute('aria-expanded','false'); }
    }

    const add = e.target.closest('[data-add]');
    if(add){ addToCart(+add.dataset.add); return; }

    const q = e.target.closest('[data-q]');
    if(q){ changeQty(+q.dataset.id, +q.dataset.q); return; }

    const filter = e.target.closest('[data-filter]');
    if(filter){
      e.preventDefault();
      setCat(filter.dataset.filter);
      const tienda = $('#tienda');
      if(tienda) tienda.scrollIntoView({behavior:'smooth'});
      return;
    }
  });

  $('#cartBtn').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  $('#scrim').addEventListener('click', closeCart);
  $('#checkoutBtn').addEventListener('click', async () => {
    const res = await Checkout.tramitar({
      cart,
      resolve: (id, q) => {
        const p = cartItemData(id);
        if(!p) return null;
        return { id:+id, nombre:p.name, precio:p.price, cantidad:q, img:p.img||'', tint:TINTS[p.cat]||'' };
      },
    });
    if(res.reason === 'empty'){ showToast('Tu carrito está vacío'); return; }
    if(res.reason === 'auth' || res.reason === 'redirect') return;   // navegando a login/Stripe
    if(res.ok){ cart = {}; sessionStorage.removeItem('kq_cart'); updateCart(); closeCart(); location.href = 'pedido.html?id=' + res.id; return; }
    if(res.error){ showToast(res.error); }
  });

  $('#searchBtn').addEventListener('click', () => {
    const w = $('#searchWrap');
    w.classList.toggle('open');
    if(w.classList.contains('open')) $('#searchInput').focus();
  });
  if($('#searchInput')) $('#searchInput').addEventListener('input', refresh);

  if($('#menuBtn')) $('#menuBtn').addEventListener('click', () => {
    const nav = $('#mobileNav');
    if(!nav) return;
    const isOpen = nav.classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded', String(isOpen));
  });

  if($('#newsForm')) $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#newsEmail').value.trim();
    if(!email || !email.includes('@')){ showToast('Introduce un correo válido'); return; }
    $('#newsForm').reset();
    showToast('¡Listo! Revisa tu correo para el 10 %');
  });

  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeCart(); });
}

/* ---- init ---- */
document.addEventListener('DOMContentLoaded', () => {
  if ($('#catGrid'))     renderCategories();
  if ($('#filters'))    renderFilters();
  if ($('#eventCards')) renderEvents();
  if ($('#chipArtA'))   renderChips();
  if ($('#productGrid')) refresh();
  updateCart();
  bindEvents();
  initReveal();

  if(new URLSearchParams(location.search).get('pago') === 'cancelado'){
    showToast('Has cancelado el pago. Tu pedido sigue pendiente en tu cuenta.');
  }
});
