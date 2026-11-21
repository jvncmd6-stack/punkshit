(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var arenaState = {
    loaded: false,
    loading: false,
    tab: 'games', // 'games' | 'quest' | 'bag' | 'rank'
    profile: { xp: 0, level: 1, claimedPass: [], dailyStats: {}, personalBests: {} },
    passMilestones: [],
    quests: [],
    fishQuota: { used: 0, max: 6, left: 6, cooldownEndsAt: 0 },
    scratchedToday: false,
    collections: [],
    fishdexTotal: 6,
    leaderboards: { react: [], xp: [] }
  };

  // Pembersih timer/loop aktif saat modal ditutup
  var activeLoops = [];
  function clearGameLoops() {
    while (activeLoops.length) {
      var item = activeLoops.pop();
      if (item.type === 'interval') clearInterval(item.id);
      else if (item.type === 'timeout') clearTimeout(item.id);
      else if (item.type === 'raf') cancelAnimationFrame(item.id);
    }
  }
  function regTimeout(fn, ms) {
    var id = setTimeout(fn, ms);
    activeLoops.push({ type: 'timeout', id: id });
    return id;
  }
  function regInterval(fn, ms) {
    var id = setInterval(fn, ms);
    activeLoops.push({ type: 'interval', id: id });
    return id;
  }

  async function loadArenaState(forceRefresh) {
    if (arenaState.loading) return;
    arenaState.loading = true;
    try {
      var res = await API.get('/api/arena/state');
      arenaState.profile = res.profile || arenaState.profile;
      arenaState.passMilestones = res.passMilestones || [];
      arenaState.quests = res.quests || [];
      arenaState.fishQuota = res.fishQuota || arenaState.fishQuota;
      arenaState.scratchedToday = Boolean(res.scratchedToday);
      arenaState.collections = res.collections || [];
      arenaState.fishdexTotal = res.fishdexTotal || 6;
      arenaState.leaderboards = res.leaderboards || { react: [], xp: [] };
      arenaState.loaded = true;
      if (S.curApp === 'arena' && forceRefresh) C.refresh();
    } catch (e) {
      // Fallback diam jika offline
    } finally {
      arenaState.loading = false;
    }
  }

  function rarityColor(r) {
    if (r === 'Legendary') return '#FFD633';
    if (r === 'Epic') return '#C084FC';
    if (r === 'Rare') return '#38BDF8';
    if (r === 'Uncommon') return '#4ADE80';
    return '#94A3B8';
  }

  // ==========================================
  // 1. RENDER LOBBY UTAMA ARENA GABUT 2.0
  // ==========================================
  function renderArena() {
    if (!arenaState.loaded && !arenaState.loading) {
      loadArenaState(true);
    }

    var p = arenaState.profile;
    var xpInLevel = (p.xp || 0) % 150;
    var pct = Math.min(100, Math.round((xpInLevel / 150) * 100));
    var claimableQuestCount = arenaState.quests.filter(function (q) { return q.done && !q.claimed; }).length;
    var claimablePassCount = arenaState.passMilestones.filter(function (m) {
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
        '<button class="tab' + (arenaState.tab === 'games' ? ' on' : '') + '" data-act="ar-tab" data-tab="games">🎮 Games</button>' +
        '<button class="tab' + (arenaState.tab === 'quest' ? ' on' : '') + '" data-act="ar-tab" data-tab="quest">🎯 Quest' + (badgeCount ? ' (' + badgeCount + ')' : '') + '</button>' +
        '<button class="tab' + (arenaState.tab === 'bag' ? ' on' : '') + '" data-act="ar-tab" data-tab="bag">🎒 Koleksi</button>' +
        '<button class="tab' + (arenaState.tab === 'rank' ? ' on' : '') + '" data-act="ar-tab" data-tab="rank">🏆 Rank</button>' +
      '</div>';

    var content = '';
    if (arenaState.tab === 'games') content = renderGamesTab();
    else if (arenaState.tab === 'quest') content = renderQuestAndPassTab();
    else if (arenaState.tab === 'bag') content = renderCollectionTab();
    else if (arenaState.tab === 'rank') content = renderRankTab();

    return headerCard + navTabs + content;
  }

  function renderGamesTab() {
    var fq = arenaState.fishQuota;
    var coreGames = [
      { id: 'fish', em: '🎣', title: 'Mancing Galatama 2.0', tag: fq.left + '/' + fq.max + ' Kail', desc: 'Tarik ikan pakai Tension Meter & lengkapi Fishdex.' },
      { id: 'scratch', em: '🎟️', title: 'Gosok Nasib 2.0', tag: arenaState.scratchedToday ? 'Selesai' : 'Gratis 1x', desc: 'Gosok kartu interaktif untuk ungkap hadiah harian.' },
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
    var p = arenaState.profile;
    var questsHtml = arenaState.quests.map(function (q) {
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

    var passHtml = arenaState.passMilestones.map(function (m) {
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
    var activeItems = arenaState.collections.filter(function (it) { return !it.is_sold; });
    var uniqueFishKeys = {};
    arenaState.collections.forEach(function (it) {
      if (it.category === 'fish') uniqueFishKeys[it.item_key] = true;
    });
    var discoveredFish = Object.keys(uniqueFishKeys).length;

    var itemsHtml = activeItems.map(function (it) {
      var col = rarityColor(it.rarity);
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
          '<b style="color:#38BDF8">' + discoveredFish + ' / ' + arenaState.fishdexTotal + ' Jenis</b>' +
        '</div>' +
      '</div>' +
      '<h3 class="gh">TAS KOLEKSI & TANGKAPAN (' + activeItems.length + ')</h3>' +
      '<div class="grp">' + itemsHtml + '</div>'
    );
  }

  function renderRankTab() {
    var xpList = arenaState.leaderboards.xp || [];
    var reactList = arenaState.leaderboards.react || [];

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

  // ==========================================
  // 2. GAME 1: MANCING GALATAMA 2.0 (TENSION METER)
  // ==========================================
  function openFishing2() {
    clearGameLoops();
    var left = arenaState.fishQuota.left;
    C.sheet(
      '<h2>🎣 Mancing Galatama 2.0</h2>' +
      '<p class="sub">Pilih titik lempar kail. Saat ikan menyambar, <b>tahan / tap tombol TARIK</b> untuk menjaga indikator tetap di zona hijau!</p>' +
      '<div id="fish-stage" style="background:linear-gradient(180deg,#0369A1,#0F172A);border:1px solid rgba(56,189,248,.35);border-radius:16px;padding:16px;margin:10px 0;text-align:center">' +
        '<div style="font-size:12px;color:#BAE6FD;margin-bottom:10px">Sisa Kesempatan: <b>' + left + ' / 6</b></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">' +
          '<button class="btn b2" style="margin:0;padding:10px 6px;font-size:12px" data-act="fish-cast" data-spot="pinggir"' + (left <= 0 ? ' disabled' : '') + '>🌿 Pinggir</button>' +
          '<button class="btn b2" style="margin:0;padding:10px 6px;font-size:12px" data-act="fish-cast" data-spot="tengah"' + (left <= 0 ? ' disabled' : '') + '>🌊 Tengah</button>' +
          '<button class="btn b2" style="margin:0;padding:10px 6px;font-size:12px" data-act="fish-cast" data-spot="palung"' + (left <= 0 ? ' disabled' : '') + '>🕳️ Palung</button>' +
        '</div>' +
      '</div>' +
      '<div id="ar-res" style="font-size:13px;font-weight:700;color:var(--yel);min-height:20px"></div>'
    );
  }

  async function startFishingCast(spot) {
    var stage = document.getElementById('fish-stage');
    var out = document.getElementById('ar-res');
    if (!stage) return;
    stage.innerHTML = '<div style="font-size:34px;margin:10px 0">🌊🪝</div><div>Melempar kail ke area <b>' + C.esc(spot) + '</b>...</div>';
    out.textContent = '';

    try {
      var ses = await API.post('/api/arena/session/start', { game: 'fish', mode: spot });
      stage.innerHTML =
        '<div style="font-size:38px;animation:pulse 1s infinite">🔴</div>' +
        '<div style="margin-top:6px;font-weight:700">Menunggu sambaran ikan...</div>' +
        '<small style="color:#BAE6FD">' + C.esc(ses.rarityHint || 'Siapkan jari kamu!') + '</small>';

      regTimeout(function () {
        startFishingTension(ses.sessionId, ses.tensionDifficulty || 0.5);
      }, ses.biteDelayMs || 2000);
    } catch (err) {
      stage.innerHTML = '<div style="color:#FCA5A5">' + C.esc(err.message) + '</div>';
    }
  }

  function startFishingTension(sessionId, difficulty) {
    var stage = document.getElementById('fish-stage');
    if (!stage) return;

    var barPos = 45;     // posisi indikator pemain (0..100)
    var zoneCenter = 50; // pusat zona hijau
    var zoneWidth = Math.max(22, Math.round(42 - difficulty * 20));
    var catchProg = 25;  // 0..100 (100 = dapat, 0 = lepas)
    var pulling = false;
    var finished = false;

    stage.innerHTML =
      '<div style="font-weight:900;color:#FFD633;margin-bottom:6px">⚡ IKAN MENYAMBAR! JAGA DI ZONA HIJAU!</div>' +
      '<div style="font-size:11px;margin-bottom:4px">Progress Tarikan: <b id="fish-prog-txt">25%</b></div>' +
      '<div style="height:10px;background:#1E293B;border-radius:99px;overflow:hidden;margin-bottom:12px">' +
        '<div id="fish-prog-bar" style="height:100%;width:25%;background:#34C759"></div>' +
      '</div>' +
      '<div style="position:relative;height:24px;background:#0F172A;border:1px solid #38BDF8;border-radius:12px;overflow:hidden;margin-bottom:14px">' +
        '<div id="fish-zone" style="position:absolute;top:0;bottom:0;left:35%;width:' + zoneWidth + '%;background:rgba(52,199,89,.45);border-left:2px solid #4ADE80;border-right:2px solid #4ADE80"></div>' +
        '<div id="fish-needle" style="position:absolute;top:2px;bottom:2px;left:45%;width:8px;background:#FFD633;border-radius:4px;box-shadow:0 0 8px #FFD633"></div>' +
      '</div>' +
      '<button id="fish-pull-btn" class="btn" style="margin:0;user-select:none;-webkit-user-select:none">🎣 TAHAN / TAP TARIK KAIL</button>';

    var btn = document.getElementById('fish-pull-btn');
    if (btn) {
      btn.onpointerdown = function () { pulling = true; };
      btn.onpointerup = btn.onpointercancel = btn.onpointerleave = function () { pulling = false; };
    }

    var tick = 0;
    regInterval(async function () {
      if (finished) return;
      tick++;

      // Gerakan zona hijau dinamis
      zoneCenter = 50 + Math.sin(tick * (0.06 + difficulty * 0.05)) * 24;
      var zoneLeft = Math.max(0, Math.min(100 - zoneWidth, zoneCenter - zoneWidth / 2));

      // Fisika tarikan kail
      if (pulling) barPos += 2.6;
      else barPos -= (1.5 + difficulty * 0.9);
      barPos = Math.max(0, Math.min(100, barPos));

      var inZone = barPos >= zoneLeft && barPos <= (zoneLeft + zoneWidth);
      if (inZone) catchProg += 1.8;
      else catchProg -= (1.2 + difficulty * 0.6);

      var zEl = document.getElementById('fish-zone');
      var nEl = document.getElementById('fish-needle');
      var pBar = document.getElementById('fish-prog-bar');
      var pTxt = document.getElementById('fish-prog-txt');

      if (zEl) zEl.style.left = zoneLeft + '%';
      if (nEl) nEl.style.left = 'calc(' + barPos + '% - 4px)';
      if (pBar) pBar.style.width = Math.max(0, Math.min(100, catchProg)) + '%';
      if (pTxt) pTxt.textContent = Math.max(0, Math.min(100, Math.round(catchProg))) + '%';

      if (catchProg >= 100 || catchProg <= 0) {
        finished = true;
        clearGameLoops();
        var caught = catchProg >= 100;
        stage.innerHTML = '<div>' + (caught ? '🎉 Ikan berhasil ditarik! Mencatat hasil...' : '💨 Tali kendur, ikan lepas...') + '</div>';
        try {
          var res = await API.post('/api/arena/session/finish', {
            sessionId: sessionId,
            result: { caught: caught }
          });
          if (res.user) S.user = res.user;
          document.getElementById('ar-res').textContent = res.resultText;
          C.notify('Mas Raka', 'Mancing Galatama', res.resultText);
          await loadArenaState(true);
        } catch (err) {
          document.getElementById('ar-res').textContent = err.message;
        }
      }
    }, 50);
  }

  // ==========================================
  // 3. GAME 2: GOSOK NASIB 2.0 (CANVAS SCRATCH)
  // ==========================================
  async function openScratch2() {
    clearGameLoops();
    if (arenaState.scratchedToday) {
      return C.sheet(
        '<h2>🎟️ Gosok Nasib 2.0</h2>' +
        '<p class="sub">Kartu gratis hari ini sudah digosok. Balik lagi besok ya!</p>' +
        '<button class="btn b2" data-act="shut">TUTUP</button>'
      );
    }

    C.sheet(
      '<h2>🎟️ Gosok Nasib 2.0</h2>' +
      '<p class="sub">Gosok lapisan perak di bawah pakai jari/mouse sampai minimal <b>70%</b> terbuka!</p>' +
      '<div id="scratch-wrap" style="position:relative;width:260px;height:130px;margin:12px auto;border-radius:16px;overflow:hidden;border:2px solid #FFD633;background:linear-gradient(135deg,#1E293B,#0F172A);display:grid;place-items:center">' +
        '<div id="scratch-prize" style="font-size:20px;font-weight:900;color:#FFD633;text-align:center;padding:10px">Memuat kartu...</div>' +
        '<canvas id="scratch-cv" width="260" height="130" style="position:absolute;inset:0;touch-action:none;cursor:pointer"></canvas>' +
      '</div>' +
      '<div id="ar-res" style="font-size:13px;font-weight:700;color:var(--yel);min-height:22px">Gosok kartunya sekarang!</div>'
    );

    try {
      var ses = await API.post('/api/arena/session/start', { game: 'scratch', mode: 'daily' });
      var prizeEl = document.getElementById('scratch-prize');
      var cv = document.getElementById('scratch-cv');
      if (!cv || !prizeEl) return;

      prizeEl.textContent = ses.prizePreview || 'HADIAH MISTERI';
      var ctx = cv.getContext('2d');
      var grad = ctx.createLinearGradient(0, 0, 260, 130);
      grad.addColorStop(0, '#94A3B8');
      grad.addColorStop(0.5, '#E2E8F0');
      grad.addColorStop(1, '#64748B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 260, 130);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨ GOSOK DI SINI ✨', 130, 70);

      var drawing = false;
      var revealed = false;

      function scratchAt(clientX, clientY) {
        if (revealed) return;
        var rect = cv.getBoundingClientRect();
        var x = (clientX - rect.left) * (cv.width / rect.width);
        var y = (clientY - rect.top) * (cv.height / rect.height);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();
        checkProgress();
      }

      async function checkProgress() {
        if (revealed) return;
        var img = ctx.getImageData(0, 0, 260, 130).data;
        var transparent = 0;
        var total = img.length / 4;
        for (var i = 3; i < img.length; i += 16) {
          if (img[i] < 128) transparent++;
        }
        var ratio = transparent / (total / 4);
        if (ratio >= 0.65) {
          revealed = true;
          cv.style.display = 'none';
          document.getElementById('ar-res').textContent = 'Mengamankan hadiah ke server...';
          try {
            var res = await API.post('/api/arena/session/finish', { sessionId: ses.sessionId, result: {} });
            if (res.user) S.user = res.user;
            document.getElementById('ar-res').textContent = res.resultText;
            C.notify('Mas Raka', 'Gosok Nasib', res.resultText);
            await loadArenaState(true);
          } catch (e) {
            document.getElementById('ar-res').textContent = e.message;
          }
        }
      }

      cv.onpointerdown = function (e) { drawing = true; scratchAt(e.clientX, e.clientY); };
      cv.onpointermove = function (e) { if (drawing) scratchAt(e.clientX, e.clientY); };
      cv.onpointerup = cv.onpointercancel = function () { drawing = false; };
    } catch (err) {
      document.getElementById('ar-res').textContent = err.message;
    }
  }

  // ==========================================
  // 4. GAME 3: MESIN RONGSOK 2.0 (INTERACTIVE CLAW)
  // ==========================================
  async function openClaw2() {
    clearGameLoops();
    C.sheet(
      '<h2>🕹️ Mesin Rongsok 2.0</h2>' +
      '<p class="sub">Arahkan capit tepat ke tengah kapsul hadiah lalu tekan <b>CAPIT!</b></p>' +
      '<div style="position:relative;height:150px;background:linear-gradient(180deg,#1E293B,#090D16);border:2px solid #38BDF8;border-radius:16px;margin:10px 0;overflow:hidden">' +
        '<div id="claw-arm" style="position:absolute;top:0;left:50%;transform:translateX(-50%);transition:left .08s, height .35s;height:36px;display:flex;flex-direction:column;align-items:center">' +
          '<div style="width:4px;flex:1;background:#94A3B8"></div>' +
          '<div style="font-size:24px;line-height:1">🪝</div>' +
        '</div>' +
        '<div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);font-size:32px">🎁🧸🔮</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:8px">' +
        '<button id="claw-left" class="btn b2" style="margin:0">⬅️ KIRI</button>' +
        '<button id="claw-drop" class="btn" style="margin:0">⬇️ CAPIT!</button>' +
        '<button id="claw-right" class="btn b2" style="margin:0">KANAN ➡️</button>' +
      '</div>' +
      '<div id="ar-res" style="margin-top:10px;font-size:13px;font-weight:700;color:var(--yel)">Memanaskan mesin capit...</div>'
    );

    try {
      var ses = await API.post('/api/arena/session/start', { game: 'claw', mode: 'arcade' });
      var pos = 20 + Math.floor(Math.random() * 60);
      var dropped = false;
      var arm = document.getElementById('claw-arm');
      var out = document.getElementById('ar-res');
      if (arm) arm.style.left = pos + '%';
      if (out) out.textContent = 'Target terdeteksi: ' + (ses.targetHint || 'Item Misteri') + ' [' + (ses.rarity || 'Rare') + ']';

      function move(delta) {
        if (dropped) return;
        pos = Math.max(12, Math.min(88, pos + delta));
        if (arm) arm.style.left = pos + '%';
      }

      document.getElementById('claw-left').onclick = function () { move(-9); };
      document.getElementById('claw-right').onclick = function () { move(9); };
      document.getElementById('claw-drop').onclick = async function () {
        if (dropped) return;
        dropped = true;
        if (arm) arm.style.height = '112px';
        out.textContent = 'Menurunkan capit...';
        regTimeout(async function () {
          if (arm) arm.style.height = '36px';
          try {
            var res = await API.post('/api/arena/session/finish', {
              sessionId: ses.sessionId,
              result: { dropPos: pos }
            });
            if (res.user) S.user = res.user;
            out.textContent = res.resultText;
            C.notify('Mas Raka', 'Mesin Rongsok', res.resultText);
            await loadArenaState(true);
          } catch (e) {
            out.textContent = e.message;
          }
        }, 450);
      };
    } catch (err) {
      document.getElementById('ar-res').textContent = err.message;
    }
  }

  // ==========================================
  // 5. GAME 4: REACTION RUSH 2.0 (CLASSIC & BEST OF 5)
  // ==========================================
  function openReaction2() {
    clearGameLoops();
    C.sheet(
      '<h2>⚡ Reaction Rush 2.0</h2>' +
      '<p class="sub">Pilih mode refleks. Tekan kotak segera setelah berubah menjadi <b>HIJAU</b>!</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +
        '<button class="btn b2" style="margin:0" data-act="rx-start" data-mode="classic">⚡ Classic (1x)</button>' +
        '<button class="btn" style="margin:0" data-act="rx-start" data-mode="bo5">🔥 Best of Five (5x)</button>' +
      '</div>' +
      '<div id="rx-area"></div>' +
      '<div id="ar-res" style="margin-top:8px;font-size:13px;font-weight:700;color:var(--yel)"></div>'
    );
  }

  async function startReactionMode(mode) {
    clearGameLoops();
    var totalRounds = mode === 'bo5' ? 5 : 1;
    var round = 0;
    var times = [];
    var ready = false;
    var startTime = 0;
    var sesId = '';

    var area = document.getElementById('rx-area');
    var out = document.getElementById('ar-res');
    area.innerHTML = '<div style="padding:20px;text-align:center">Menyiapkan sesi...</div>';

    try {
      var ses = await API.post('/api/arena/session/start', { game: 'react', mode: mode });
      sesId = ses.sessionId;
    } catch (err) {
      area.innerHTML = '<div style="color:#FCA5A5">' + C.esc(err.message) + '</div>';
      return;
    }

    function nextRound() {
      round++;
      ready = false;
      area.innerHTML =
        '<button id="rx-pad" style="width:100%;height:145px;border-radius:18px;background:#EF4444;color:#fff;font-size:18px;font-weight:900;border:none">' +
          'Ronde ' + round + '/' + totalRounds + ' — TUNGGU HIJAU...' +
        '</button>';

      var pad = document.getElementById('rx-pad');
      var delay = 1200 + Math.floor(Math.random() * 2200);
      regTimeout(function () {
        if (!document.getElementById('rx-pad')) return;
        pad.style.background = '#22C55E';
        pad.textContent = 'TAP SEKARANG!!';
        startTime = performance.now();
        ready = true;
      }, delay);

      pad.onclick = async function () {
        if (!ready) {
          clearGameLoops();
          pad.style.background = '#64748B';
          pad.textContent = 'FALSE START! (Terlalu Cepat)';
          out.textContent = 'Klik mode di atas untuk mengulang.';
          return;
        }
        ready = false;
        var ms = Math.round(performance.now() - startTime);
        times.push(ms);
        pad.style.background = '#0284C7';
        pad.textContent = ms + ' ms!';

        if (round < totalRounds) {
          out.textContent = 'Skor ronde ' + round + ': ' + ms + ' ms. Bersiap ronde berikutnya...';
          regTimeout(nextRound, 800);
        } else {
          var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
          out.textContent = 'Menghitung rata-rata ' + avg + ' ms di server...';
          try {
            var res = await API.post('/api/arena/session/finish', {
              sessionId: sesId,
              result: { avgMs: avg, rounds: times }
            });
            if (res.user) S.user = res.user;
            out.textContent = res.resultText;
            C.notify('Mas Raka', 'Reaction Rush', res.resultText);
            await loadArenaState(true);
          } catch (e) {
            out.textContent = e.message;
          }
        }
      };
    }

    nextRound();
  }

  // ==========================================
  // 6. GAME 5: PUNK TRIVIA 2.0 (SERVER SESSION + COMBO)
  // ==========================================
  async function openTrivia2() {
    clearGameLoops();
    C.sheet(
      '<h2>🧠 Punk Trivia 2.0</h2>' +
      '<p class="sub">5 pertanyaan acak dari server · Combo beruntun menambah bonus XP!</p>' +
      '<div id="triv-box" style="margin-top:10px">Mengambil soal dari server...</div>'
    );

    try {
      var ses = await API.post('/api/arena/session/start', { game: 'trivia', mode: 'standard' });
      var questions = ses.questions || [];
      var idx = 0;
      var answers = [];

      function renderQ() {
        var box = document.getElementById('triv-box');
        if (!box) return;
        if (idx >= questions.length) {
          box.innerHTML = '<div style="padding:16px;text-align:center;font-weight:700">Memeriksa jawaban di server...</div>';
          API.post('/api/arena/session/finish', {
            sessionId: ses.sessionId,
            result: { answers: answers }
          }).then(function (res) {
            if (res.user) S.user = res.user;
            box.innerHTML =
              '<div style="padding:14px;background:rgba(56,189,248,.14);border-radius:14px;text-align:center">' +
                '<div style="font-size:16px;font-weight:900;color:#FFD633;margin-bottom:8px">' + C.esc(res.resultText) + '</div>' +
                '<button class="btn" data-act="shut">SELESAI</button>' +
              '</div>';
            C.notify('Mas Raka', 'Punk Trivia', res.resultText);
            loadArenaState(true);
          }).catch(function (err) {
            box.innerHTML = '<div style="color:#FCA5A5">' + C.esc(err.message) + '</div>';
          });
          return;
        }

        var q = questions[idx];
        box.innerHTML =
          '<div style="display:flex;justify-content:space-between;font-size:11px;color:#38BDF8;font-weight:800;margin-bottom:6px">' +
            '<span>SOAL ' + (idx + 1) + ' / ' + questions.length + '</span>' +
            '<span>Kategori: ' + C.esc(q.cat) + '</span>' +
          '</div>' +
          '<div style="font-size:14.5px;font-weight:700;margin-bottom:10px;line-height:1.4">' + C.esc(q.q) + '</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
            q.opts.map(function (opt, optIdx) {
              return '<button class="btn b2 triv-opt" data-opt="' + optIdx + '" style="margin:0;text-align:left">' + C.esc(opt) + '</button>';
            }).join('') +
          '</div>';

        box.querySelectorAll('.triv-opt').forEach(function (b) {
          b.onclick = function () {
            answers.push(Number(b.getAttribute('data-opt')));
            idx++;
            renderQ();
          };
        });
      }

      renderQ();
    } catch (err) {
      document.getElementById('triv-box').innerHTML = '<div style="color:#FCA5A5">' + C.esc(err.message) + '</div>';
    }
  }

  // ==========================================
  // 7. EKSPANSI FASE 5: GEBUK SIAPA & ADU INGATAN
  // ==========================================
  async function openWhackGame() {
    clearGameLoops();
    C.sheet(
      '<h2>🔨 Gebuk Siapa?</h2>' +
      '<p class="sub">Tap karakter 👾 (+15 poin), jangan tap bom 💣 (-20 poin)! Waktu: <b>25 detik</b>.</p>' +
      '<div style="display:flex;justify-content:space-between;font-weight:800;margin:8px 0">' +
        '<span>Skor: <b id="wk-score" style="color:#FFD633">0</b></span>' +
        '<span>Sisa Waktu: <b id="wk-time" style="color:#38BDF8">25s</b></span>' +
      '</div>' +
      '<div id="wk-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0"></div>' +
      '<div id="ar-res" style="font-size:13px;font-weight:700;color:var(--yel)"></div>'
    );

    var ses;
    try {
      ses = await API.post('/api/arena/session/start', { game: 'whack', mode: 'arcade' });
    } catch (e) {
      document.getElementById('ar-res').textContent = e.message;
      return;
    }

    var score = 0;
    var timeLeft = 25;
    var activeIdx = -1;
    var isBomb = false;
    var grid = document.getElementById('wk-grid');

    for (var i = 0; i < 9; i++) {
      var cell = document.createElement('button');
      cell.className = 'btn b2';
      cell.style.cssText = 'margin:0;height:68px;font-size:28px;display:grid;place-items:center';
      cell.setAttribute('data-idx', i);
      cell.textContent = '🕳️';
      cell.onclick = function () {
        var idx = Number(this.getAttribute('data-idx'));
        if (idx !== activeIdx) return;
        activeIdx = -1;
        this.textContent = isBomb ? '💥' : '✨';
        score = Math.max(0, score + (isBomb ? -20 : 15));
        document.getElementById('wk-score').textContent = score;
      };
      grid.appendChild(cell);
    }

    regInterval(function () {
      var cells = grid.querySelectorAll('button');
      cells.forEach(function (c) { c.textContent = '🕳️'; });
      activeIdx = Math.floor(Math.random() * 9);
      isBomb = Math.random() < 0.25;
      cells[activeIdx].textContent = isBomb ? '💣' : '👾';
    }, 650);

    regInterval(async function () {
      timeLeft--;
      var tEl = document.getElementById('wk-time');
      if (tEl) tEl.textContent = timeLeft + 's';
      if (timeLeft <= 0) {
        clearGameLoops();
        grid.innerHTML = '<div style="grid-column:1/-1;padding:16px;text-align:center">Waktu habis! Menyimpan skor...</div>';
        try {
          var res = await API.post('/api/arena/session/finish', { sessionId: ses.sessionId, result: { score: score } });
          if (res.user) S.user = res.user;
          document.getElementById('ar-res').textContent = res.resultText;
          C.notify('Mas Raka', 'Gebuk Siapa?', res.resultText);
          await loadArenaState(true);
        } catch (err) {
          document.getElementById('ar-res').textContent = err.message;
        }
      }
    }, 1000);
  }

  async function openMemoryGame() {
    clearGameLoops();
    C.sheet(
      '<h2>🃏 Adu Ingatan (4x4)</h2>' +
      '<p class="sub">Cocokkan semua 8 pasang kartu sehemat langkah mungkin!</p>' +
      '<div style="display:flex;justify-content:space-between;font-weight:800;margin:6px 0">' +
        '<span>Langkah: <b id="mem-moves" style="color:#FFD633">0</b></span>' +
        '<span>Cocok: <b id="mem-pairs" style="color:#4ADE80">0 / 8</b></span>' +
      '</div>' +
      '<div id="mem-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0"></div>' +
      '<div id="ar-res" style="font-size:13px;font-weight:700;color:var(--yel)"></div>'
    );

    var ses;
    try {
      ses = await API.post('/api/arena/session/start', { game: 'memory', mode: '4x4' });
    } catch (e) {
      document.getElementById('ar-res').textContent = e.message;
      return;
    }

    var icons = ['🎸', '🔥', '👑', '⚡', '🎣', '🎟️', '🕹️', '💀'];
    var deck = icons.concat(icons).sort(function () { return Math.random() - 0.5; });
    var flipped = [];
    var matched = 0;
    var moves = 0;
    var lock = false;
    var grid = document.getElementById('mem-grid');

    deck.forEach(function (sym, idx) {
      var card = document.createElement('button');
      card.className = 'btn b2';
      card.style.cssText = 'margin:0;height:56px;font-size:22px;padding:0';
      card.textContent = '❓';
      card.onclick = async function () {
        if (lock || card.dataset.open === '1') return;
        card.dataset.open = '1';
        card.textContent = sym;
        flipped.push({ el: card, sym: sym });

        if (flipped.length === 2) {
          moves++;
          document.getElementById('mem-moves').textContent = moves;
          if (flipped[0].sym === flipped[1].sym) {
            matched++;
            document.getElementById('mem-pairs').textContent = matched + ' / 8';
            flipped = [];
            if (matched === 8) {
              var score = Math.max(50, 320 - moves * 10);
              document.getElementById('ar-res').textContent = 'Selesai dalam ' + moves + ' langkah! Mengirim skor...';
              try {
                var res = await API.post('/api/arena/session/finish', { sessionId: ses.sessionId, result: { score: score } });
                if (res.user) S.user = res.user;
                document.getElementById('ar-res').textContent = res.resultText;
                C.notify('Mas Raka', 'Adu Ingatan', res.resultText);
                await loadArenaState(true);
              } catch (err) {
                document.getElementById('ar-res').textContent = err.message;
              }
            }
          } else {
            lock = true;
            regTimeout(function () {
              flipped[0].el.textContent = '❓';
              flipped[1].el.textContent = '❓';
              flipped[0].el.dataset.open = '0';
              flipped[1].el.dataset.open = '0';
              flipped = [];
              lock = false;
            }, 550);
          }
        }
      };
      grid.appendChild(card);
    });
  }

  // ==========================================
  // 8. EVENT HANDLERS GLOBAL ARENA
  // ==========================================
  C.Views.arena = renderArena;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'shut') {
      clearGameLoops();
    } else if (act === 'ar-tab') {
      arenaState.tab = t.getAttribute('data-tab');
      C.refresh();
    } else if (act === 'ar-open') {
      var gm = t.getAttribute('data-game');
      if (gm === 'fish') openFishing2();
      else if (gm === 'scratch') openScratch2();
      else if (gm === 'claw') openClaw2();
      else if (gm === 'react') openReaction2();
      else if (gm === 'trivia') openTrivia2();
      else if (gm === 'whack') openWhackGame();
      else if (gm === 'memory') openMemoryGame();
    } else if (act === 'fish-cast') {
      startFishingCast(t.getAttribute('data-spot'));
    } else if (act === 'rx-start') {
      startReactionMode(t.getAttribute('data-mode'));
    } else if (act === 'ar-claim-quest') {
      t.disabled = true;
      try {
        var qRes = await API.post('/api/arena/quest/claim', { questId: t.getAttribute('data-id') });
        if (qRes.user) S.user = qRes.user;
        C.notify('Mas Raka', 'Daily Quest', qRes.message);
        await loadArenaState(true);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'ar-claim-pass') {
      t.disabled = true;
      try {
        var pRes = await API.post('/api/arena/pass/claim', { level: Number(t.getAttribute('data-lvl')) });
        if (pRes.user) S.user = pRes.user;
        C.notify('Mas Raka', 'Arcade Pass', pRes.message);
        await loadArenaState(true);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    } else if (act === 'ar-sell-item') {
      t.disabled = true;
      try {
        var sRes = await API.post('/api/arena/fish/sell', { collectionId: Number(t.getAttribute('data-id')) });
        if (sRes.user) S.user = sRes.user;
        C.notify('Mas Raka', 'Lapak Ikan', sRes.message);
        await loadArenaState(true);
      } catch (err) {
        t.disabled = false;
        C.notify('Mas Raka', 'Info', err.message);
      }
    }
  });
})();
