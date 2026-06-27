/* =========================================================
   El Kiosquillo — admin.js
   Panel de administración: lista todos los pedidos y permite
   cambiar su estado, lo que actualiza el seguimiento del cliente.
   Solo accesible para usuarios con is_admin = true.
   ========================================================= */

(async function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const cont = $('#adminContent');
  const eur = n => (Number(n) || 0).toFixed(2).replace('.', ',') + ' €';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const fechaHora = iso => new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const FLOW = ['confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'];

  // Exige sesión y rol de administrador.
  const user = await Auth.requireAuth('admin.html');
  if (!user) return;
  if (!user.isAdmin) {
    cont.innerHTML = `<div class="empty-state">
      <b>Acceso restringido</b>
      Esta página es solo para administradores. Si crees que es un error, contacta con el responsable de la tienda.
      <div style="margin-top:16px"><a class="btn btn-primary" href="index.html">Volver a la tienda</a></div>
    </div>`;
    return;
  }

  let allOrders = [];
  let filtro = 'todos';

  function badge(estado) {
    const e = Auth.estados[estado] || { label: estado, tono: 'gris' };
    return `<span class="badge ${e.tono}">${e.label}</span>`;
  }

  function renderFilters() {
    const counts = allOrders.reduce((m, o) => (m[o.estado] = (m[o.estado] || 0) + 1, m), {});
    const opts = [['todos', 'Todos', allOrders.length]]
      .concat(FLOW.map(e => [e, (Auth.estados[e] || {}).label || e, counts[e] || 0]));
    $('#adminFilters').innerHTML = opts.map(([id, label, n]) =>
      `<button class="filter${filtro === id ? ' active' : ''}" data-f="${id}">${label} (${n})</button>`).join('');
  }

  function renderOrders() {
    const list = filtro === 'todos' ? allOrders : allOrders.filter(o => o.estado === filtro);
    if (!list.length) {
      cont.innerHTML = `<div class="empty-state"><b>Sin pedidos</b>No hay pedidos en este estado.</div>`;
      return;
    }
    cont.innerHTML = `<div class="order-list">${list.map(o => {
      const cliente = (o.direccion && o.direccion.nombre) || 'Cliente';
      const arts = o.items.reduce((s, i) => s + i.cantidad, 0);
      const options = FLOW.map(e =>
        `<option value="${e}"${o.estado === e ? ' selected' : ''}>${(Auth.estados[e] || {}).label || e}</option>`).join('');
      return `<div class="order-card admin-card" data-id="${o.id}">
        <div class="o-main">
          <b>${esc(o.numero || 'Pedido')}</b>
          <small>${fechaHora(o.createdAt)} · ${esc(cliente)} · ${arts} art. · ${eur(o.total)}</small>
        </div>
        <div class="admin-actions">
          ${badge(o.estado)}
          <select class="admin-select" aria-label="Cambiar estado">${options}</select>
          <button class="btn btn-primary admin-save" type="button">Guardar</button>
          <a class="muted-link" href="pedido.html?id=${o.id}" target="_blank" rel="noopener">Ver</a>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  async function load() {
    cont.innerHTML = '<p style="color:var(--muted)">Cargando pedidos…</p>';
    allOrders = await Auth.getAllOrders();
    $('#adminToolbar').style.display = 'flex';
    $('#adminSub').textContent = `${allOrders.length} pedido${allOrders.length !== 1 ? 's' : ''} en total.`;
    renderFilters();
    renderOrders();
  }

  // Delegación de eventos.
  document.addEventListener('click', async e => {
    const f = e.target.closest('[data-f]');
    if (f) { filtro = f.dataset.f; renderFilters(); renderOrders(); return; }

    if (e.target.id === 'refreshBtn') { load(); return; }

    const save = e.target.closest('.admin-save');
    if (save) {
      const card = save.closest('.admin-card');
      const id = card.dataset.id;
      const estado = card.querySelector('.admin-select').value;
      save.disabled = true;
      save.textContent = 'Guardando…';
      const res = await Auth.updateOrderStatus(id, estado);
      save.disabled = false;
      save.textContent = 'Guardar';
      if (!res.ok) { alert('Error: ' + res.error); return; }
      // Refresca el pedido en memoria y repinta.
      const o = allOrders.find(x => x.id === id);
      if (o) o.estado = estado;
      renderFilters();
      renderOrders();
    }
  });

  await load();
})();
