(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var CFG = window.PUNK_CONFIG;
  var S = C.S;

  function renderMarkas() {
    var u = S.user;
    var rk = C.rankInfo(u.streak);
    var done = Boolean(u.absenToday);

    var html =
      // Welcome Card
      '<div class="grp" style="margin-bottom:14px;background:linear-gradient(135deg,#176BFF33,#101827)">' +
        '<div class="rw">' +
          '<div>' +
            '<small style="color:#6df0a0;font-weight:700;letter-spacing:.06em">● MARKAS ONLINE</small>' +
            '<div style="font-size:18px;font-weight:800;margin-top:2px">WELCOME BACK, ' + C.esc(u.name.toUpperCase()) + '.</div>' +
            '<small>' + rk.title + ' · ' + (u.presence || '☕ Nongki Dulu') + '</small>' +
          '</div>' +
          C.renderAvatar(u, 'mini') +
        '</div>' +
      '</div>' +

      // Quick Stats Grid (2x2)
      '<div class="gg" style="margin-bottom:14px">' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px">' +
          '<small>SALDO PSC</small><b style="font-size:20px;color:var(--yel)">' + (u.psc || 0) + '</b>' +
        '</div>' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px">' +
          '<small>STREAK</small><b style="font-size:20px">' + (u.streak || 0) + ' Hari</b>' +
        '</div>' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px">' +
          '<small>STREET CRED</small><b style="font-size:20px;color:#8FC7FF">' + (u.cred || 0) + '</b>' +
        '</div>' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px">' +
          '<small>WARGA HIDUP</small><b style="font-size:20px;color:#34C759">' + (S.onlineUsers.length || 1) + '</b>' +
        '</div>' +
      '</div>' +

      // Absen Card
      '<div class="grp">' +
        '<div class="rw">' +
          '<div>' +
            '<b>Absen</b>' +
            '<small>Bonus hari ini: +' + rk.bonus + ' PSC · Rekor: ' + (u.best || 0) + ' hari</small>' +
          '</div>' +
          '<button class="pill" data-act="mk-absen"' + (done ? ' disabled' : '') + '>' + (done ? 'SUDAH ABSEN' : '🔥 ABSEN') + '</button>' +
        '</div>' +
      '</div>' +

      // Quick Actions ke Grup & Channel
      '<h3 class="gh">PINTASAN MARKAS</h3>' +
      '<div class="chips" style="margin-bottom:6px">' +
        '<button class="chip" data-act="app" data-id="kas">💸 Kas Rusuh</button>' +
        '<button class="chip" data-act="app" data-id="arena">🎮 Gas Main</button>' +
        '<button class="chip" data-act="app" data-id="event">📅 Liat Event</button>' +
        '<a class="chip" href="' + C.esc(CFG.GROUP_URL) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;text-decoration:none">💬 Grup Tele</a>' +
        '<a class="chip" href="' + C.esc(CFG.CHANNEL_URL) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;text-decoration:none">📢 Channel</a>' +
      '</div>' +

      // Live Activity Feed dari Bot Mas Raka
      '<h3 class="gh">KABAR GANG & AKTIVITAS GRUP</h3>' +
      '<div class="grp">' +
        (S.feed && S.feed.length
          ? S.feed.map(function (f) {
              var time = new Date(f.createdAt || f.t || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
              return '<div class="rw"><div>' + C.esc(f.text || f.x) + '<small>' + time + ' WIB · sinkron ke Grup</small></div></div>';
            }).join('')
          : '<div class="rw"><small>Belum ada aktivitas baru. Absen atau lempar saweran buat mancing Mas Raka.</small></div>') +
      '</div>';

    return html;
  }

  C.Views.markas = renderMarkas;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act="mk-absen"]');
    if (!t || t.disabled) return;
    t.disabled = true;
    t.textContent = '...';
    try {
      var res = await API.post('/api/absen');
      S.user = res.user;
      if (res.feed) S.feed = res.feed;
      C.notify('Mas Raka', '→ Grup Punkshit', res.message || ('MASIH HIDUP TERNYATA. Absen hari ke-' + S.user.streak + ' (+' + res.earned + ' PSC).'));
      C.refresh();
    } catch (err) {
      t.disabled = false;
      t.textContent = '🔥 ABSEN';
      C.notify('Mas Raka', 'Gagal', err.message);
    }
  });
})();
