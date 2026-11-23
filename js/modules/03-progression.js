(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var lbCache = { category: 'streak', list: [] };

  var TIERS = [
    { name: 'Warga Baru', icon: '🌱', minCred: 0, minStreak: 0, perk: 'Akses dasar Markas, Kas & Lapak Warga' },
    { name: 'Anak Nongkrong', icon: '☕', minCred: 25, minStreak: 3, perk: 'Bonus absen +2 PSC & buka fitur Gift Anonim' },
    { name: 'Pentolan Gang', icon: '🔥', minCred: 100, minStreak: 7, perk: 'Pajak Lapak turun jadi 3% & diskon Sundul' },
    { name: 'Sepuh / Fosil', icon: '👑', minCred: 300, minStreak: 14, perk: 'Bebas Pajak Lapak (0%) & bonus absen +5 PSC' }
  ];

  function resolveTier(u) {
    var cred = Number(u.cred) || 0;
    var best = Math.max(Number(u.best) || 0, Number(u.streak) || 0);
    var curIdx = 0;
    for (var i = 0; i < TIERS.length; i++) {
      if (cred >= TIERS[i].minCred && best >= TIERS[i].minStreak) curIdx = i;
    }
    return {
      current: TIERS[curIdx],
      next: TIERS[curIdx + 1] || null,
      cred: cred,
      best: best
    };
  }

  function renderMisi() {
    var u = S.user || {};
    var tInfo = resolveTier(u);
    var cur = tInfo.current;
    var nxt = tInfo.next;

    var tierProgressHtml = '';
    if (nxt) {
      var credPct = Math.min(100, Math.round((tInfo.cred / nxt.minCred) * 100));
      var strkPct = Math.min(100, Math.round((tInfo.best / nxt.minStreak) * 100));
      var totalPct = Math.round((credPct + strkPct) / 2);
      tierProgressHtml =
        '<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)">' +
          '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px">' +
            '<span>Menuju <b>' + nxt.icon + ' ' + nxt.name + '</b></span>' +
            '<span style="color:#FFD633">' + totalPct + '%</span>' +
          '</div>' +
          '<div style="height:6px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden">' +
            '<div style="width:' + totalPct + '%;height:100%;background:linear-gradient(90deg,#38BDF8,#FFD633)"></div>' +
          '</div>' +
          '<small style="display:block;margin-top:6px;color:var(--mut)">Syarat: Cred <b>' + tInfo.cred + '/' + nxt.minCred + '</b> · Rekor Streak <b>' + tInfo.best + '/' + nxt.minStreak + ' hari</b></small>' +
        '</div>';
    } else {
      tierProgressHtml = '<small style="display:block;margin-top:8px;color:#6df0a0">✨ Pangkat tertinggi markas sudah lo capai!</small>';
    }

    var tierCard =
      '<div class="grp" style="margin-bottom:14px;background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(255,214,51,.25)">' +
        '<div style="padding:12px 14px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between">' +
            '<div>' +
              '<small style="color:#FFD633;font-weight:700">PANGKAT TONGKRONGAN</small>' +
              '<div style="font-size:17px;font-weight:800;margin-top:2px">' + cur.icon + ' ' + cur.name + '</div>' +
              '<small style="color:#94a3b8">Benefit: ' + cur.perk + '</small>' +
            '</div>' +
            '<div style="text-align:right">' +
              '<b style="font-size:16px;color:#38BDF8">' + tInfo.cred + '</b>' +
              '<small style="display:block;color:var(--mut)">Street Cred</small>' +
            '</div>' +
          '</div>' +
          tierProgressHtml +
        '</div>' +
      '</div>';

    var missions = S.missions && S.missions.length ? S.missions : [
      { id: 'd_absen', period: 'daily', title: 'Absen Nyawa Hari Ini', rewardPsc: 2, rewardCred: 5, done: Boolean(u.absenToday), claimed: Boolean(u.absenToday) },
      { id: 'd_game', period: 'daily', title: 'Main 1x di Arena Gabut', rewardPsc: 5, rewardCred: 5, done: false, claimed: false },
      { id: 'd_poll', period: 'daily', title: 'Ikut Voting Sidang Warga', rewardPsc: 5, rewardCred: 5, done: false, claimed: false },
      { id: 'w_absen5', period: 'weekly', title: 'Absen 5 Hari Minggu Ini', rewardPsc: 25, rewardCred: 20, done: false, claimed: false },
      { id: 'w_social', period: 'weekly', title: 'Berbagi Saweran / Gift ke Warga', rewardPsc: 20, rewardCred: 15, done: Boolean(u.hasShared), claimed: false },
      { id: 'w_game3', period: 'weekly', title: 'Main 3 Jenis Mini-Game', rewardPsc: 20, rewardCred: 15, done: false, claimed: false }
    ];

    var daily = missions.filter(function (m) { return m.period === 'daily'; });
    var weekly = missions.filter(function (m) { return m.period === 'weekly'; });

    function rowMission(m) {
      var btnHtml = '';
      if (m.claimed) {
        btnHtml = '<button class="pill" disabled>SELESAI</button>';
      } else if (m.done) {
        btnHtml = '<button class="pill" style="background:#34C759;color:#000;font-weight:800" data-act="prog-claim" data-id="' + C.esc(m.id) + '">KLAIM +' + m.rewardPsc + '</button>';
      } else {
        btnHtml = '<span style="font-size:12px;color:var(--yel);font-weight:700">+' + m.rewardPsc + ' PSC</span>';
      }
      return (
        '<div class="rw">' +
          '<div><b>' + C.esc(m.title) + '</b><small>Hadiah: +' + m.rewardPsc + ' PSC · +' + (m.rewardCred || 0) + ' Street Cred</small></div>' +
          btnHtml +
        '</div>'
      );
    }

    return (
      tierCard +
      '<h3 class="gh">MISI HARIAN (RESET 00.00 WIB)</h3>' +
      '<div class="grp">' + daily.map(rowMission).join('') + '</div>' +
      '<h3 class="gh">MISI MINGGUAN (RESET SENIN)</h3>' +
      '<div class="grp">' + weekly.map(rowMission).join('') + '</div>'
    );
  }

  function renderFame() {
    var tab = S.curTab.fame || 'lb';
    var cats = [
      { id: 'streak', label: '🔥 Terajin' },
      { id: 'cred', label: '⭐ Main Character' },
      { id: 'psc', label: '💰 Sultan PSC' },
      { id: 'best', label: '🦴 Fosil' }
    ];

    var headerTabs =
      '<div class="tabs">' +
        '<button class="tab' + (tab === 'lb' ? ' on' : '') + '" data-act="fame-tab" data-tab="lb">🏆 Leaderboard</button>' +
        '<button class="tab' + (tab === 'ach' ? ' on' : '') + '" data-act="fame-tab" data-tab="ach">🎖️ Achievement</button>' +
      '</div>';

    if (tab === 'ach') {
      var u = S.user || {};
      var badges = [
        { icon: '🌱', name: 'First Contact', desc: 'Absen pertama kali di markas', ok: (u.best || 0) >= 1 },
        { icon: '☕', name: 'Regular Customer', desc: 'Capai streak 7 hari berturut-turut', ok: (u.best || 0) >= 7 },
        { icon: '🔥', name: 'Never Missing', desc: 'Capai streak 30 hari berturut-turut', ok: (u.best || 0) >= 30 },
        { icon: '🦴', name: 'Certified Fossil', desc: 'Capai streak 60 hari berturut-turut', ok: (u.best || 0) >= 60 },
        { icon: '💸', name: 'Generous Soul', desc: 'Berbagi PSC lewat saweran atau gift', ok: Boolean(u.hasShared) },
        { icon: '🎣', name: 'Lele Hunter', desc: 'Kumpulkan tangkapan di Mancing Galatama', ok: (u.fishCount || 0) >= 10 }
      ];

      return headerTabs + '<div class="grp">' + badges.map(function (b) {
        return (
          '<div class="rw" style="opacity:' + (b.ok ? '1' : '.5') + '">' +
            '<div style="display:flex;align-items:center;gap:12px">' +
              '<span style="font-size:26px">' + b.icon + '</span>' +
              '<div><b>' + C.esc(b.name) + '</b><small>' + C.esc(b.desc) + '</small></div>' +
            '</div>' +
            '<span class="pill" style="background:' + (b.ok ? '#34C75933;color:#6df0a0' : '#ffffff14;color:var(--mut)') + '">' + (b.ok ? 'TERBUKA' : 'TERKUNCI') + '</span>' +
          '</div>'
        );
      }).join('') + '</div>';
    }

    var catChips =
      '<div class="chips" style="margin-bottom:14px">' +
        cats.map(function (c) {
          return '<button class="chip' + (lbCache.category === c.id ? ' on' : '') + '" data-act="fame-cat" data-cat="' + c.id + '">' + c.label + '</button>';
        }).join('') +
      '</div>';

    var listHtml = '';
    if (!lbCache.list.length) {
      listHtml = '<div class="grp"><div class="rw"><small>Sebentar cuy, lagi nyusun klasemen warga...</small></div></div>';
      loadLeaderboard(lbCache.category);
    } else {
      listHtml = '<div class="grp">' + lbCache.list.map(function (w, idx) {
        var val = lbCache.category === 'psc' ? (w.psc + ' PSC')
                : lbCache.category === 'cred' ? (w.cred + ' Cred')
                : lbCache.category === 'best' ? (w.best + ' Hari')
                : (w.streak + ' Hari');
        var medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#' + (idx + 1);
        var tier = resolveTier(w).current;
        return (
          '<div class="rw">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<b style="width:26px;text-align:center;color:var(--yel)">' + medal + '</b>' +
              C.renderAvatar(w, 'mini') +
              '<div><b>' + C.esc(w.name) + '</b><small>' + tier.icon + ' ' + tier.name + '</small></div>' +
            '</div>' +
            '<b style="color:var(--gblue);font-size:14px">' + val + '</b>' +
          '</div>'
        );
      }).join('') + '</div>';
    }

    return headerTabs + catChips + listHtml;
  }

  async function loadLeaderboard(cat) {
    lbCache.category = cat;
    try {
      var res = await API.get('/api/leaderboard?by=' + encodeURIComponent(cat));
      lbCache.list = res.list || [];
      if (S.curApp === 'fame') C.refresh();
    } catch (e) {}
  }

  C.Views.misi = renderMisi;
  C.Views.fame = renderFame;

  if (window.__punkProgBound) return;
  window.__punkProgBound = true;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'prog-claim') {
      var id = t.getAttribute('data-id');
      t.disabled = true;
      try {
        var res = await API.post('/api/missions/claim', { missionId: id });
        S.user = res.user;
        if (res.missions) S.missions = res.missions;
        C.notify('Mas Raka', 'Misi Beres! 🔥', res.message || 'Mantap cuy, hadiah misi udah masuk ke dompet lo!');
        C.refresh();
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Belum Bisa Klaim', err.message);
      }
    } else if (act === 'fame-tab') {
      S.curTab.fame = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'fame-cat') {
      var cat = t.getAttribute('data-cat');
      lbCache.list = [];
      loadLeaderboard(cat);
      C.refresh();
    }
  });
})();
