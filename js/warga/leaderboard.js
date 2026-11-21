(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;

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
              '<div><b>' + C.esc(u.name) + '</b><small>' + (u.username ? '@' + C.esc(u.username) : C.rankInfo(u.streak || 0).title) + '</small></div>' +
            '</div>' +
            '<b style="color:' + valColor + '">' + valText + '</b>' +
          '</div>'
        );
      }).join('') || '<div class="rw"><small>Memuat data peringkat...</small></div>';
    } else {
      var spList = lbState.data.topSpark;
      rowsHtml = spList.map(function (pair, i) {
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
        return (
          '<div class="rw">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span style="font-weight:900;width:26px">' + medal + '</span>' +
              '<div><b>@' + C.esc(pair.user1) + ' × @' + C.esc(pair.user2) + '</b><small>' + (pair.xp || 0) + ' Spark XP</small></div>' +
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
