/* =========================================================
   El Kiosquillo — perfil.js
   Lógica de la página "Mi cuenta": pestañas, datos, dirección,
   seguridad, pedidos y derechos RGPD. Requiere auth.js.
   ========================================================= */

(function () {
  'use strict';

  // Exige sesión; si no hay, redirige a login y vuelve aquí.
  const user = Auth.requireAuth('perfil.html');
  if (!user) return;

  const $ = s => document.querySelector(s);
  const eur = n => (Number(n) || 0).toFixed(2).replace('.', ',') + ' €';
  const fecha = iso => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const iniciales = (user.nombre || 'U').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();

  /* ---------- cabecera ---------- */
  $('#avatar').textContent = iniciales;
  $('#hello').textContent = 'Hola, ' + (user.nombre.split(' ')[0] || '');
  $('#helloSub').textContent = user.email;

  /* ---------- pestañas ---------- */
  const tabs = document.querySelectorAll('.profile-tabs button');
  function showTab(name) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
  }
  tabs.forEach(t => t.addEventListener('click', () => {
    showTab(t.dataset.tab);
    history.replaceState(null, '', '#' + t.dataset.tab);
  }));
  if (location.hash) {
    const name = location.hash.slice(1);
    if (document.getElementById('tab-' + name)) showTab(name);
  }

  /* ---------- datos personales ---------- */
  $('#d-nombre').value = user.nombre || '';
  $('#d-email').value  = user.email  || '';
  $('#d-tel').value    = user.telefono || '';
  $('#d-marketing').checked = !!user.marketing;

  $('#datosForm').addEventListener('submit', e => {
    e.preventDefault();
    const res = Auth.updateProfile({
      nombre: $('#d-nombre').value.trim(),
      telefono: $('#d-tel').value.trim(),
      marketing: $('#d-marketing').checked,
    });
    flash('#datosMsg', res.ok ? 'Datos guardados correctamente.' : res.error, res.ok);
  });

  /* ---------- dirección ---------- */
  const dir = user.direccion || {};
  $('#a-linea1').value   = dir.linea1 || '';
  $('#a-linea2').value   = dir.linea2 || '';
  $('#a-cp').value       = dir.cp || '';
  $('#a-ciudad').value   = dir.ciudad || '';
  $('#a-provincia').value = dir.provincia || '';

  $('#dirForm').addEventListener('submit', e => {
    e.preventDefault();
    const res = Auth.updateProfile({
      direccion: {
        linea1: $('#a-linea1').value.trim(),
        linea2: $('#a-linea2').value.trim(),
        cp: $('#a-cp').value.trim(),
        ciudad: $('#a-ciudad').value.trim(),
        provincia: $('#a-provincia').value.trim(),
      },
    });
    flash('#dirMsg', res.ok ? 'Dirección guardada.' : res.error, res.ok);
  });

  /* ---------- seguridad ---------- */
  $('#segForm').addEventListener('submit', e => {
    e.preventDefault();
    const res = Auth.changePassword($('#s-actual').value, $('#s-nueva').value);
    flash('#segMsg', res.ok ? 'Contraseña actualizada.' : res.error, res.ok);
    if (res.ok) e.target.reset();
  });

  /* ---------- RGPD ---------- */
  $('#exportBtn').addEventListener('click', () => {
    const data = Auth.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mis-datos-elkiosquillo.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#deleteBtn').addEventListener('click', () => {
    if (!confirm('¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) return;
    if (!confirm('Confirmación final: se anonimizarán tus datos personales. ¿Continuar?')) return;
    const res = Auth.deleteAccount();
    if (res.ok) { alert('Tu cuenta ha sido eliminada. Sentimos verte marchar.'); location.href = 'index.html'; }
    else alert(res.error);
  });

  /* ---------- pedidos ---------- */
  function badge(estado) {
    const e = Auth.estados[estado] || { label: estado, tono: 'gris' };
    return `<span class="badge ${e.tono}">${e.label}</span>`;
  }
  function renderOrders() {
    const orders = Auth.getOrders();
    const cont = $('#orderList');
    if (!orders.length) {
      cont.innerHTML = `<div class="empty-state">
        <b>Aún no tienes pedidos</b>
        Cuando hagas tu primer pedido, aparecerá aquí con su seguimiento.
        <div style="margin-top:16px"><a class="btn btn-primary" href="index.html#tienda">Ir a la tienda</a></div>
      </div>`;
      return;
    }
    cont.innerHTML = orders.map(o => `
      <a class="order-card" href="pedido.html?id=${o.id}">
        <div class="o-main">
          <b>${o.numero}</b>
          <small>${fecha(o.createdAt)} · ${o.items.reduce((s, i) => s + i.cantidad, 0)} artículos</small>
        </div>
        <div class="o-side">
          ${badge(o.estado)}
          <span class="o-total">${eur(o.total)}</span>
        </div>
      </a>`).join('');
  }
  renderOrders();

  /* ---------- helper de mensajes ---------- */
  function flash(sel, text, ok) {
    const el = $(sel);
    el.textContent = text;
    el.classList.remove('ok', 'error');
    el.classList.add(ok ? 'ok' : 'error', 'show');
    setTimeout(() => el.classList.remove('show'), 3500);
  }
})();
