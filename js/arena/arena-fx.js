/* Arena Liquid Glass · haptic feedback ringan (tanpa animasi berat) */
(function () {
  if (window.__punkGlassFx) return;
  window.__punkGlassFx = true;

  var tg = window.Telegram && window.Telegram.WebApp;

  function tick(kind) {
    try {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(kind || 'light');
    } catch (_) {}
  }

  document.addEventListener('click', function (e) {
    if (!document.documentElement.classList.contains('lg')) return;
    var t = e.target && e.target.closest && e.target.closest('.tab, .pill[data-act^="ar-claim"], .pill[data-act="ar-shield-open"]');
    if (!t || t.disabled) return;
    tick('light');
  });

  window.ArenaFX = { burst: function () {} };
})();
