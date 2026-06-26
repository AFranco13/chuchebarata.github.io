/* =========================================================
   producto.js — página de detalle de producto
   Lee ?id=N de la URL y renderiza con datos de PRODUCTOS_DATA
   ========================================================= */

const cartIcon = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 7h14l-1.2 10.5a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 7a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

const TINTS_PD = {
  gominolas:'var(--t-gominolas)', nubes:'var(--t-nubes)', caramelos:'var(--t-caramelos)',
  chocolate:'var(--t-chocolate)', regaliz:'var(--t-regaliz)', chicles:'var(--t-chicles)',
  conos:'var(--t-conos)', decoracion:'var(--t-decoracion)',
};

let pdQty = 1;
let pdProduct = null;

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ── breadcrumb ───────────────────────────────────────────── */
function renderBreadcrumb(p) {
  $('#breadcrumb').innerHTML = `
    <a href="index.html">Inicio</a>
    <span class="sep">›</span>
    <a href="index.html#tienda" data-filter="${p.cat}">${p.cat_label}</a>
    <span class="sep">›</span>
    <span class="current">${p.nombre}</span>`;
}

/* ── imagen principal ─────────────────────────────────────── */
function thumbHTML(p) {
  const bg = TINTS_PD[p.cat] || 'var(--blush)';
  if (p.img_zoom) {
    return `<img src="${p.img_zoom}" alt="${p.nombre}" loading="lazy">`;
  }
  if (p.img) {
    return `<img src="${p.img}" alt="${p.nombre}" loading="lazy">`;
  }
  // fallback SVG ilustración
  return (typeof ART !== 'undefined' && ART[p.art]) ? ART[p.art] : '';
}

/* ── detalle principal ────────────────────────────────────── */
function renderDetail(p) {
  const bg = TINTS_PD[p.cat] || 'var(--blush)';
  const saveAmt = p.precio_comp - p.price;
  const savePct = Math.round((saveAmt / p.precio_comp) * 100);

  // Ficha técnica
  let featuresHTML = '';
  if (p.features && p.features.length) {
    featuresHTML = `
      <div class="pd-features">
        <h3 class="pd-section-title">Ficha técnica</h3>
        <table>
          ${p.features.map(f => `<tr><td>${f.label}</td><td>${f.value}</td></tr>`).join('')}
        </table>
      </div>`;
  }

  // Descripción
  let descHTML = '';
  if (p.descripcion_html || p.descripcion) {
    const body = p.descripcion_html
      ? `<div class="pd-description-body">${p.descripcion_html}</div>`
      : `<div class="pd-description-body"><p>${p.descripcion}</p></div>`;
    descHTML = `
      <div class="pd-description">
        <h3 class="pd-section-title">Descripción</h3>
        ${body}
      </div>`;
  }

  // Marca / referencia
  const metaItems = [];
  if (p.marca) metaItems.push(`<span>Marca: <strong>${p.marca}</strong></span>`);
  if (p.referencia) metaItems.push(`<span>Ref.: <strong>${p.referencia}</strong></span>`);
  metaItems.push(`<span>Stock: <strong>${p.en_stock ? 'Disponible' : 'Agotado'}</strong></span>`);
  const metaHTML = `<div class="pd-meta-row">${metaItems.join('')}</div>`;

  $('#pdMain').innerHTML = `
    <!-- Galería -->
    <div class="pd-gallery">
      <div class="pd-img-main" style="background:${bg}">
        ${thumbHTML(p)}
      </div>
      <div class="pd-badge-row">
        <span class="pd-badge stock">${p.en_stock ? 'En stock' : 'Agotado'}</span>
        ${p.marca ? `<span class="pd-badge">${p.marca}</span>` : ''}
        <span class="pd-badge">${p.cat_label}</span>
      </div>
    </div>

    <!-- Info -->
    <div class="pd-info">
      <p class="pd-cat-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        <a href="index.html#tienda">${p.cat_label}</a>
      </p>

      <h1 class="pd-title">${p.nombre}</h1>

      ${p.desc_short ? `<p class="pd-desc-short">${p.desc_short}</p>` : ''}

      <div class="pd-price-block">
        <span class="pd-price">${eur(p.price)}</span>
        ${p.precio_comp ? `<span class="pd-price-old">${eur(p.precio_comp)}</span>` : ''}
        ${saveAmt > 0 ? `<span class="pd-price-save">-${savePct}%</span>` : ''}
      </div>

      <div class="pd-actions">
        <div class="pd-qty">
          <button id="pdMinus" aria-label="Quitar uno">−</button>
          <span id="pdQtyDisplay">1</span>
          <button id="pdPlus" aria-label="Añadir uno">+</button>
        </div>
        <button class="btn btn-primary pd-add" id="pdAddBtn">
          ${cartIcon} Añadir al carrito
        </button>
      </div>

      ${featuresHTML}
      ${descHTML}
      ${metaHTML}
    </div>`;

  // Eventos de cantidad
  $('#pdMinus').addEventListener('click', () => {
    if (pdQty > 1) { pdQty--; $('#pdQtyDisplay').textContent = pdQty; }
  });
  $('#pdPlus').addEventListener('click', () => {
    pdQty++; $('#pdQtyDisplay').textContent = pdQty;
  });
  $('#pdAddBtn').addEventListener('click', () => {
    for (let i = 0; i < pdQty; i++) addToCart(p.id);
  });
}

/* ── productos relacionados ───────────────────────────────── */
function renderRelated(p) {
  const related = PRODUCTOS_DATA
    .filter(x => x.cat === p.cat && x.id !== p.id)
    .slice(0, 4);
  if (!related.length) return;

  const section = $('#relatedSection');
  section.style.display = '';

  const grid = $('#relatedGrid');
  grid.innerHTML = related.map(r => `
    <article class="product">
      <a href="producto.html?id=${r.id}" class="pd-card-link" style="display:contents">
        <div class="product-thumb" style="background:${TINTS_PD[r.cat] || 'var(--blush)'}">
          ${r.img ? `<img src="${r.img}" alt="${r.nombre}" loading="lazy">` : (typeof ART !== 'undefined' && ART[r.art] ? ART[r.art] : '')}
        </div>
        <div class="product-body">
          <h3>${r.nombre}</h3>
          <p class="meta">${r.desc_short || r.meta || ''}</p>
        </div>
      </a>
      <div class="product-foot" style="padding:0 17px 16px">
        <span class="price">${eur(r.price)}</span>
        <button class="add" data-add="${r.id}" aria-label="Añadir ${r.nombre}">${cartIcon}</button>
      </div>
    </article>`).join('');
}

/* ── meta SEO dinámico ────────────────────────────────────── */
function updateMeta(p) {
  document.title = `${p.nombre} · Chuchebarata`;
  const descEl = document.getElementById('pageDesc');
  if (descEl && p.desc_short) descEl.content = p.desc_short;
}

/* ── init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof PRODUCTOS_DATA === 'undefined') {
    $('#pdMain').innerHTML = '<div class="pd-skeleton">No se pudieron cargar los datos del producto.</div>';
    return;
  }

  const idParam = parseInt(getParam('id'), 10);
  const p = PRODUCTOS_DATA.find(x => x.id === idParam);

  if (!p) {
    $('#pdMain').innerHTML = `
      <div class="pd-skeleton">
        <b>Producto no encontrado.</b>
        <br><br><a href="index.html" class="btn btn-primary">Volver al catálogo</a>
      </div>`;
    return;
  }

  pdProduct = p;
  updateMeta(p);
  renderBreadcrumb(p);
  renderDetail(p);
  renderRelated(p);
});
