/* =========================================================
   El Kiosquillo — pedido.js
   Detalle de un pedido con línea de tiempo de seguimiento.
   Requiere auth.js.
   ========================================================= */

(function () {
  'use strict';

  const user = Auth.requireAuth();
  if (!user) return;

  const cont = document.getElementById('detail');
  const eur = n => (Number(n) || 0).toFixed(2).replace('.', ',') + ' €';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const fechaCorta = iso => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const fechaHora = iso => new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const id = new URLSearchParams(location.search).get('id');
  const order = id ? Auth.getOrder(id) : null;

  if (!order) {
    cont.innerHTML = `<div class="empty-state">
      <b>Pedido no encontrado</b>
      Puede que el enlace no sea correcto o que el pedido no exista.
      <div style="margin-top:16px"><a class="btn btn-primary" href="perfil.html#pedidos">Ver mis pedidos</a></div>
    </div>`;
    return;
  }

  const e = Auth.estados[order.estado] || { label: order.estado, tono: 'gris' };

  /* ---- línea de tiempo ---- */
  const steps = Auth.getTrackingSteps(order);
  const trackingHTML = steps.map(s => {
    const cls = s.actual ? 'now' : s.alcanzado ? 'done' : 'pending';
    // Busca la fecha real del evento si existe en el historial.
    const ev = (order.tracking || []).find(t => t.estado === s.estado);
    return `<li class="${cls}">
      <span class="dot"></span>
      <div class="t-label">${esc(s.label)}</div>
      ${ev ? `<div class="t-desc">${esc(ev.descripcion)}</div><div class="t-date">${fechaHora(ev.fecha)}</div>` : ''}
    </li>`;
  }).join('');

  /* ---- artículos ---- */
  const itemsHTML = order.items.map(i => `
    <div class="oi-row">
      <span class="oi-art" style="background:${esc(i.tint || 'var(--blush)')}">
        ${i.img ? `<img src="${esc(i.img)}" alt="${esc(i.nombre)}">` : ''}
      </span>
      <div class="oi-info">
        <b>${esc(i.nombre)}</b>
        <small>${i.cantidad} × ${eur(i.precio)}</small>
      </div>
      <span class="oi-price">${eur(i.precio * i.cantidad)}</span>
    </div>`).join('');

  /* ---- dirección ---- */
  const d = order.direccion || {};
  const dirHTML = [d.nombre, d.linea1, d.linea2, [d.cp, d.ciudad].filter(Boolean).join(' '), d.provincia, d.telefono]
    .filter(Boolean).map(esc).join('<br>') || 'No se indicó dirección.';

  cont.innerHTML = `
    <a class="back-link" href="perfil.html#pedidos">← Volver a mis pedidos</a>

    <div class="order-detail-head">
      <div>
        <h1>Pedido ${esc(order.numero)}</h1>
        <p>Realizado el ${fechaCorta(order.createdAt)}</p>
      </div>
      <span class="badge ${e.tono}">${esc(e.label)}</span>
    </div>

    <div class="tracking">
      <h2>Seguimiento del envío</h2>
      <ul class="timeline">${trackingHTML}</ul>
    </div>

    <div class="order-items">
      <h2>Productos</h2>
      ${itemsHTML}
      <div class="order-totals">
        <div class="tr"><span>Subtotal</span><span>${eur(order.subtotal)}</span></div>
        <div class="tr"><span>Envío</span><span>${order.envio > 0 ? eur(order.envio) : 'Gratis'}</span></div>
        <div class="tr grand"><span>Total · IVA incl.</span><span>${eur(order.total)}</span></div>
      </div>
    </div>

    <div class="addr-box">
      <h2>Dirección de entrega</h2>
      <p>${dirHTML}</p>
    </div>`;
})();
