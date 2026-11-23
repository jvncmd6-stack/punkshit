(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var CFG = window.PUNK_CONFIG;
  var S = C.S;

  var MOODS = [
    '☕ Nongki Santai',
    '🔥 On Fire',
    '🎮 Push Arena',
    '🎨 Lagi Berkarya',
    '🛌 Mode Rebahan'
  ];

  function renderMarkas() {
    var u = S.user || {};
    var rk = C.rankInfo(u.streak || 0);
    var done = Boolean(u.absenToday);
    var curMood = u.presence || '☕ Nongki Santai';
    var hasShield = Number(u.streakShield || u.streak_shield || 0) > 0;

    var moodChips =
      '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-top:10px">' +
        MOODS.map(function (m) {
          var active = curMood === m;
          return (
            '<button class="pill" style="white-space:nowrap;background:' + (active ? '#FFD633' : 'rgba(255,255,255,.08)') + ';color:' + (active ? '#000' : '#fff') + ';font-weight:' + (active ? '800' : '600') + '" data-act="mk-mood" data-mood="' + C.esc(m) + '">' +
              C.esc(m) +
            '</button>'
          );
        }).join('') +
      '</div>';

    var html =
      // Welcome & Mood Card
      '<div class="grp" style="margin-bottom:14px;background:linear-gradient(135deg,#176BFF33,#0f172a);border:1px solid rgba(56,189,248,.22)">' +
        '<div style="padding:12px 14px">' +
          '<div class="rw" style="padding:0;border:none">' +
            '<div>' +
              '<small style="color:#6df0a0;font-weight:700;letter-spacing:.06em">● MARKAS ONLINE</small>' +
              '<div style="font-size:17px;font-weight:800;margin-top:2px">Halo, ' + C.esc(u.name || 'Warga') + '! 👋</div>' +
              '<small>' + C.esc(rk.title) + ' · ' + C.esc(curMood) + '</small>' +
            '</div>' +
            C.renderAvatar(u, 'mini') +
          '</div>' +
          moodChips +
        '</div>' +
      '</div>' +

      // Quick Stats Grid (2x2)
      '<div class="gg" style="margin-bottom:14px">' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px;cursor:pointer" data-act="app" data-id="kas">' +
          '<small>SALDO PSC</small><b style="font-size:20px;color:var(--yel)">' + (u.psc || 0) + '</b>' +
        '</div>' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px">' +
          '<small>STREAK AKTIF</small><b style="font-size:20px">' + (u.streak || 0) + ' Hari ' + (hasShield ? '🛡️' : '') + '</b>' +
        '</div>' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px;cursor:pointer" data-act="app" data-id="misi">' +
          '<small>STREET CRED</small><b style="font-size:20px;color:#8FC7FF">' + (u.cred || 0) + '</b>' +
        '</div>' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px;cursor:pointer" data-act="app" data-id="warga">' +
          '<small>WARGA HIDUP</small><b style="font-size:20px;color:#34C759">' + (S.onlineUsers.length || 1) + '</b>' +
        '</div>' +
      '</div>' +

      // Absen Harian Card
      '<div class="grp" style="margin-bottom:14px">' +
        '<div class="rw">' +
          '<div>' +
            '<b>Absen Harian Tongkrongan</b>' +
            '<small>Bonus hari ini: +' + rk.bonus + ' PSC · Rekor terbaik: ' + (u.best || 0) + ' hari</small>' +
          '</div>' +
          '<button class="pill" style="' + (done ? '' : 'background:#34C759;color:#000;font-weight:800') + '" data-act="mk-absen"' + (done ? ' disabled' : '') + '>' + (done ? '✅ UDAH ABSEN' : '🔥 ABSEN') + '</button>' +
        '</div>' +
      '</div>' +

      // Pintasan Cepat Markas
      '<h3 class="gh">PINTASAN CEPAT</h3>' +
      '<div class="chips" style="margin-bottom:10px">' +
        '<button class="chip" data-act="app" data-id="lapakwarga">🏪 Lapak Warga</button>' +
        '<button class="chip" data-act="app" data-id="lapak">🛍️ Lapak Rongsok</button>' +
        '<button class="chip" data-act="app" data-id="misi">🎯 Misi & Pangkat</button>' +
        '<button class="chip" data-act="app" data-id="arena">🎮 Arena Gabut</button>' +
        '<button class="chip" data-act="app" data-id="spark">🔥 Spark Buddies</button>' +
        '<a class="chip" href="' + C.esc(CFG.GROUP_URL) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;text-decoration:none">💬 Grup Tele</a>' +
      '</div>' +

      // Live Activity Feed dari Mas Raka
      '<h3 class="gh">KABAR TONGKRONGAN TERBARU</h3>' +
      '<div class="grp">' +
        (S.feed && S.feed.length
          ? S.feed.map(function (f) {
              var time = new Date(f.createdAt || f.t || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
              return '<div class="rw"><div>' + C.esc(f.text || f.x) + '<small>' + time + ' WIB · Kabar Markas</small></div></div>';
            }).join('')
          : '<div class="rw"><small>Suasana masih santai nih cuy. Yuk absen atau mampir ke Lapak Warga biar rame!</small></div>') +
      '</div>';

    return html;
  }

  C.Views.markas = renderMarkas;

  if (window.__punkMarkasBound) return;
  window.__punkMarkasBound = true;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'mk-absen') {
      t.disabled = true;
      t.textContent = 'Mencatat...';
      try {
        var res = await API.post('/api/absen');
        S.user = res.user;
        if (res.feed) S.feed = res.feed;
        C.notify('Mas Raka', 'Absen Tercatat 🔥', res.message || ('Mantap cuy! Absen hari ke-' + S.user.streak + ' (+' + res.earned + ' PSC) berhasil dicatat.'));
        C.refresh();
      } catch (err) {
        t.disabled = false;
        t.textContent = '🔥 ABSEN';
        C.notify('Mas Raka', 'Info Absen', err.message);
      }
    } else if (act === 'mk-mood') {
      var mood = t.getAttribute('data-mood');
      if (!mood || S.user.presence === mood) return;
      S.user.presence = mood;
      C.refresh();
      try {
        var pRes = await API.post('/api/profile/presence', { presence: mood });
        if (pRes && pRes.user) S.user = pRes.user;
        C.notify('Mas Raka', 'Status Nongkrong', 'Sip, status lo sekarang: ' + mood);
      } catch (_) {}
    }
  });
})();
