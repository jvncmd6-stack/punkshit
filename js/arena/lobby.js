(function () {
  var A = window.PunkArena = window.PunkArena || {};
  var C = window.PunkCore;
  var S = C.S;

  function renderGamesTab() {
    var st = A.state;
    var fq = st.fishQuota;
    var coreGames = [
      { id: 'fish', em: '🎣', title: 'Mancing Galatama 2.0', tag: fq.left + '/' + fq.max + ' Kail', desc: 'Tarik ikan pakai Tension Meter & lengkapi Fishdex.' },
      { id: 'scratch', em: '🎟️', title: 'Gosok Nasib 2.0', tag: st.scratchedToday ? 'Selesai' : 'Gratis 1x', desc: 'Gosok kartu interaktif untuk ungkap hadiah harian.' },
      { id: 'claw', em: '🕹️', title: 'Mesin Rongsok 2.0', tag: 'Arcade', desc: 'Arahkan capit kiri-kanan & angkat boneka langka.' },
      { id: 'react', em: '⚡', title: 'Reaction Rush 2.0', tag: 'Refleks', desc: 'Uji kecepatan jari Classic atau Best of Five.' },
      { id: 'trivia', em: '🧠', title: 'Punk Trivia 2.0', tag: '5 Soal', desc: 'Kuis kilat ber-combo tanpa bocoran jawaban.' }
    ];

    var extraGames = [
      { id: 'whack', em: '🔨', title: 'Gebuk Siapa?', tag: '30 Detik', desc: 'Gebuk target yang muncul, hindari bom jebakan!' },
      { id: 'memory', em: '🃏', title: 'Adu Ingatan', tag: 'Grid 4x4', desc: 'Cocokkan pasangan kartu secepat & sehemat langkah.' }
    ];

    function buildCard(g) {
      return (
        '<button class="game-card" data-act="ar-open" data-game="' + g.id + '" style="position:relative">' +
          '<span style="position:absolute;top:8px;right:8px;font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;background:rgba(56,189,248,.18);color:#7DD3FC">' + C.esc(g.tag) + '</span>' +
          '<em>' + g.em + '</em>' +
          '<b>' + C.esc(g.title) + '</b>' +
          '<small>' + C.esc(g.desc) + '</small>' +
        '</button>'
      );
    }

    return (
      '<h3 class="gh">MAIN ARCADE (UPGRADE 2.0)</h3>' +
      '<div class="game-grid">' + coreGames.map(buildCard).join('') + '</div>' +
      '<h3 class="gh" style="margin-top:14px">ARCADE EKSPANSI</h3>' +
      '<div class="game-grid">' + extraGames.map(buildCard).join('') + '</div>'
    );
  }

  function renderQuestAndPassTab() {
    var st = A.state;
    var p = st.profile;
    var questsHtml = st.quests.map(function (q) {
      var btn = q.claimed
        ? '<button class="pill" disabled>SELESAI</button>'
        : q.done
          ? '<button class="pill" style="background:#34C75933;color:#6df0a0" data-act="ar-claim-quest" data-id="' + C.esc(q.id) + '">KLAIM +' + q.psc + ' PSC</button>'
          : '<span style="font-size:11px;color:var(--mut);font-weight:700">' + q.progress + '/' + q.target + '</span>';

      return (
        '<div class="rw">' +
          '<div><b>' + C.esc(q.title) + '</b><small>' + C.esc(q.desc) + ' · +' + q.xp + ' XP</small></div>' +
          btn +
        '</div>'
      );
    }).join('') || '<div class="rw"><small>Memuat Daily Quest...</small></div>';

    var passHtml = st.passMilestones.map(function (m) {
      var unlocked = p.level >= m.level;
      var claimed = (p.claimedPass || []).indexOf(m.level) !== -1;
      var actionHtml = claimed
        ? '<button class="pill" disabled>DIKLAIM</button>'
        : unlocked
          ? '<button class="pill" style="background:#FFD63333;color:#FFD633" data-act="ar-claim-pass" data-lvl="' + m.level + '">AMBIL</button>'
          : '<span style="font-size:11px;opacity:.6">🔒 Lv.' + m.level + '</span>';

      return (
        '<div class="rw" style="opacity:' + (unlocked ? '1' : '.65') + '">' +
          '<div><b>Level ' + m.level + ' — ' + C.esc(m.label) + '</b><small>' + (unlocked ? 'Target tercapai!' : 'Kumpulkan XP untuk membuka') + '</small></div>' +
          actionHtml +
        '</div>'
      );
    }).join('');

    return (
      '<h3 class="gh">DAILY QUEST (RESET 00.00 WIB)</h3>' +
      '<div class="grp">' + questsHtml + '</div>' +
      '<h3 class="gh" style="margin-top:14px">ARCADE PASS GRATIS</h3>' +
      '<div class="grp">' + passHtml + '</div>'
    );
  }

  function renderCollectionTab() {
    var st = A.state;
    var activeItems = st.collections.filter(function (it) { return !it.is_sold; });
    var uniqueFishKeys = {};
    st.collections.forEach(function (it) {
      if (it.category === 'fish') uniqueFishKeys[it.item_key] = true;
    });
    var discoveredFish = Object.keys(uniqueFishKeys).length;

    var itemsHtml = activeItems.map(function (it) {
      var col = A.rarityColor(it.rarity);
      var icon = it.category === 'fish' ? '🐟' : it.category === 'claw' ? '🧸' : '🏆';
      var subText = it.weight > 0 ? (it.weight + ' kg · ') : '';
      var sellBtn = it.sell_price > 0
        ? '<button class="pill" data-act="ar-sell-item" data-id="' + it.id + '">Jual +' + it.sell_price + ' PSC</button>'
        : '<span class="pill" style="opacity:.7">Koleksi</span>';

      return (
        '<div class="rw">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<span style="font-size:22px">' + icon + '</span>' +
            '<div>' +
              '<b>' + C.esc(it.name) + '</b>' +
              '<small style="color:' + col + ';font-weight:700">' + subText + C.esc(it.rarity) + '</small>' +
            '</div>' +
          '</div>' +
          sellBtn +
        '</div>'
      );
    }).join('') || '<div class="rw"><small>Tas koleksi masih kosong. Ayo mancing atau main capit dulu!</small></div>';

    return (
      '<div class="grp" style="margin-bottom:12px">' +
        '<div class="rw">' +
          '<div><b>📖 Fishdex Tercatat</b><small>Jenis ikan unik yang pernah ditangkap</small></div>' +
          '<b style="color:#38BDF8">' + discoveredFish + ' / ' + st.fishdexTotal + ' Jenis</b>' +
        '</div>' +
      '</div>' +
      '<h3 class="gh">TAS KOLEKSI & TANGKAPAN (' + activeItems.length + ')</h3>' +
      '<div class="grp">' + itemsHtml + '</div>'
    );
  }

  function renderRankTab() {
    var st = A.state;
    var xpList = st.leaderboards.xp || [];
    var reactList = st.leaderboards.react || [];

    var xpHtml = xpList.map(function (r, i) {
      var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
      return '<div class="rw"><div><b>' + medal + ' ' + C.esc(r.name) + '</b><small>Level ' + r.level + '</small></div><b style="color:#FFD633">' + r.xp + ' XP</b></div>';
    }).join('') || '<div class="rw"><small>Belum ada data XP.</small></div>';

    var reactHtml = reactList.map(function (r, i) {
      var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
      return '<div class="rw"><div><b>' + medal + ' ' + C.esc(r.name) + '</b></div><b style="color:#38BDF8">' + Math.round(r.score) + ' ms</b></div>';
    }).join('') || '<div class="rw"><small>Belum ada rekor refleks.</small></div>';

    return (
      '<h3 class="gh">🏆 TOP ARCADE XP</h3>' +
      '<div class="grp">' + xpHtml + '</div>' +
      '<h3 class="gh" style="margin-top:14px">⚡ REKOR REACTION RUSH</h3>' +
      '<div class="grp">' + reactHtml + '</div>'
    );
  }

  A.renderArena = function () {
    var st = A.state;
    if (!st.loaded && !st.loading) {
      A.loadArenaState(true);
    }

    var p = st.profile;
    var xpInLevel = (p.xp || 0) % 150;
    var pct = Math.min(100, Math.round((xpInLevel / 150) * 100));
    var claimableQuestCount = st.quests.filter(function (q) { return q.done && !q.claimed; }).length;
    var claimablePassCount = st.passMilestones.filter(function (m) {
      return p.level >= m.level && (p.claimedPass || []).indexOf(m.level) === -1;
    }).length;
    var badgeCount = claimableQuestCount + claimablePassCount;

    var headerCard =
      '<div class="grp" style="margin-bottom:12px;background:linear-gradient(135deg,#0284C744,#0F172A 65%,#EAB30822);border:1px solid rgba(56,189,248,.28)">' +
        '<div class="rw" style="align-items:flex-start">' +
          '<div>' +
            '<small style="color:#38BDF8;font-weight:800;letter-spacing:.06em">🕹️ ARENA GABUT 2.0 · Y2K ARCADE</small>' +
            '<div style="font-size:19px;font-weight:900;margin-top:2px">LEVEL ' + p.level + ' <span style="font-size:12px;color:var(--yel);font-weight:700">(' + (p.xp || 0) + ' XP)</span></div>' +
            '<small>Gratis & Fair Play · Reward tervalidasi server</small>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<span class="pill" style="background:#FFD63326;color:#FFD633">💰 ' + (S.user ? S.user.psc : 0) + ' PSC</span>' +
          '</div>' +
        '</div>' +
        '<div style="padding:0 14px 12px">' +
          '<div style="display:flex;justify-content:space-between;font-size:10px;opacity:.8;margin-bottom:4px">' +
            '<span>Progress Lv.' + (p.level + 1) + '</span><span>' + xpInLevel + ' / 150 XP</span>' +
          '</div>' +
          '<div style="height:7px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden">' +
            '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#38BDF8,#FFD633);border-radius:99px;transition:width .3s"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var navTabs =
      '<div class="tabs" style="margin-bottom:12px">' +
        '<button class="tab' + (st.tab === 'games' ? ' on' : '') + '" data-act="ar-tab" data-tab="games">🎮 Games</button>' +
        '<button class="tab' + (st.tab === 'quest' ? ' on' : '') + '" data-act="ar-tab" data-tab="quest">🎯 Quest' + (badgeCount ? ' (' + badgeCount + ')' : '') + '</button>' +
        '<button class="tab' + (st.tab === 'bag' ? ' on' : '') + '" data-act="ar-tab" data-tab="bag">🎒 Koleksi</button>' +
        '<button class="tab' + (st.tab === 'rank' ? ' on' : '') + '" data-act="ar-tab" data-tab="rank">🏆 Rank</button>' +
      '</div>';

    var coopSlot = typeof window.renderArenaSparkCoopSlot === 'function'
      ? window.renderArenaSparkCoopSlot()
      : '';

    var content = '';
    if (st.tab === 'games') content = coopSlot + renderGamesTab();
    else if (st.tab === 'quest') content = coopSlot + renderQuestAndPassTab();
    else if (st.tab === 'bag') content = coopSlot + renderCollectionTab();
    else if (st.tab === 'rank') content = coopSlot + renderRankTab();

    return headerCard + navTabs + content;
  };
})();
