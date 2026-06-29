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
  const ymd = d => d.toISOString().slice(0, 10);
  const fechaCorta = iso => new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
  const num = n => (Number(n) || 0).toLocaleString('es-ES');
  // Euro compacto para el eje (1234 -> "1,2k", 90 -> "90").
  const eurCorto = v => {
    v = Number(v) || 0;
    if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',') + 'k';
    return String(Math.round(v));
  };

  /* Gráfico de barras (ingresos por día) como SVG responsivo: escala al
     ancho del contenedor con viewBox, sin scrollbars ni recortes. Rejilla
     y eje Y con 3 marcas; las etiquetas del eje X se ralean si hay muchos
     días y se inclinan para no solaparse. */
  function chartBarrasSVG(datos) {
    const W = 760, H = 240, padL = 52, padR = 14, padT = 16, padB = 42;
    const cw = W - padL - padR, ch = H - padT - padB, n = datos.length;
    const maxv = datos.reduce((m, d) => Math.max(m, Number(d.ingresos) || 0), 0) || 1;
    const slot = cw / n, bw = Math.min(slot * 0.6, 44);
    const step = Math.max(1, Math.ceil(n / 12));
    const inclina = n > 10;

    const grid = [0, 0.5, 1].map(f => {
      const y = padT + ch - f * ch;
      return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="inf-grid"/>`
        + `<text x="${padL - 8}" y="${(y + 3).toFixed(1)}" class="inf-ytick" text-anchor="end">${eurCorto(maxv * f)}</text>`;
    }).join('');

    const bars = datos.map((d, i) => {
      const val = Number(d.ingresos) || 0;
      const bh = val > 0 ? Math.max(val / maxv * ch, 2) : 0;
      const x = padL + i * slot + (slot - bw) / 2;
      const y = padT + ch - bh;
      const cx = x + bw / 2, ly = H - padB + 16;
      const lbl = (i % step === 0 || i === n - 1)
        ? `<text x="${cx.toFixed(1)}" y="${ly}" class="inf-xtick" text-anchor="${inclina ? 'end' : 'middle'}"`
          + `${inclina ? ` transform="rotate(-40 ${cx.toFixed(1)} ${ly})"` : ''}>${fechaCorta(d.dia)}</text>`
        : '';
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" class="inf-rect">`
        + `<title>${fechaCorta(d.dia)}: ${eur(d.ingresos)} · margen ${eur(d.margen)}</title></rect>${lbl}`;
    }).join('');

    return `<svg class="inf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Ingresos por día">`
      + `${grid}<line x1="${padL}" y1="${padT + ch}" x2="${W - padR}" y2="${padT + ch}" class="inf-axis"/>${bars}</svg>`;
  }

  // Descarga una matriz [[...],[...]] como CSV (separador ; para Excel ES).
  function descargarCSV(nombre, filas) {
    const cont = filas.map(f => f.map(c => {
      const s = String(c == null ? '' : c);
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + cont], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

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
    else if (t === 'proveedores') renderProveedores();
    else if (t === 'compras') renderCompras();
    else renderInformes();
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
  let inventario = [], filtroProv = 'todos', mostrarAlta = false, buscarProd = '';

  // Muestra/oculta filas según el texto del buscador (sin re-renderizar).
  function aplicarBusqueda() {
    const q = buscarProd.trim().toLowerCase();
    let visibles = 0;
    document.querySelectorAll('.inv-row').forEach(r => {
      const ok = !q || r.textContent.toLowerCase().includes(q);
      r.style.display = ok ? '' : 'none';
      if (ok) visibles++;
    });
    const aviso = document.getElementById('invSinResultados');
    if (aviso) aviso.style.display = (q && visibles === 0) ? '' : 'none';
  }
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
      cont.innerHTML = `<div class="empty-state"><b>Sin productos</b>Ejecuta la migración del catálogo (db/inventario-1.sql) o crea uno nuevo.</div>`;
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
          <input id="prodSearch" class="inv-search" type="search" placeholder="Buscar producto…" value="${esc(buscarProd)}" aria-label="Buscar producto">
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
              <td class="inv-acciones">
                <button class="btn btn-primary inv-save" type="button">Guardar</button>
                <button class="inv-del" type="button" title="Eliminar producto" aria-label="Eliminar ${esc(p.nombre)}">Eliminar</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
      <p id="invSinResultados" class="empty-state" style="display:none">Sin productos que coincidan con la búsqueda.</p>`;
    aplicarBusqueda();
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

  /* ===================== INFORMES ===================== */
  // Periodo por defecto: últimos 30 días.
  let infDesde = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return ymd(d); })();
  let infHasta = ymd(new Date());
  let infDiario = [], infTop = [], infResumen = null;

  async function renderInformes() {
    cont.innerHTML = '<p style="color:var(--muted)">Cargando informes…</p>';
    [infResumen, infDiario, infTop] = await Promise.all([
      Auth.getInformeResumen(infDesde, infHasta),
      Auth.getInformeDiario(infDesde, infHasta),
      Auth.getInformeTop(infDesde, infHasta, 20),
    ]);
    const r = infResumen || { pedidos: 0, unidades: 0, ingresos: 0, coste: 0, margen: 0 };

    cont.innerHTML = `
      <div class="admin-toolbar">
        <div class="admin-filters inf-rango">
          <label class="inv-filter">Desde <input type="date" id="infDesde" value="${infDesde}" max="${infHasta}"></label>
          <label class="inv-filter">Hasta <input type="date" id="infHasta" value="${infHasta}" min="${infDesde}" max="${ymd(new Date())}"></label>
        </div>
        <button class="btn btn-ghost" id="infCSV" type="button">Exportar CSV</button>
      </div>

      <div class="inf-cards">
        <div class="inf-card"><span class="inf-k">Ingresos</span><b>${eur(r.ingresos)}</b></div>
        <div class="inf-card"><span class="inf-k">Margen</span><b>${eur(r.margen)}</b></div>
        <div class="inf-card"><span class="inf-k">Pedidos</span><b>${num(r.pedidos)}</b></div>
        <div class="inf-card"><span class="inf-k">Unidades</span><b>${num(r.unidades)}</b></div>
      </div>

      <h3 class="inf-h">Ventas por día</h3>
      ${infDiario.length ? `<div class="inf-chart">${chartBarrasSVG(infDiario)}</div>`
        : `<div class="empty-state">Sin ventas en este periodo.</div>`}

      <h3 class="inf-h">Más vendidos</h3>
      ${infTop.length ? `<div class="inv-wrap"><table class="inv-table">
        <thead><tr><th>Producto</th><th>Unidades</th><th>Ingresos</th><th>Margen</th></tr></thead>
        <tbody>${infTop.map(p => `<tr>
          <td>${esc(p.nombre || '—')}</td>
          <td>${num(p.unidades)}</td>
          <td>${eur(p.ingresos)}</td>
          <td>${eur(p.margen)}</td></tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty-state">Sin ventas en este periodo.</div>`}`;
  }

  function exportarInformeCSV() {
    const filas = [['Informe El Kiosquillo', `${infDesde} a ${infHasta}`], []];
    const r = infResumen || {};
    filas.push(['Resumen']);
    filas.push(['Ingresos', 'Margen', 'Coste', 'Pedidos', 'Unidades']);
    filas.push([r.ingresos || 0, r.margen || 0, r.coste || 0, r.pedidos || 0, r.unidades || 0]);
    filas.push([]);
    filas.push(['Ventas por día']);
    filas.push(['Día', 'Pedidos', 'Unidades', 'Ingresos', 'Margen']);
    infDiario.forEach(d => filas.push([d.dia, d.pedidos, d.unidades, d.ingresos, d.margen]));
    filas.push([]);
    filas.push(['Más vendidos']);
    filas.push(['Producto', 'Unidades', 'Ingresos', 'Margen']);
    infTop.forEach(p => filas.push([p.nombre, p.unidades, p.ingresos, p.margen]));
    descargarCSV(`informe-${infDesde}_${infHasta}.csv`, filas);
  }

  /* ===================== COMPRAS A PROVEEDOR ===================== */
  let compras = [], tramosAll = [];
  let nuevaCompra = false, compraProv = '', compraLineas = [], compraPortes = 0;

  // Tramos del proveedor seleccionado, ordenados por umbral.
  const tramosDe = pid => tramosAll.filter(t => String(t.proveedor_id) === String(pid))
    .sort((a, b) => a.umbral_eur - b.umbral_eur);
  // % de descuento aplicable a un subtotal según los tramos del proveedor.
  const dtoDe = (pid, subtotal) => tramosDe(pid).filter(t => Number(t.umbral_eur) <= subtotal)
    .reduce((m, t) => Math.max(m, Number(t.descuento_pct)), 0);
  // Lee las líneas actuales del DOM (cantidad y coste editables).
  function leerLineas() {
    return [...document.querySelectorAll('.cmp-linea')].map(r => ({
      product_id: +r.dataset.pid,
      cantidad: parseInt(r.querySelector('[data-f=cant]').value, 10) || 0,
      coste_bruto: parseFloat(r.querySelector('[data-f=bruto]').value) || 0,
    }));
  }
  function calcTotales() {
    const lineas = leerLineas();
    const subtotal = lineas.reduce((s, l) => s + l.cantidad * l.coste_bruto, 0);
    const dto = dtoDe(compraProv, subtotal);
    const portes = parseFloat((document.getElementById('cmpPortes') || {}).value) || 0;
    const total = subtotal * (1 - dto / 100) + portes;
    return { subtotal, dto, portes, total };
  }
  function pintarTotales() {
    const box = document.getElementById('cmpTotales');
    if (!box) return;
    const t = calcTotales();
    box.innerHTML = `
      <div class="tr"><span>Subtotal (bruto)</span><b>${eur(t.subtotal)}</b></div>
      <div class="tr"><span>Descuento proveedor</span><b>${t.dto ? '−' + t.dto + ' %' : '—'}</b></div>
      <div class="tr"><span>Portes</span><b>${eur(t.portes)}</b></div>
      <div class="tr grand"><span>Total estimado</span><b>${eur(t.total)}</b></div>`;
  }

  async function cargarCompras() {
    [compras, tramosAll] = await Promise.all([Auth.getCompras(), Auth.getTramos()]);
    await cargarInventario();
  }

  function formNuevaCompra() {
    const provs = proveedoresUnicos();
    const prods = compraProv ? inventario.filter(p => String(p.proveedor_id) === String(compraProv)) : [];
    const tramos = compraProv ? tramosDe(compraProv) : [];

    const filasLineas = compraLineas.map((l, i) => {
      const p = inventario.find(x => x.id === l.product_id) || {};
      return `<tr class="cmp-linea" data-pid="${l.product_id}">
        <td>${esc(p.nombre || '—')}</td>
        <td><input data-f="cant" type="number" min="1" value="${l.cantidad || ''}" style="width:80px"></td>
        <td><input data-f="bruto" type="number" step="0.0001" value="${l.coste_bruto != null ? l.coste_bruto : ''}" style="width:90px"></td>
        <td><button class="muted-link cmp-quita" data-i="${i}" type="button">Quitar</button></td>
      </tr>`;
    }).join('');

    const opcionesProd = prods
      .filter(p => !compraLineas.some(l => l.product_id === p.id))
      .map(p => `<option value="${p.id}">${esc(p.nombre)} · coste ${eur(p.precio_coste)}</option>`).join('');

    return `<div class="panel-card cmp-form">
      <div class="cmp-row">
        <label class="inv-filter">Proveedor:
          <select id="cmpProv">
            <option value="">— Elige —</option>
            ${provs.map(([id, nom]) => `<option value="${id}"${String(compraProv) === String(id) ? ' selected' : ''}>${esc(nom)}</option>`).join('')}
          </select>
        </label>
      </div>

      ${compraProv ? `
        <div class="cmp-tramos">
          <h4>Tramos de descuento de este proveedor</h4>
          ${tramos.length ? `<ul class="cmp-tramos-list">${tramos.map(t =>
            `<li>≥ ${eur(t.umbral_eur)} → ${Number(t.descuento_pct)} %
              <button class="muted-link cmp-del-tramo" data-id="${t.id}" type="button">✕</button></li>`).join('')}</ul>`
            : '<p class="cmp-empty">Sin tramos. Sin descuento por volumen.</p>'}
          <div class="cmp-tramo-add">
            <input id="cmpUmbral" type="number" step="0.01" placeholder="Umbral € (p. ej. 200)" style="width:170px">
            <input id="cmpPct" type="number" step="0.01" placeholder="% (p. ej. 10)" style="width:120px">
            <button class="btn btn-ghost" id="cmpAddTramo" type="button">Añadir tramo</button>
          </div>
        </div>

        <table class="inv-table cmp-lineas-tabla">
          <thead><tr><th>Producto</th><th>Cantidad</th><th>Coste bruto/ud</th><th></th></tr></thead>
          <tbody>${filasLineas || '<tr><td colspan="4" class="cmp-empty">Añade productos al pedido.</td></tr>'}</tbody>
        </table>
        <div class="cmp-add-linea">
          <select id="cmpProd">${opcionesProd || '<option value="">(no quedan productos)</option>'}</select>
          <button class="btn btn-ghost" id="cmpAddLinea" type="button">+ Añadir línea</button>
        </div>

        <div class="cmp-pie">
          <label class="inv-filter">Portes (€): <input id="cmpPortes" type="number" step="0.01" value="${compraPortes || ''}" style="width:110px"></label>
          <div class="order-totals" id="cmpTotales"></div>
        </div>

        <div class="cmp-acciones">
          <button class="btn btn-primary" id="cmpCrear" type="button">Crear pedido (borrador)</button>
          <button class="muted-link" id="cmpCancelarForm" type="button">Cancelar</button>
        </div>
      ` : '<p class="cmp-empty">Elige un proveedor para empezar el pedido.</p>'}
    </div>`;
  }

  function badgeCompra(estado) {
    const m = { borrador: 'gris', recibido: 'verde', cancelado: 'rojo' };
    return `<span class="badge ${m[estado] || 'gris'}">${estado}</span>`;
  }

  async function renderCompras() {
    cont.innerHTML = '<p style="color:var(--muted)">Cargando compras…</p>';
    await cargarCompras();
    cont.innerHTML = `
      <div class="admin-toolbar">
        <h3 class="inf-h" style="margin:0">Pedidos de compra</h3>
        <button class="btn btn-ghost" id="cmpNuevo" type="button">${nuevaCompra ? 'Cerrar' : '+ Nuevo pedido de compra'}</button>
      </div>
      ${nuevaCompra ? formNuevaCompra() : ''}
      ${compras.length ? `<div class="order-list">${compras.map(c => `
        <div class="order-card admin-card" data-cid="${c.id}">
          <div class="o-main"><b>${esc(c.numero)}</b>
            <small>${fechaHora(c.created_at)} · ${esc(c.proveedor || 'Sin proveedor')} · ${c.lineas} línea${c.lineas !== 1 ? 's' : ''}${c.descuento_pct ? ` · −${Number(c.descuento_pct)}%` : ''} · ${eur(c.total)}</small></div>
          <div class="admin-actions">${badgeCompra(c.estado)}
            ${c.estado === 'borrador'
              ? `<button class="btn btn-primary cmp-recibir" type="button">Recibir</button>
                 <button class="inv-del cmp-borrar" type="button">Borrar</button>`
              : c.recibido_at ? `<small class="muted-link" style="cursor:default">recibido ${fechaHora(c.recibido_at)}</small>` : ''}
          </div>
        </div>`).join('')}</div>`
        : (nuevaCompra ? '' : '<div class="empty-state"><b>Sin pedidos de compra</b>Crea uno para reponer stock.</div>')}`;
    if (nuevaCompra && compraProv) pintarTotales();
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
    const invDel = e.target.closest('.inv-del');
    if (invDel) {
      const row = invDel.closest('.inv-row'); const id = +row.dataset.id;
      const nombre = row.querySelector('td')?.textContent || 'este producto';
      if (!confirm(`¿Eliminar "${nombre.trim()}"? Esta acción no se puede deshacer.`)) return;
      invDel.disabled = true;
      const res = await Auth.eliminarProducto(id);
      invDel.disabled = false;
      if (!res.ok) { alert(res.error); return; }
      inventario = []; renderProductos();
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

    // --- Informes ---
    if (e.target.id === 'infCSV') { exportarInformeCSV(); return; }

    // --- Compras ---
    if (e.target.id === 'cmpNuevo') {
      nuevaCompra = !nuevaCompra;
      if (!nuevaCompra) { compraProv = ''; compraLineas = []; compraPortes = 0; }
      renderCompras(); return;
    }
    if (e.target.id === 'cmpCancelarForm') {
      nuevaCompra = false; compraProv = ''; compraLineas = []; compraPortes = 0; renderCompras(); return;
    }
    if (e.target.id === 'cmpAddLinea') {
      const sel = document.getElementById('cmpProd'); const pid = +(sel && sel.value);
      if (!pid) return;
      const p = inventario.find(x => x.id === pid) || {};
      compraLineas = leerLineas();                 // conserva lo ya escrito
      compraPortes = (calcTotales().portes) || 0;
      compraLineas.push({ product_id: pid, cantidad: 1, coste_bruto: Number(p.precio_coste) || 0 });
      renderCompras(); return;
    }
    const quita = e.target.closest('.cmp-quita');
    if (quita) {
      compraPortes = (calcTotales().portes) || 0;
      compraLineas = leerLineas(); compraLineas.splice(+quita.dataset.i, 1);
      renderCompras(); return;
    }
    if (e.target.id === 'cmpAddTramo') {
      const u = parseFloat((document.getElementById('cmpUmbral') || {}).value);
      const pct = parseFloat((document.getElementById('cmpPct') || {}).value);
      if (!(u >= 0) || !(pct >= 0)) { alert('Indica un umbral y un % válidos.'); return; }
      const res = await Auth.crearTramo(+compraProv, u, pct);
      if (!res.ok) { alert('Error: ' + res.error); return; }
      compraLineas = leerLineas(); compraPortes = (calcTotales().portes) || 0;
      tramosAll = await Auth.getTramos(); renderCompras(); return;
    }
    const delT = e.target.closest('.cmp-del-tramo');
    if (delT) {
      const res = await Auth.eliminarTramo(+delT.dataset.id);
      if (!res.ok) { alert('Error: ' + res.error); return; }
      compraLineas = leerLineas(); compraPortes = (calcTotales().portes) || 0;
      tramosAll = await Auth.getTramos(); renderCompras(); return;
    }
    if (e.target.id === 'cmpCrear') {
      const lineas = leerLineas().filter(l => l.product_id && l.cantidad > 0);
      if (!lineas.length) { alert('Añade al menos una línea con cantidad.'); return; }
      const portes = calcTotales().portes;
      e.target.disabled = true; e.target.textContent = 'Creando…';
      const res = await Auth.crearCompra(+compraProv, lineas, portes, null);
      if (!res.ok) { e.target.disabled = false; e.target.textContent = 'Crear pedido (borrador)'; alert('Error: ' + res.error); return; }
      nuevaCompra = false; compraProv = ''; compraLineas = []; compraPortes = 0;
      renderCompras(); return;
    }
    const recibir = e.target.closest('.cmp-recibir');
    if (recibir) {
      const id = recibir.closest('.admin-card').dataset.cid;
      if (!confirm('¿Recibir la mercancía? Se sumará al stock y se recalculará el coste medio. No se puede deshacer.')) return;
      recibir.disabled = true; recibir.textContent = 'Recibiendo…';
      const res = await Auth.recibirCompra(id);
      if (!res.ok) { recibir.disabled = false; recibir.textContent = 'Recibir'; alert('Error: ' + res.error); return; }
      inventario = []; renderCompras(); return;       // refresca costes/stock
    }
    const borrar = e.target.closest('.cmp-borrar');
    if (borrar) {
      const id = borrar.closest('.admin-card').dataset.cid;
      if (!confirm('¿Borrar este pedido de compra en borrador?')) return;
      const res = await Auth.cancelarCompra(id);
      if (!res.ok) { alert('Error: ' + res.error); return; }
      renderCompras(); return;
    }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'provFilter') { filtroProv = e.target.value; renderProductos(); }
    if (e.target.id === 'infDesde') { infDesde = e.target.value; if (infDesde > infHasta) infHasta = infDesde; renderInformes(); }
    if (e.target.id === 'infHasta') { infHasta = e.target.value; if (infHasta < infDesde) infDesde = infHasta; renderInformes(); }
    if (e.target.id === 'cmpProv') { compraProv = e.target.value; compraLineas = []; compraPortes = 0; renderCompras(); }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'prodSearch') { buscarProd = e.target.value; aplicarBusqueda(); }
    // Recalcula los totales del pedido de compra sin re-renderizar (no pierde el foco).
    if (e.target.matches('.cmp-linea [data-f], #cmpPortes')) pintarTotales();
  });

  // arranque
  renderPedidos();
})();
