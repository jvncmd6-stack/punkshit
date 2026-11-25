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
    if (level === 'easy') return '<span style="font-size:10px;font-weight:800;padding:3px 7px;border-radius:99px;background:rgba(109,240,160,.16);color:#6DF0A0;border:1px solid rgba(109,240,160,.25);white-space:nowrap;flex-shrink:0">🟢 MUDAH</span>';
    if (level === 'hard') return '<span style="font-size:10px;font-weight:800;padding:3px 7px;border-radius:99px;background:rgba(255,107,107,.16);color:#FF9E9E;border:1px solid rgba(255,107,107,.25);white-space:nowrap;flex-shrink:0">🔴 SULIT</span>';
    return '<span style="font-size:10px;font-weight:800;padding:3px 7px;border-radius:99px;background:rgba(255,214,51,.16);color:#FFE270;border:1px solid rgba(255,214,51,.25);white-space:nowrap;flex-shrink:0">🟡 SEDANG</span>';
  }

  function renderGamesTab() {
    var st = A.state;
    var fq = st.fishQuota || { left: 6, max: 6 };
    var dailyEarned = Number(st.dailyPscEarned || 0);
    var dailyCap = Number(st.dailyPscCap || 300);

    var coreGames = [
      {
        id: 'fish', em: '🎣', title: 'Mancing Galatama 2.0',
        diff: 'medium', tag: fq.left + '/' + fq.max + ' Kail',
        reward: '6–60 PSC',
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
        reward: '8–45 PSC',
        desc: 'Pilih Box Rongsok, Retro Y2K, atau Brankas Boss!'
      },
      {
        id: 'react', em: '⚡', title: 'Reaction Rush 2.0',
        diff: 'hard', tag: 'Refleks',
        reward: '5–32 PSC',
        desc: 'Uji kecepatan jari & fokus tanpa kena jebakan oranye.'
      },
      {
        id: 'trivia', em: '🧠', title: 'Punk Trivia 2.0',
        diff: 'medium', tag: '5–6 Soal',
        reward: '6–35 PSC',
        desc: 'Kuis kilat ber-combo: Sains, Budaya Pop, & Logika.'
      }
    ];

    var extraGames = [
      {
        id: 'whack', em: '🔨', title: 'Gebuk Siapa?',
        diff: 'hard', tag: '25 Detik',
        reward: '5–28 PSC',
        desc: 'Gebuk alien & bos mahkota, awas jangan pukul bom!'
      },
      {
        id: 'memory', em: '🃏', title: 'Adu Ingatan',
        diff: 'easy', tag: '3 Ukuran',
        reward: '5–26 PSC',
        desc: 'Cocokkan pasangan kartu sehemat langkah mungkin.'
      }
    ];

    function buildCard(g) {
      return (
        '<button class="game-card" data-act="ar-open" data-game="' + g.id + '" style="display:flex;flex-direction:column;justify-content:space-between;gap:8px;white-space:normal">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:4px;width:100%;flex-wrap:wrap">' +
            diffBadge(g.diff) +
            '<span style="font-size:10px;font-weight:800;padding:3px 7px;border-radius:99px;background:rgba(255,255,255,.1);color:#E0F2FE;white-space:nowrap;flex-shrink:0">' + C.esc(g.tag) + '</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:9px;width:100%;min-width:0">' +
            '<em style="font-style:normal;line-height:1;flex-shrink:0">' + g.em + '</em>' +
            '<div style="min-width:0;flex:1">' +
              '<b style="display:block;line-height:1.25;word-break:break-word">' + C.esc(g.title) + '</b>' +
              '<span style="display:block;font-size:11px;color:#FFD633;font-weight:800;margin-top:2px">💰 ' + C.esc(g.reward) + '</span>' +
            '</div>' +
          '</div>' +
          '<small style="display:block;font-size:11px;line-height:1.38;opacity:.76;white-space:normal;word-break:break-word">' + C.esc(g.desc) + '</small>' +
        '</button>'
      );
    }

    var antiGrindBanner =
      '<div class="card lg-ticker" style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;line-height:1.3">' +
          '<span style="min-width:0">⚖️ <b>Fair Economy Harian</b></span>' +
          '<b style="color:#FFD633;white-space:nowrap;flex-shrink:0">' + dailyEarned + ' / ' + dailyCap + ' PSC</b>' +
        '</div>' +
        '<small style="display:block;opacity:.76;font-size:11px;line-height:1.4;margin-top:5px">Makin sulit mode & makin tinggi skor, makin besar hadiahnya. Jika limit harian penuh, tetap bisa main untuk XP & Fishdex!</small>' +
      '</div>';

    return (
      antiGrindBanner +
      '<h3 class="gh">MAIN ARCADE (UPGRADE 2.0)</h3>' +
      '<div class="game-grid" style="align-items:stretch">' + coreGames.map(buildCard).join('') + '</div>' +
      '<h3 class="gh">ARCADE EKSPANSI</h3>' +
      '<div class="game-grid" style="align-items:stretch">' + extraGames.map(buildCard).join('') + '</div>'
    );
  }

  function renderQuestAndPassTab() {
    var st = A.state;
    var p = st.profile;
    var questsHtml = st.quests.map(function (q) {
      var btn = q.claimed
        ? '<button class="pill" style="flex-shrink:0" disabled>SELESAI</button>'
        : q.done
          ? '<button class="pill" style="background:#34C75933;color:#6df0a0;flex-shrink:0" data-act="ar-claim-quest" data-id="' + C.esc(q.id) + '">KLAIM +' + q.psc + ' PSC</button>'
          : '<span style="font-size:11px;color:var(--mut);font-weight:700;white-space:nowrap;flex-shrink:0">' + q.progress + '/' + q.target + '</span>';

      return (
        '<div class="rw" style="gap:10px">' +
          '<div style="min-width:0;flex:1"><b style="display:block;line-height:1.3">' + C.esc(q.title) + '</b><small style="display:block;line-height:1.35">' + C.esc(q.desc) + ' · +' + q.xp + ' XP</small></div>' +
          btn +
        '</div>'
      );
    }).join('') || '<div class="rw"><small>Memuat Daily Quest...</small></div>';

    var passHtml = st.passMilestones.map(function (m) {
      var unlocked = p.level >= m.level;
      var claimed = (p.claimedPass || []).indexOf(m.level) !== -1;
      var actionHtml = claimed
        ? '<button class="pill" style="flex-shrink:0" disabled>DIKLAIM</button>'
        : unlocked
          ? '<button class="pill" style="background:#FFD63333;color:#FFD633;flex-shrink:0" data-act="ar-claim-pass" data-lvl="' + m.level + '">AMBIL</button>'
          : '<span style="font-size:11px;opacity:.6;white-space:nowrap;flex-shrink:0">🔒 Lv.' + m.level + '</span>';

      return (
        '<div class="rw" style="gap:10px;opacity:' + (unlocked ? '1' : '.65') + '">' +
          '<div style="min-width:0;flex:1"><b style="display:block;line-height:1.3">Level ' + m.level + ' — ' + C.esc(m.label) + '</b><small style="display:block;line-height:1.35">' + (unlocked ? 'Target tercapai!' : 'Kumpulkan XP untuk membuka') + '</small></div>' +
          actionHtml +
        '</div>'
      );
    }).join('');

    return (
      '<h3 class="gh">DAILY QUEST (RESET 00.00 WIB)</h3>' +
      '<div class="grp">' + questsHtml + '</div>' +
      '<h3 class="gh">ARCADE PASS GRATIS</h3>' +
      '<div class="grp">' + passHtml + '</div>'
    );
  }

  function renderCollectionTab() {
    var st = A.state;
    var dailyEarned = Number(st.dailyPscEarned || 0);
    var dailyCap = Number(st.dailyPscCap || 300);
    var remCap = Math.max(0, dailyCap - dailyEarned);

    var activeItems = st.collections.filter(function (it) { return !it.is_sold; });
    var uniqueFishKeys = {};
    var uniqueClawKeys = {};
    st.collections.forEach(function (it) {
      if (it.category === 'fish') uniqueFishKeys[it.item_key] = true;
      if (it.category === 'claw') uniqueClawKeys[it.item_key || it.name] = true;
    });
    var discoveredCount = Object.keys(uniqueFishKeys).length;
    var clawCount = Object.keys(uniqueClawKeys).length;
    var totalSpecies = Math.max(st.fishdexTotal || 15, FISH_SPECIES_PREVIEW.length);

    var itemsHtml = activeItems.map(function (it) {
      var col = A.rarityColor(it.rarity);
      var icon = it.category === 'fish' ? '🐟' : it.category === 'claw' ? '🧸' : '🏆';
      var subText = it.weight > 0 ? (it.weight + ' kg · ') : (it.category === 'claw' ? 'Capit · ' : '');
      var rawPrice = Number(it.sell_price || 0);
      var actualSellPrice = remCap <= 0 ? 0 : Math.min(rawPrice, remCap);

      var sellBtn = rawPrice > 0
        ? (actualSellPrice > 0
            ? '<button class="pill" style="flex-shrink:0" data-act="ar-sell-item" data-id="' + it.id + '">Jual +' + actualSellPrice + ' PSC</button>'
            : '<button class="pill" style="opacity:.55;flex-shrink:0" disabled title="Kuota ' + dailyCap + ' PSC/hari sudah penuh">Limit ' + dailyCap + ' Penuh</button>')
        : '<span class="pill" style="opacity:.7;flex-shrink:0">Koleksi</span>';

      return (
        '<div class="rw" style="gap:10px">' +
          '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">' +
            '<span style="font-size:24px;flex-shrink:0">' + icon + '</span>' +
            '<div style="min-width:0;flex:1">' +
              '<b style="display:block;line-height:1.3;word-break:break-word">' + C.esc(it.name) + '</b>' +
              '<small style="color:' + col + ';font-weight:700;display:block;line-height:1.3">' + subText + C.esc(it.rarity) + '</small>' +
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
        '<div style="padding:10px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid ' + (found ? rCol + '77' : 'rgba(255,255,255,.08)') + ';opacity:' + (found ? '1' : '.52') + ';min-width:0;overflow:hidden">' +
          '<div style="font-size:18px;line-height:1.1">' + (found ? '🐟' : '❓') + '</div>' +
          '<div style="font-size:11px;font-weight:700;margin-top:4px;line-height:1.25;word-break:break-word">' + (found ? C.esc(sp.name) : '???') + '</div>' +
          '<small style="display:block;font-size:9.5px;color:' + rCol + ';margin-top:2px;line-height:1.2">' + sp.rarity + ' · ' + sp.spot + '</small>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="card" style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px">' +
          '<div style="min-width:0"><b>📖 Ensiklopedia Fishdex & Koleksi</b><small style="display:block;line-height:1.3">Ikan: ' + discoveredCount + '/' + totalSpecies + ' · Item Capit: ' + clawCount + '/12 · Kuota Jual Hari Ini: ' + dailyEarned + '/' + dailyCap + ' PSC</small></div>' +
          '<b style="color:#5CE1FF;white-space:nowrap;flex-shrink:0">' + discoveredCount + ' / ' + totalSpecies + '</b>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">' + fishdexGrid + '</div>' +
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
      return '<div class="rw" style="gap:8px"><div style="min-width:0;flex:1"><b style="display:block;word-break:break-word">' + medal + ' ' + C.esc(r.name) + '</b><small>Level ' + r.level + '</small></div><b style="color:#FFD633;white-space:nowrap;flex-shrink:0">' + r.xp + ' XP</b></div>';
    }).join('') || '<div class="rw"><small>Belum ada data XP.</small></div>';

    var reactHtml = reactList.map(function (r, i) {
      var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
      return '<div class="rw" style="gap:8px"><div style="min-width:0;flex:1"><b style="display:block;word-break:break-word">' + medal + ' ' + C.esc(r.name) + '</b></div><b style="color:#5CE1FF;white-space:nowrap;flex-shrink:0">' + Math.round(r.score) + ' ms</b></div>';
    }).join('') || '<div class="rw"><small>Belum ada rekor refleks.</small></div>';

    return (
      '<h3 class="gh">🏆 TOP ARCADE XP</h3>' +
      '<div class="grp">' + xpHtml + '</div>' +
      '<h3 class="gh">⚡ REKOR REACTION RUSH</h3>' +
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
      '<div class="grp lg-hero" style="margin-bottom:12px">' +
        '<div class="rw" style="align-items:flex-start;gap:10px">' +
          '<div style="min-width:0;flex:1">' +
            '<small style="display:block;color:#5CE1FF;font-weight:800;letter-spacing:.05em;line-height:1.3">🕹️ ARENA GABUT 2.0 · LIQUID ARCADE</small>' +
            '<div style="font-size:18px;font-weight:900;margin-top:3px;line-height:1.2">LEVEL ' + p.level + ' <span style="font-size:13px;color:var(--yel);font-weight:700">(' + (p.xp || 0) + ' XP)</span></div>' +
            '<small style="display:block;line-height:1.35;margin-top:4px;opacity:.85">Pilih tingkat kesulitan · Hadiah makin gede di mode Sulit</small>' +
          '</div>' +
          '<div style="text-align:right;flex-shrink:0">' +
            '<span class="pill" style="background:#FFD63326;color:#FFD633;white-space:nowrap">💰 ' + (S.user ? S.user.psc : 0) + ' PSC</span>' +
          '</div>' +
        '</div>' +
        '<div style="padding:2px 15px 15px">' +
          '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;opacity:.88;margin-bottom:6px">' +
            '<span>Progress Lv.' + (p.level + 1) + '</span><span>' + xpInLevel + ' / 150 XP</span>' +
          '</div>' +
          '<div class="lg-xp">' +
            '<i style="width:' + pct + '%"></i>' +
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
