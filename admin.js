/* =========================================================
   El Kiosquillo — admin.js
   Panel de administración: Pedidos, Productos y Proveedores.
   Solo accesible para usuarios con is_admin = true.
   ========================================================= */

(async function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const cont = $('#adminContent');
  const eur = n => (Number(n) || 0).toFixed(2).replace('.', ',') + ' €';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const fechaHora = iso => new Date(iso).toLocaleString('es-ES', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const FLOW = ['confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'];

  const user = await Auth.requireAuth('admin.html');
  if (!user) return;
  if (!user.isAdmin) {
    cont.innerHTML = `<div class="empty-state">
      <b>Acceso restringido</b>
      Esta página es solo para administradores.
      <div style="margin-top:16px"><a class="btn btn-primary" href="index.html">Volver a la tienda</a></div>
    </div>`;
    return;
  }

  // ---- navegación por pestañas ----
  const tabs = document.querySelectorAll('#adminTabs button');
  $('#adminTabs').style.display = 'flex';
  let tab = 'pedidos';
  function showTab(t) {
    tab = t;
    tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    if (t === 'pedidos') renderPedidos();
    else if (t === 'productos') renderProductos();
    else renderProveedores();
  }
  tabs.forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  /* ===================== PEDIDOS ===================== */
  let pedidos = [], filtroPedido = 'todos';
  function badge(estado) {
    const e = Auth.estados[estado] || { label: estado, tono: 'gris' };
    return `<span class="badge ${e.tono}">${e.label}</span>`;
  }
  async function renderPedidos() {
    cont.innerHTML = '<p style="color:var(--muted)">Cargando pedidos…</p>';
    pedidos = await Auth.getAllOrders();
    const counts = pedidos.reduce((m, o) => (m[o.estado] = (m[o.estado]||0)+1, m), {});
    const filtros = [['todos','Todos',pedidos.length]]
      .concat(FLOW.map(e => [e, (Auth.estados[e]||{}).label||e, counts[e]||0]));
    const list = filtroPedido === 'todos' ? pedidos : pedidos.filter(o => o.estado === filtroPedido);
    cont.innerHTML = `
      <div class="admin-toolbar">
        <div class="admin-filters">${filtros.map(([id,l,n]) =>
          `<button class="filter${filtroPedido===id?' active':''}" data-pf="${id}">${l} (${n})</button>`).join('')}</div>
        <button class="btn btn-ghost" id="pedRefresh" type="button">Actualizar</button>
      </div>
      ${list.length ? `<div class="order-list">${list.map(o => {
        const cliente = (o.direccion && o.direccion.nombre) || 'Cliente';
        const arts = o.items.reduce((s,i)=>s+i.cantidad,0);
        const opts = FLOW.map(e => `<option value="${e}"${o.estado===e?' selected':''}>${(Auth.estados[e]||{}).label||e}</option>`).join('');
        return `<div class="order-card admin-card" data-id="${o.id}">
          <div class="o-main"><b>${esc(o.numero||'Pedido')}</b>
            <small>${fechaHora(o.createdAt)} · ${esc(cliente)} · ${arts} art. · ${eur(o.total)}</small></div>
          <div class="admin-actions">${badge(o.estado)}
            <select class="admin-select">${opts}</select>
            <button class="btn btn-primary admin-save" type="button">Guardar</button>
            <a class="muted-link" href="pedido.html?id=${o.id}" target="_blank" rel="noopener">Ver</a>
          </div></div>`;
      }).join('')}</div>` : `<div class="empty-state"><b>Sin pedidos</b>No hay pedidos en este estado.</div>`}`;
  }

  /* ===================== PRODUCTOS ===================== */
  let inventario = [], filtroProv = 'todos', mostrarAlta = false;
  async function cargarInventario() {
    if (!inventario.length) inventario = await Auth.getInventario();
    return inventario;
  }
  function proveedoresUnicos() {
    const m = new Map();
    inventario.forEach(p => { if (p.proveedor) m.set(p.proveedor_id, p.proveedor); });
    return [...m.entries()];
  }
  async function renderProductos() {
    cont.innerHTML = '<p style="color:var(--muted)">Cargando productos…</p>';
    await cargarInventario();
    if (!inventario.length) {
      cont.innerHTML = `<div class="empty-state"><b>Sin productos</b>Ejecuta la migración del catálogo (inventario-1.sql) o crea uno nuevo.</div>`;
      return;
    }
    const provs = proveedoresUnicos();
    const lista = filtroProv === 'todos' ? inventario : inventario.filter(p => String(p.proveedor_id) === String(filtroProv));

    const filaAlta = mostrarAlta ? `
      <tr class="inv-alta">
        <td><input id="na-nombre" placeholder="Nombre"></td>
        <td><input id="na-cat" placeholder="categoría" style="width:90px"></td>
        <td><input id="na-stock" type="number" value="0" style="width:64px"></td>
        <td><input id="na-coste" type="number" step="0.01" placeholder="0,00" style="width:74px"></td>
        <td><input id="na-precio" type="number" step="0.01" placeholder="0,00" style="width:74px"></td>
        <td></td>
        <td colspan="2"><button class="btn btn-primary" id="naSave" type="button">Crear</button>
          <button class="muted-link" id="naCancel" type="button">Cancelar</button></td>
      </tr>` : '';

    cont.innerHTML = `
      <div class="admin-toolbar">
        <div class="admin-filters">
          <label class="inv-filter">Proveedor:
            <select id="provFilter">
              <option value="todos"${filtroProv==='todos'?' selected':''}>Todos (${inventario.length})</option>
              ${provs.map(([id,nom]) => `<option value="${id}"${String(filtroProv)===String(id)?' selected':''}>${esc(nom)}</option>`).join('')}
            </select>
          </label>
        </div>
        <button class="btn btn-ghost" id="nuevoProd" type="button">+ Nuevo producto</button>
      </div>
      <div class="inv-wrap"><table class="inv-table">
        <thead><tr><th>Producto</th><th>Proveedor</th><th>Stock</th><th>Coste</th><th>Precio</th><th>Margen</th><th>Activo</th><th></th></tr></thead>
        <tbody>
          ${filaAlta}
          ${lista.map(p => {
            const bajo = p.stock <= (p.stock_minimo || 0);
            return `<tr class="inv-row" data-id="${p.id}">
              <td>${esc(p.nombre)}<small class="inv-sku">${esc(p.sku||'')}</small></td>
              <td>${esc(p.proveedor || '—')}</td>
              <td><input class="inv-in" data-f="stock" type="number" value="${p.stock}" style="width:64px">${bajo?' <span class="inv-bajo" title="Stock bajo">⚠</span>':''}</td>
              <td><input class="inv-in" data-f="precio_coste" type="number" step="0.01" value="${Number(p.precio_coste).toFixed(2)}" style="width:74px"></td>
              <td><input class="inv-in" data-f="precio" type="number" step="0.01" value="${Number(p.precio).toFixed(2)}" style="width:74px"></td>
              <td>${eur(p.margen_eur)}</td>
              <td style="text-align:center"><input class="inv-in" data-f="activo" type="checkbox" ${p.activo?'checked':''}></td>
              <td><button class="btn btn-primary inv-save" type="button">Guardar</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
  }

  /* ===================== PROVEEDORES ===================== */
  async function renderProveedores() {
    cont.innerHTML = '<p style="color:var(--muted)">Cargando proveedores…</p>';
    await cargarInventario();
    const agg = new Map();
    inventario.forEach(p => {
      const k = p.proveedor_id || 0;
      const a = agg.get(k) || { id: p.proveedor_id, nombre: p.proveedor || 'Sin proveedor', n: 0, valor: 0, plazo: p.plazo_entrega_dias };
      a.n += 1; a.valor += (Number(p.precio_coste)||0) * (p.stock||0);
      agg.set(k, a);
    });
    const provs = [...agg.values()].sort((a,b) => b.n - a.n);
    cont.innerHTML = `<div class="order-list">${provs.map(p => `
      <button class="order-card admin-prov" data-prov="${p.id||''}" type="button" style="text-align:left;cursor:pointer">
        <div class="o-main"><b>${esc(p.nombre)}</b>
          <small>${p.n} producto${p.n!==1?'s':''} · valor stock ${eur(p.valor)}${p.plazo?` · plazo ${p.plazo} días`:''}</small></div>
        <span class="o-total">→</span>
      </button>`).join('')}</div>`;
  }

  /* ===================== EVENTOS (delegación) ===================== */
  document.addEventListener('click', async e => {
    // --- Pedidos ---
    const pf = e.target.closest('[data-pf]');
    if (pf) { filtroPedido = pf.dataset.pf; renderPedidos(); return; }
    if (e.target.id === 'pedRefresh') { pedidos = []; renderPedidos(); return; }
    const save = e.target.closest('.admin-save');
    if (save) {
      const card = save.closest('.admin-card'); const id = card.dataset.id;
      const estado = card.querySelector('.admin-select').value;
      save.disabled = true; save.textContent = 'Guardando…';
      const res = await Auth.updateOrderStatus(id, estado);
      save.disabled = false; save.textContent = 'Guardar';
      if (!res.ok) { alert('Error: ' + res.error); return; }
      const o = pedidos.find(x => x.id === id); if (o) o.estado = estado;
      renderPedidos();
      return;
    }

    // --- Productos ---
    if (e.target.id === 'nuevoProd') { mostrarAlta = true; renderProductos(); return; }
    if (e.target.id === 'naCancel') { mostrarAlta = false; renderProductos(); return; }
    if (e.target.id === 'naSave') {
      const res = await Auth.crearProducto({
        nombre: $('#na-nombre').value.trim(),
        categoria: $('#na-cat').value.trim(),
        stock: $('#na-stock').value, precio_coste: $('#na-coste').value, precio: $('#na-precio').value,
      });
      if (!res.ok) { alert('Error: ' + res.error); return; }
      mostrarAlta = false; inventario = []; renderProductos();
      return;
    }
    const invSave = e.target.closest('.inv-save');
    if (invSave) {
      const row = invSave.closest('.inv-row'); const id = +row.dataset.id;
      const cambios = {};
      row.querySelectorAll('.inv-in').forEach(i => {
        cambios[i.dataset.f] = i.type === 'checkbox' ? i.checked : i.value;
      });
      invSave.disabled = true; invSave.textContent = 'Guardando…';
      const res = await Auth.actualizarProducto(id, cambios);
      invSave.disabled = false; invSave.textContent = 'Guardar';
      if (!res.ok) { alert('Error: ' + res.error); return; }
      inventario = []; await cargarInventario();
      const upd = inventario.find(p => p.id === id);
      if (upd) { row.querySelector('td:nth-child(6)').textContent = eur(upd.margen_eur); }
      return;
    }

    // --- Proveedores ---
    const prov = e.target.closest('.admin-prov');
    if (prov) { filtroProv = prov.dataset.prov || 'todos'; showTab('productos'); return; }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'provFilter') { filtroProv = e.target.value; renderProductos(); }
  });

  // arranque
  renderPedidos();
})();
