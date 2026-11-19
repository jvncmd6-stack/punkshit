(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var lbCache = { category: 'streak', list: [] };

  // Halaman Misi Rusuh (Daily & Weekly Missions)
  function renderMisi() {
    var u = S.user;
    var missions = S.missions && S.missions.length ? S.missions : [
      { id: 'd_absen', period: 'daily', title: 'Absen Nyawa Hari Ini', rewardPsc: 2, rewardCred: 5, done: Boolean(u.absenToday), claimed: Boolean(u.absenToday) },
      { id: 'd_game', period: 'daily', title: 'Main 1x di Arena Gabut', rewardPsc: 5, rewardCred: 5, done: false, claimed: false },
      { id: 'd_poll', period: 'daily', title: 'Ikut Voting Sidang Warga', rewardPsc: 5, rewardCred: 5, done: false, claimed: false },
      { id: 'd_quiz', period: 'daily', title: 'Selesaikan Punk Trivia / Quiz', rewardPsc: 5, rewardCred: 5, done: false, claimed: false },
      { id: 'w_absen5', period: 'weekly', title: 'Absen 5 Hari Minggu Ini', rewardPsc: 25, rewardCred: 20, done: false, claimed: false },
      { id: 'w_game3', period: 'weekly', title: 'Main 3 Jenis Mini-Game', rewardPsc: 20, rewardCred: 15, done: false, claimed: false }
    ];

    var daily = missions.filter(function (m) { return m.period === 'daily'; });
    var weekly = missions.filter(function (m) { return m.period === 'weekly'; });

    function rowMission(m) {
      var btnHtml = '';
      if (m.claimed) {
        btnHtml = '<button class="pill" disabled>SELESAI</button>';
      } else if (m.done) {
        btnHtml = '<button class="pill" data-act="prog-claim" data-id="' + C.esc(m.id) + '">KLAIM +' + m.rewardPsc + '</button>';
      } else {
        btnHtml = '<span style="font-size:12px;color:var(--yel);font-weight:700">+' + m.rewardPsc + ' PSC</span>';
      }
      return (
        '<div class="rw">' +
          '<div><b>' + C.esc(m.title) + '</b><small>Reward: +' + m.rewardPsc + ' PSC · +' + (m.rewardCred || 0) + ' Street Cred</small></div>' +
          btnHtml +
        '</div>'
      );
    }

    return (
      '<div class="grp" style="margin-bottom:14px;background:linear-gradient(135deg,#FF453A26,#101827)">' +
        '<div class="rw">' +
          '<div><b>Street Cred Lo: ' + (u.cred || 0) + ' Poin</b><small>Reputasi tongkrongan (tidak bisa dijual/ditransfer)</small></div>' +
          '<span style="font-size:24px">🔥</span>' +
        '</div>' +
      '</div>' +

      '<h3 class="gh">DAILY MISSIONS (RESET 00.00 WIB)</h3>' +
      '<div class="grp">' + daily.map(rowMission).join('') + '</div>' +

      '<h3 class="gh">WEEKLY MISSIONS (RESET SENIN)</h3>' +
      '<div class="grp">' + weekly.map(rowMission).join('') + '</div>'
    );
  }

  // Halaman Hall of Fame (Leaderboard & Achievement Badges)
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
      var u = S.user;
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
            '<span class="pill" style="background:' + (b.ok ? '#34C75933;color:#6df0a0' : '#ffffff14;color:var(--mut)') + '">' + (b.ok ? 'UNLOCKED' : 'LOCKED') + '</span>' +
          '</div>'
        );
      }).join('') + '</div>';
    }

    // Tab Leaderboard
    var catChips =
      '<div class="chips" style="margin-bottom:14px">' +
        cats.map(function (c) {
          return '<button class="chip' + (lbCache.category === c.id ? ' on' : '') + '" data-act="fame-cat" data-cat="' + c.id + '">' + c.label + '</button>';
        }).join('') +
      '</div>';

    var listHtml = '';
    if (!lbCache.list.length) {
      listHtml = '<div class="grp"><div class="rw"><small>Memuat klasemen warga...</small></div></div>';
      loadLeaderboard(lbCache.category);
    } else {
      listHtml = '<div class="grp">' + lbCache.list.map(function (w, idx) {
        var val = lbCache.category === 'psc' ? (w.psc + ' PSC')
                : lbCache.category === 'cred' ? (w.cred + ' Cred')
                : lbCache.category === 'best' ? (w.best + ' Hari')
                : (w.streak + ' Hari');
        var medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#' + (idx + 1);
        return (
          '<div class="rw">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<b style="width:26px;text-align:center;color:var(--yel)">' + medal + '</b>' +
              C.renderAvatar(w, 'mini') +
              '<div><b>' + C.esc(w.name) + '</b><small>' + C.rankInfo(w.streak).title + '</small></div>' +
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

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'prog-claim') {
      var id = t.getAttribute('data-id');
      t.disabled = true;
      try {
        var res = await API.post('/api/missions/claim', { missionId: id });
        S.user = res.user;
        if (res.missions) S.missions = res.missions;
        C.notify('Mas Raka', 'Mission Passed', res.message || 'Reward misi berhasil masuk ke dompet!');
        C.refresh();
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Gagal', err.message);
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
