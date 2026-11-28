(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;

  var CRED_RANKS = [
    { minCred: 600, title: 'Sesepuh Akut',    badge: '👑' },
    { minCred: 350, title: 'Pentolan Markas', badge: '🔥' },
    { minCred: 200, title: 'Biang Rame',      badge: '⚡' },
    { minCred: 100, title: 'Anak Nongkrong',  badge: '🎸' },
    { minCred: 50,  title: 'Warga Tetap',     badge: '🧢' },
    { minCred: 20,  title: 'Baru Kenal',      badge: '🥤' },
    { minCred: 0,   title: 'Anak Nyasar',     badge: '🛹' }
  ];

  var ALL_TITLES = [
    { id: 'sider',        name: 'Sider Abadi' },
    { id: 'yapping',      name: 'Tukang Yapping' },
    { id: 'beban',        name: 'Beban Grup' },
    { id: 'admin',        name: 'Admin Jalur Belakang' },
    { id: 'spill',        name: 'Spill Master' },
    { id: 'kalong',       name: 'Raja Jam Kalong' },
    { id: 'fomo',         name: 'Korban FOMO' },
    { id: 'sepuh',        name: 'Sepuh Turun Gunung' },
    { id: 'donatur',      name: 'Donatur Tanpa Syarat' },
    { id: 'first_fire',   name: 'Bestie Jalur Api' },
    { id: 'cctv',         name: 'CCTV Grup' },
    { id: 'kang_goreng',  name: 'Kang Goreng' },
    { id: 'mak_comblang', name: 'Mak Comblang' },
    { id: 'gak_napak',    name: 'Gak Napak Tanah' }
  ];

  function resolveUserSubLabel(u) {
    var cred = Number(u && u.cred) || 0;
    var rank = CRED_RANKS[CRED_RANKS.length - 1];
    for (var i = 0; i < CRED_RANKS.length; i++) {
      if (cred >= CRED_RANKS[i].minCred) {
        rank = CRED_RANKS[i];
        break;
      }
    }
    var activeId = (u && (u.activeTitleId || u.active_title)) || '';
    var found = activeId ? ALL_TITLES.find(function (t) { return t.id === activeId; }) : null;
    var titleText = rank.badge + ' ' + (found ? found.name : rank.title);
    return u.username ? ('@' + u.username + ' · ' + titleText) : titleText;
  }

  function getDuoBondLabel(streak) {
    var d = Number(streak) || 0;
    if (d >= 30) return 'Lengket Kayak Lem';
    if (d >= 14) return 'Sehidup Semati';
    if (d >= 7)  return 'Partner Yapping';
    if (d >= 3)  return 'Satu Frekuensi';
    return 'Baru Nimbrung';
  }

  var lbState = {
    loaded: false,
    loading: false,
    tab: 'psc', // 'psc' | 'cred' | 'spark'
    data: { topPsc: [], topCred: [], topSpark: [] }
  };

  async function fetchLeaderboard() {
    if (lbState.loading) return;
    lbState.loading = true;
    try {
      var res = await API.get('/api/leaderboard/global');
      lbState.data = {
        topPsc: res.topPsc || [],
        topCred: res.topCred || [],
        topSpark: res.topSpark || []
      };
      lbState.loaded = true;
      if (C.S.curApp === 'klasemen') C.refresh();
    } catch (e) {
      // Abaikan jika gagal
    } finally {
      lbState.loading = false;
    }
  }

  function renderKlasemen() {
    if (!lbState.loaded && !lbState.loading) {
      fetchLeaderboard();
    }

    var tabsHtml =
      '<div class="tabs" style="margin-bottom:14px">' +
        '<button class="tab' + (lbState.tab === 'psc' ? ' on' : '') + '" data-act="lb-tab" data-tab="psc">💰 Sultan PSC</button>' +
        '<button class="tab' + (lbState.tab === 'cred' ? ' on' : '') + '" data-act="lb-tab" data-tab="cred">👑 Street Cred</button>' +
        '<button class="tab' + (lbState.tab === 'spark' ? ' on' : '') + '" data-act="lb-tab" data-tab="spark">🔥 Spark Streak</button>' +
      '</div>';

    var rowsHtml = '';

    if (lbState.tab === 'psc' || lbState.tab === 'cred') {
      var list = lbState.tab === 'psc' ? lbState.data.topPsc : lbState.data.topCred;
      rowsHtml = list.map(function (u, i) {
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
        var valText = lbState.tab === 'psc' ? ((u.psc || 0) + ' PSC') : ((u.cred || 0) + ' Cred');
        var valColor = lbState.tab === 'psc' ? '#FFD633' : '#38BDF8';
        return (
          '<div class="rw" data-act="wg-view" data-uid="' + C.esc(u.id) + '" style="cursor:pointer">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span style="font-weight:900;width:26px">' + medal + '</span>' +
              C.renderAvatar(u, 'mini') +
              '<div><b>' + C.esc(u.name) + '</b><small>' + C.esc(resolveUserSubLabel(u)) + '</small></div>' +
            '</div>' +
            '<b style="color:' + valColor + '">' + valText + '</b>' +
          '</div>'
        );
      }).join('') || '<div class="rw"><small>Memuat data peringkat...</small></div>';
    } else {
      var spList = lbState.data.topSpark;
      rowsHtml = spList.map(function (pair, i) {
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
        var bond = getDuoBondLabel(pair.streak || 0);
        return (
          '<div class="rw">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span style="font-weight:900;width:26px">' + medal + '</span>' +
              '<div><b>@' + C.esc(pair.user1) + ' × @' + C.esc(pair.user2) + '</b><small>' + C.esc(bond) + ' · ' + (pair.xp || 0) + ' XP</small></div>' +
            '</div>' +
            '<b style="color:#FB923C">🔥 ' + (pair.streak || 0) + ' Hari</b>' +
          '</div>'
        );
      }).join('') || '<div class="rw"><small>Belum ada pasangan Spark yang punya streak aktif.</small></div>';
    }

    return (
      '<h3 class="gh">🏆 HALL OF FAME MARKAS</h3>' +
      tabsHtml +
      '<div class="grp">' + rowsHtml + '</div>'
    );
  }

  C.Views.klasemen = renderKlasemen;

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act="lb-tab"]');
    if (!t) return;
    lbState.tab = t.getAttribute('data-tab');
    C.refresh();
  });
})();
