/* ==========================================================================
   admin-gate-link.js — ссылка "Админка" в шапке сразу спрашивает пароль
   (через window.prompt), а не открывает страницу и только потом гейт.
   Подключается после config.js (нужен ADMIN_PASSWORD) на index.html и book.html.
   ========================================================================== */

document.querySelectorAll('a.admin-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    if (sessionStorage.getItem('admin-authed') === '1') return; // уже входили в этой вкладке

    e.preventDefault();
    const pass = window.prompt('Пароль администратора:');
    if (pass === null) return; // отменили

    if (pass === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin-authed', '1');
      window.location.href = link.href;
    } else {
      window.alert('Неверный пароль');
    }
  });
});
