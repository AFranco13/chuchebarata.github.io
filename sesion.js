/* =========================================================
   El Kiosquillo — sesion.js
   Pinta el control de cuenta en la cabecera según haya o no
   sesión iniciada. Se carga en todas las páginas. Requiere auth.js.
   ========================================================= */

(function () {
  'use strict';

  const userIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  async function render() {
    const tools = document.querySelector('.header-tools');
    if (!tools || !window.Auth) return;

    // Evitar duplicados si el script corre dos veces.
    const old = tools.querySelector('.account');
    if (old) old.remove();

    const user = await Auth.getCurrentUser();
    const wrap = document.createElement('div');
    wrap.className = 'account';

    if (!user) {
      wrap.innerHTML = `
        <a class="tool account-trigger" href="login.html" aria-label="Acceder a mi cuenta">${userIcon}</a>`;
    } else {
      const nombreCorto = (user.nombre || '').split(' ')[0] || 'Mi cuenta';
      const iniciales = (user.nombre || 'U').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
      wrap.innerHTML = `
        <button class="tool account-trigger" id="accountBtn" aria-label="Mi cuenta" aria-expanded="false">
          <span class="account-avatar">${iniciales}</span>
        </button>
        <div class="account-menu" id="accountMenu" role="menu">
          <div class="account-menu-head">
            <span class="account-avatar lg">${iniciales}</span>
            <div><b>${nombreCorto}</b><small>${user.email}</small></div>
          </div>
          <a href="perfil.html" role="menuitem">Mi perfil</a>
          <a href="perfil.html#pedidos" role="menuitem">Mis pedidos</a>
          ${user.isAdmin ? '<a href="admin.html" role="menuitem">Panel de administración</a>' : ''}
          <button type="button" id="logoutBtn" role="menuitem">Cerrar sesión</button>
        </div>`;
    }

    // Insertar antes del botón de menú móvil para mantener el orden visual.
    const menuBtn = tools.querySelector('.menu-toggle');
    if (menuBtn) tools.insertBefore(wrap, menuBtn);
    else tools.appendChild(wrap);

    const btn = wrap.querySelector('#accountBtn');
    const menu = wrap.querySelector('#accountMenu');
    if (btn && menu) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const open = menu.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', e => {
        if (!wrap.contains(e.target)) { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
      });
      const logout = wrap.querySelector('#logoutBtn');
      logout.addEventListener('click', async () => {
        await Auth.logout();
        location.href = 'index.html';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', render);
})();
