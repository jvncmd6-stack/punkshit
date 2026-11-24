/* Arena Liquid Glass · efek cahaya, haptic feedback, & confetti */
(function () {
  if (window.__punkGlassFx) return;
  window.__punkGlassFx = true;

  var tg = window.Telegram && window.Telegram.WebApp;
  function isArenaActive() {
    return document.documentElement.classList.contains('lg');
  }

  function tick(kind) {
    try {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(kind || 'light');
      else if (navigator.vibrate) navigator.vibrate(8);
    } catch (_) {}
  }

  var raf = 0;
  document.addEventListener('pointermove', function (e) {
    if (!isArenaActive() || raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var el = e.target.closest && e.target.closest('.grp, .card, .game-card');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }, { passive: true });

  document.addEventListener('pointerdown', function (e) {
    if (!isArenaActive()) return;
    var t = e.target.closest && e.target.closest('.btn, .pill, .tab, .game-card');
    if (!t || t.disabled) return;
    var el = t.closest('.game-card') || t;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    tick(t.classList.contains('game-card') ? 'medium' : 'light');
  }, { passive: true });

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BITS = ['✨', '⭐', '💖', '🫧', '💫'];

  function burst(x, y, n) {
    if (reduce || !document.body.animate) return;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('span');
      p.className = 'lg-spark';
      p.textContent = BITS[(Math.random() * BITS.length) | 0];
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      document.body.appendChild(p);
      var a = Math.random() * Math.PI * 2;
      var d = 38 + Math.random() * 52;
      p.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + Math.cos(a) * d + 'px), calc(-50% + ' + (Math.sin(a) * d - 18) + 'px)) scale(1.15) rotate(' + (Math.random() * 90 - 45) + 'deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(calc(-50% + ' + Math.cos(a) * d * 1.2 + 'px), calc(-50% + ' + (Math.sin(a) * d + 26) + 'px)) scale(.6)', opacity: 0 }
      ], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = (function (el) {
        return function () { el.remove(); };
      })(p);
    }
  }

  document.addEventListener('pointerdown', function (e) {
    if (!isArenaActive()) return;
    var t = e.target.closest && e.target.closest('.game-card, .btn:not(.b2), .pill, .tab');
    if (!t || t.disabled) return;
    burst(e.clientX, e.clientY, t.classList.contains('game-card') ? 9 : 5);
  }, { passive: true });
})();
