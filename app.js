/* =========================================================
   Casa Mendaro — app.js
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
  { id:1,  name:'Ositos de fruta',        cat:'gominolas', art:'bear',     price:3.40, old:3.95, tag:'oferta', meta:'Bolsa 1 kg · surtido clásico', allergen:true },
  { id:2,  name:'Aros de fresa ácidos',   cat:'gominolas', art:'wrapped',  price:3.90,           tag:'top',    meta:'Bolsa 1 kg · pica',            allergen:true },
  { id:3,  name:'Botellas de cola',       cat:'gominolas', art:'gum',      price:3.50,           meta:'Bolsa 1 kg · sabor original',  allergen:true },
  { id:4,  name:'Nubes de colores',       cat:'nubes',     art:'nube',     price:2.80,           tag:'nuevo',  meta:'Bolsa 900 g · esponjitas',     allergen:true },
  { id:5,  name:'Nubes con chocolate',    cat:'nubes',     art:'bonbon',   price:4.20,           meta:'Bañadas en chocolate con leche', allergen:false },
  { id:6,  name:'Piruletas de espiral',   cat:'caramelos', art:'lolly',    price:0.60,           tag:'top',    meta:'Unidad · colores surtidos',    allergen:true },
  { id:7,  name:'Caramelos masticables',  cat:'caramelos', art:'wrapped',  price:2.95,           meta:'Bolsa 1 kg · frutas',          allergen:true },
  { id:8,  name:'Mini tabletas surtidas', cat:'chocolate', art:'choc',     price:5.50, old:6.50, tag:'oferta', meta:'Caja 30 ud · para repartir',   allergen:false },
  { id:9,  name:'Bombones del obrador',   cat:'chocolate', art:'bonbon',   price:7.90,           meta:'Estuche 250 g · regalo',       allergen:false },
  { id:10, name:'Regaliz rojo trenzado',  cat:'regaliz',   art:'licorice', price:3.20,           meta:'Bolsa 1 kg · dulce',           allergen:true },
  { id:11, name:'Surtido de allsorts',    cat:'regaliz',   art:'licorice', price:3.30,           tag:'nuevo',  meta:'Bolsa 1 kg · capas clásicas',  allergen:true },
  { id:12, name:'Bolas de chicle',        cat:'chicles',   art:'gum',      price:4.10,           meta:'Bolsa 1 kg · colores',         allergen:true },
  { id:13, name:'Cono para repartir',     cat:'conos',     art:'cone',     price:0.68,           tag:'oferta', meta:'Unidad · sin gluten',          allergen:true },
  { id:14, name:'Cesta gigante regalo',   cat:'conos',     art:'gift',     price:38.95,          tag:'top',    meta:'40 cm · rellena a mano',       allergen:false },
  { id:15, name:'Brocheta de gominolas',  cat:'conos',     art:'cone',     price:1.50,           meta:'Unidad · para la mesa dulce',  allergen:true },
  { id:16, name:'Cartucho XXL 1,5 m',     cat:'conos',     art:'gift',     price:36.95,          meta:'Chocolatinas tamaño gigante',  allergen:false },
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
const FREE_SHIPPING = 95;

/* ---- helpers ---- */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const eur = n => n.toFixed(2).replace('.', ',') + ' €';

let cart = {};
let activeCat = 'todo';

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
  if(!list.length){
    grid.innerHTML = `<div class="empty-grid"><b>Sin resultados</b>Prueba con otra familia o término de búsqueda.</div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <article class="product">
      ${p.tag ? `<span class="product-tag ${p.tag}">${p.tag==='oferta'?'Oferta':p.tag==='nuevo'?'Novedad':'Más vendido'}</span>`:''}
      <div class="product-thumb" style="background:${TINTS[p.cat]}">${ART[p.art]}</div>
      <div class="product-body">
        <h3>${p.name}</h3>
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
  const q = $('#searchInput').value.trim().toLowerCase();
  if(activeCat !== 'todo') list = list.filter(p => p.cat === activeCat);
  if(q) list = list.filter(p => (p.name+' '+p.meta+' '+p.cat).toLowerCase().includes(q));
  const note = $('#resultNote');
  if(q) note.textContent = `${list.length} resultado${list.length!==1?'s':''} para «${$('#searchInput').value.trim()}».`;
  else if(activeCat==='todo') note.textContent = 'Lo que más sale del obrador esta semana.';
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
function addToCart(id){
  cart[id] = (cart[id]||0) + 1;
  const p = PRODUCTS.find(x => x.id === id);
  showToast(`${p.name} · añadido`);
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
    const p = PRODUCTS.find(x => x.id == id);
    const q = cart[id]; total += p.price * q;
    return `<div class="ci">
      <span class="ci-art" style="background:${TINTS[p.cat]}">${ART[p.art]}</span>
      <div class="ci-info"><b>${p.name}</b><span>${eur(p.price*q)}</span></div>
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
  // añadir al carrito
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if(add){ addToCart(+add.dataset.add); return; }

    const q = e.target.closest('[data-q]');
    if(q){ changeQty(+q.dataset.id, +q.dataset.q); return; }

    const filter = e.target.closest('[data-filter]');
    if(filter){
      e.preventDefault();
      setCat(filter.dataset.filter);
      $('#tienda').scrollIntoView({behavior:'smooth'});
      return;
    }
  });

  $('#cartBtn').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  $('#scrim').addEventListener('click', closeCart);
  $('#checkoutBtn').addEventListener('click', () => {
    if(!Object.keys(cart).length){ showToast('Tu carrito está vacío'); return; }
    cart = {}; updateCart(); closeCart(); showToast('Pedido de prueba realizado · ¡gracias!');
  });

  // búsqueda
  $('#searchBtn').addEventListener('click', () => {
    const w = $('#searchWrap');
    w.classList.toggle('open');
    if(w.classList.contains('open')) $('#searchInput').focus();
  });
  $('#searchInput').addEventListener('input', refresh);

  // menú móvil (lleva al catálogo)
  $('#menuBtn').addEventListener('click', () => $('#categorias').scrollIntoView({behavior:'smooth'}));

  // newsletter
  $('#newsForm').addEventListener('submit', e => {
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
  renderCategories();
  renderFilters();
  renderEvents();
  renderChips();
  refresh();
  updateCart();
  bindEvents();
  initReveal();
});
