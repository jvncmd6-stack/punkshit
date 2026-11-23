(function () {
  var A = window.PunkArena = window.PunkArena || {};
  var C = window.PunkCore;
  var S = C.S;

  var FISH_SPECIES_PREVIEW = [
    { key: 'lele_kaleng', name: 'Lele Kaleng Sarden', rarity: 'Common', spot: 'Pinggir' },
    { key: 'mujair_punk', name: 'Mujair Mohawk', rarity: 'Common', spot: 'Pinggir' },
    { key: 'nila_neon', name: 'Nila Neon', rarity: 'Common', spot: 'Pinggir' },
    { key: 'gabus_preman', name: 'Gabus Preman Kali', rarity: 'Uncommon', spot: 'Pinggir' },
    { key: 'bawal_baja', name: 'Bawal Baja', rarity: 'Uncommon', spot: 'Tengah' },
    { key: 'gurame_asap', name: 'Gurame Asap Sunda', rarity: 'Uncommon', spot: 'Tengah' },
    { key: 'patin_emas', name: 'Patin Emas Cipaganti', rarity: 'Rare', spot: 'Tengah' },
    { key: 'kakap_merah', name: 'Kakap Merah Karang', rarity: 'Rare', spot: 'Tengah' },
    { key: 'arwana_super', name: 'Arwana Super Red', rarity: 'Epic', spot: 'Tengah' },
    { key: 'pari_listrik', name: 'Pari Listrik Tegangan Tinggi', rarity: 'Epic', spot: 'Palung' },
    { key: 'hiu_martil', name: 'Hiu Martil Besi', rarity: 'Epic', spot: 'Palung' },
    { key: 'tuna_sirip_biru', name: 'Tuna Sirip Biru', rarity: 'Legendary', spot: 'Palung' },
    { key: 'oarfish_naga', name: 'Oarfish Naga Palung', rarity: 'Legendary', spot: 'Palung' },
    { key: 'coelacanth_purba', name: 'Coelacanth Purba', rarity: 'Mythic', spot: 'Palung' },
    { key: 'raja_lele_gaib', name: 'Raja Lele Penunggu Rawa', rarity: 'Mythic', spot: 'Palung' }
  ];

  function diffBadge(level) {
    if (level === 'easy') return '<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;background:rgba(52,199,89,.18);color:#6DF0A0">🟢 MUDAH</span>';
    if (level === 'hard') return '<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;background:rgba(239,68,68,.2);color:#FCA5A5">🔴 SULIT</span>';
    return '<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;background:rgba(250,204,21,.18);color:#FDE047">🟡 SEDANG</span>';
  }

  function renderGamesTab() {
    var st = A.state;
    var fq = st.fishQuota || { left: 6, max: 6 };
    var dailyEarned = Number(st.dailyPscEarned || 0);
    var dailyCap = Number(st.dailyPscCap || 120);

    var coreGames = [
      {
        id: 'fish', em: '🎣', title: 'Mancing Galatama 2.0',
        diff: 'medium', tag: fq.left + '/' + fq.max + ' Kail',
        reward: '5–45 PSC',
        desc: '3 Spot (Pinggir/Tengah/Palung) & 15 spesies ikan langka.'
      },
      {
        id: 'scratch', em: '🎟️', title: 'Gosok Nasib 2.0',
        diff: 'easy', tag: st.scratchedToday ? 'Selesai' : 'Gratis 1x',
        reward: '10–50 PSC',
        desc: 'Gosok tiket harian berhadiah PSC, XP, atau item langka.'
      },
      {
        id: 'claw', em: '🕹️', title: 'Mesin Rongsok 2.0',
        diff: 'medium', tag: '3 Box',
        reward: '8–40 PSC',
        desc: 'Pilih Box Rongsok, Retro Y2K, atau Brankas Boss!'
      },
      {
        id: 'react', em: '⚡', title: 'Reaction Rush 2.0',
        diff: 'hard', tag: 'Refleks',
        reward: '5–25 PSC',
        desc: 'Uji kecepatan jari & fokus tanpa kena jebakan merah.'
      },
      {
        id: 'trivia', em: '🧠', title: 'Punk Trivia 2.0',
        diff: 'medium', tag: '5 Soal',
        reward: '6–30 PSC',
        desc: 'Kuis kilat ber-combo: Sains, Budaya Pop, & Logika.'
      }
    ];

    var extraGames = [
      {
        id: 'whack', em: '🔨', title: 'Gebuk Siapa?',
        diff: 'hard', tag: '30 Detik',
        reward: '5–25 PSC',
        desc: 'Gebuk tikus & bos berhelm, awas jangan pukul bom!'
      },
      {
        id: 'memory', em: '🃏', title: 'Adu Ingatan',
        diff: 'easy', tag: 'Grid 4x4',
        reward: '6–20 PSC',
        desc: 'Cocokkan 8 pasang kartu sehemat langkah mungkin.'
      }
    ];

    function buildCard(g) {
      return (
        '<button class="game-card" data-act="ar-open" data-game="' + g.id + '" style="position:relative;text-align:left;padding:12px;display:flex;flex-direction:column;gap:4px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-bottom:2px">' +
            diffBadge(g.diff) +
            '<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;background:rgba(56,189,248,.16);color:#7DD3FC">' + C.esc(g.tag) + '</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-top:2px">' +
            '<em style="font-size:26px;font-style:normal">' + g.em + '</em>' +
            '<div>' +
              '<b style="display:block;font-size:13px">' + C.esc(g.title) + '</b>' +
              '<span style="font-size:10px;color:#FFD633;font-weight:700">💰 ' + C.esc(g.reward) + '</span>' +
            '</div>' +
          '</div>' +
          '<small style="font-size:11px;line-height:1.35;opacity:.8;margin-top:2px">' + C.esc(g.desc) + '</small>' +
        '</button>'
      );
    }

    var antiGrindBanner =
      '<div class="card" style="padding:10px 12px;margin-bottom:12px;background:rgba(15,23,42,.85);border:1px solid rgba(255,214,51,.22)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px">' +
          '<span>⚖️ <b>Fair Economy Harian</b> (Anti-Grinding)</span>' +
          '<b style="color:#FFD633">' + dailyEarned + ' / ' + dailyCap + ' PSC</b>' +
        '</div>' +
        '<small style="display:block;opacity:.72;font-size:10px;margin-top:3px">Semakin sulit mode & makin tinggi skor, makin besar koinnya. Kalau limit harian penuh, tetap bisa main untuk XP & Fishdex!</small>' +
      '</div>';

    return (
      antiGrindBanner +
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
    var discoveredCount = Object.keys(uniqueFishKeys).length;
    var totalSpecies = Math.max(st.fishdexTotal || 15, FISH_SPECIES_PREVIEW.length);

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

    var fishdexGrid = FISH_SPECIES_PREVIEW.map(function (sp) {
      var found = !!uniqueFishKeys[sp.key];
      var rCol = A.rarityColor(sp.rarity);
      return (
        '<div style="padding:8px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid ' + (found ? rCol + '66' : 'rgba(255,255,255,.07)') + ';opacity:' + (found ? '1' : '.5') + '">' +
          '<div style="font-size:16px">' + (found ? '🐟' : '❓') + '</div>' +
          '<div style="font-size:11px;font-weight:700;margin-top:2px">' + (found ? C.esc(sp.name) : '???') + '</div>' +
          '<small style="font-size:9px;color:' + rCol + '">' + sp.rarity + ' · ' + sp.spot + '</small>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="card" style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div><b>📖 Ensiklopedia Fishdex</b><small style="display:block">Koleksi seluruh spesies ikan Nusantara & mistis</small></div>' +
          '<b style="color:#38BDF8">' + discoveredCount + ' / ' + totalSpecies + '</b>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">' + fishdexGrid + '</div>' +
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
            '<small>Pilih tingkat kesulitan · Hadiah makin gede di mode Sulit</small>' +
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
