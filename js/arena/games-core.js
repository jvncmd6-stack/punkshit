(function () {
  var A = window.PunkArena = window.PunkArena || {};
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var FISH_POOLS = {
    pinggir: [
      { key: 'lele_kaleng', name: 'Lele Kaleng Sarden', rarity: 'Common', weight: 0.8, price: 6 },
      { key: 'mujair_punk', name: 'Mujair Mohawk', rarity: 'Common', weight: 1.1, price: 7 },
      { key: 'nila_neon', name: 'Nila Neon', rarity: 'Common', weight: 1.3, price: 8 },
      { key: 'gabus_preman', name: 'Gabus Preman Kali', rarity: 'Uncommon', weight: 2.4, price: 12 }
    ],
    tengah: [
      { key: 'bawal_baja', name: 'Bawal Baja', rarity: 'Uncommon', weight: 3.1, price: 14 },
      { key: 'gurame_asap', name: 'Gurame Asap Sunda', rarity: 'Uncommon', weight: 3.8, price: 16 },
      { key: 'patin_emas', name: 'Patin Emas Cipaganti', rarity: 'Rare', weight: 5.5, price: 22 },
      { key: 'kakap_merah', name: 'Kakap Merah Karang', rarity: 'Rare', weight: 6.2, price: 24 },
      { key: 'arwana_super', name: 'Arwana Super Red', rarity: 'Epic', weight: 4.9, price: 32 }
    ],
    palung: [
      { key: 'pari_listrik', name: 'Pari Listrik Tegangan Tinggi', rarity: 'Epic', weight: 14.5, price: 34 },
      { key: 'hiu_martil', name: 'Hiu Martil Besi', rarity: 'Epic', weight: 28.0, price: 36 },
      { key: 'tuna_sirip_biru', name: 'Tuna Sirip Biru', rarity: 'Legendary', weight: 42.0, price: 42 },
      { key: 'oarfish_naga', name: 'Oarfish Naga Palung', rarity: 'Legendary', weight: 55.0, price: 45 },
      { key: 'coelacanth_purba', name: 'Coelacanth Purba', rarity: 'Mythic', weight: 68.0, price: 55 },
      { key: 'raja_lele_gaib', name: 'Raja Lele Penunggu Rawa', rarity: 'Mythic', weight: 77.7, price: 60 }
    ]
  };

  var CLAW_BOXES = {
    rongsok: {
      title: '🟢 Box Rongsok (Mudah)',
      diff: 0.35,
      rewardHint: '8–14 PSC',
      items: [
        { name: 'Kaset Pita Walkman Kusut', rarity: 'Common', icon: '📼', price: 8 },
        { name: 'Pin Peniti Tengkorak', rarity: 'Common', icon: '🧷', price: 9 },
        { name: 'Komik Bekas Tahun 98', rarity: 'Uncommon', icon: '📘', price: 12 },
        { name: 'Kacamata Hitam Pixel', rarity: 'Uncommon', icon: '🕶️', price: 14 }
      ]
    },
    retro: {
      title: '🟡 Box Retro Y2K (Sedang)',
      diff: 0.65,
      rewardHint: '15–26 PSC',
      items: [
        { name: 'Tamagotchi Jadul Nyala', rarity: 'Rare', icon: '🥚', price: 16 },
        { name: 'GameBoy Transparan Ungu', rarity: 'Rare', icon: '👾', price: 20 },
        { name: 'Walkman Sony Kuning', rarity: 'Epic', icon: '🎧', price: 24 },
        { name: 'Skateboard Mini TechDeck', rarity: 'Epic', icon: '🛹', price: 26 }
      ]
    },
    boss: {
      title: '🔴 Brankas Boss (Sulit)',
      diff: 0.92,
      rewardHint: '28–45 PSC',
      items: [
        { name: 'Jaket Kulit Studded Edisi Tour', rarity: 'Legendary', icon: '🧥', price: 32 },
        { name: 'Gitar Listrik Mini Gibson', rarity: 'Legendary', icon: '🎸', price: 36 },
        { name: 'Helm Retro Chrome Punk', rarity: 'Mythic', icon: '🪖', price: 42 },
        { name: 'Kunci Brankas Mas Raka', rarity: 'Mythic', icon: '🗝️', price: 45 }
      ]
    }
  };

  // ==========================================
  // GAME 1: MANCING GALATAMA 2.0 (TENSION METER)
  // ==========================================
  A.openFishing2 = function () {
    A.clearGameLoops();
    var left = A.state.fishQuota.left;
    C.sheet(
      '<h2>🎣 Mancing Galatama 2.0</h2>' +
      '<p class="sub">Pilih spot memancing sesuai nyali. Makin dalam airnya, makin liar tarikan ikannya tapi makin mahal harga jualnya!</p>' +
      '<div id="fish-stage" style="background:linear-gradient(180deg,#0369A1,#0F172A);border:1px solid rgba(56,189,248,.35);border-radius:16px;padding:14px;margin:10px 0">' +
        '<div style="text-align:center;font-size:12px;color:#BAE6FD;margin-bottom:10px">Sisa Kail Hari Ini: <b>' + left + ' / 6</b></div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
          '<button class="btn b2" style="margin:0;text-align:left;padding:10px 12px" data-act="fish-cast" data-spot="pinggir"' + (left <= 0 ? ' disabled' : '') + '>' +
            '<div style="display:flex;justify-content:space-between"><b>🌿 Pinggir Kali (🟢 Mudah)</b><span style="color:#FFD633;font-size:12px">6–12 PSC</span></div>' +
            '<small style="display:block;opacity:.75;font-weight:400">Zona hijau lebar · Lele Kaleng, Mujair Mohawk, Gabus Preman</small>' +
          '</button>' +
          '<button class="btn b2" style="margin:0;text-align:left;padding:10px 12px" data-act="fish-cast" data-spot="tengah"' + (left <= 0 ? ' disabled' : '') + '>' +
            '<div style="display:flex;justify-content:space-between"><b>🌊 Tengah Danau (🟡 Sedang)</b><span style="color:#FFD633;font-size:12px">14–32 PSC</span></div>' +
            '<small style="display:block;opacity:.75;font-weight:400">Ikan mulai berontak · Gurame Asap, Patin Emas, Arwana Super Red</small>' +
          '</button>' +
          '<button class="btn b2" style="margin:0;text-align:left;padding:10px 12px;border-color:rgba(248,113,113,.4)" data-act="fish-cast" data-spot="palung"' + (left <= 0 ? ' disabled' : '') + '>' +
            '<div style="display:flex;justify-content:space-between"><b>🕳️ Palung Dalam (🔴 Sulit)</b><span style="color:#FFD633;font-size:12px">34–60 PSC</span></div>' +
            '<small style="display:block;opacity:.75;font-weight:400">Arus bawah air liar · Hiu Martil, Oarfish Naga, Raja Lele Gaib</small>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div id="ar-res" style="font-size:13px;font-weight:700;color:var(--yel);min-height:20px"></div>'
    );
  };

  function startFishingTension(sessionId, difficulty, spot, previewFish) {
    var stage = document.getElementById('fish-stage');
    if (!stage) return;

    var diffBoost = spot === 'palung' ? 0.88 : spot === 'tengah' ? 0.58 : 0.32;
    var effDiff = Math.max(difficulty || 0.4, diffBoost);

    var barPos = 45;
    var zoneCenter = 50;
    var zoneWidth = Math.max(18, Math.round(44 - effDiff * 24));
    var catchProg = 26;
    var pulling = false;
    var finished = false;

    stage.innerHTML =
      '<div style="text-align:center;font-weight:900;color:#FFD633;margin-bottom:4px">⚡ TARIKAN BERAT! JAGA DI ZONA HIJAU!</div>' +
      '<div style="text-align:center;font-size:11px;color:#BAE6FD;margin-bottom:8px">Spot: <b>' + C.esc(spot.toUpperCase()) + '</b> · Progress: <b id="fish-prog-txt">26%</b></div>' +
      '<div style="height:10px;background:#1E293B;border-radius:99px;overflow:hidden;margin-bottom:12px">' +
        '<div id="fish-prog-bar" style="height:100%;width:26%;background:linear-gradient(90deg,#38BDF8,#34C759)"></div>' +
      '</div>' +
      '<div style="position:relative;height:26px;background:#0F172A;border:1px solid #38BDF8;border-radius:12px;overflow:hidden;margin-bottom:14px">' +
        '<div id="fish-zone" style="position:absolute;top:0;bottom:0;left:35%;width:' + zoneWidth + '%;background:rgba(52,199,89,.45);border-left:2px solid #4ADE80;border-right:2px solid #4ADE80"></div>' +
        '<div id="fish-needle" style="position:absolute;top:2px;bottom:2px;left:45%;width:9px;background:#FFD633;border-radius:4px;box-shadow:0 0 8px #FFD633"></div>' +
      '</div>' +
      '<button id="fish-pull-btn" class="btn" style="margin:0;user-select:none;-webkit-user-select:none">🎣 TAHAN / TAP TARIK KAIL</button>';

    var btn = document.getElementById('fish-pull-btn');
    if (btn) {
      btn.onpointerdown = function () { pulling = true; };
      btn.onpointerup = btn.onpointercancel = btn.onpointerleave = function () { pulling = false; };
    }

    var tick = 0;
    A.regInterval(async function () {
      if (finished) return;
      tick++;

      var erratic = spot === 'palung' ? Math.cos(tick * 0.17) * 9 : 0;
      zoneCenter = 50 + Math.sin(tick * (0.055 + effDiff * 0.055)) * 24 + erratic;
      var zoneLeft = Math.max(0, Math.min(100 - zoneWidth, zoneCenter - zoneWidth / 2));

      if (pulling) barPos += 2.75;
      else barPos -= (1.45 + effDiff * 0.95);
      barPos = Math.max(0, Math.min(100, barPos));

      var inZone = barPos >= zoneLeft && barPos <= (zoneLeft + zoneWidth);
      if (inZone) catchProg += 1.75;
      else catchProg -= (1.1 + effDiff * 0.7);

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
        A.clearGameLoops();
        var caught = catchProg >= 100;
        stage.innerHTML = '<div style="text-align:center">' + (caught ? '🎉 Strike! Mengangkat tangkapan ke darat...' : '💨 Senar kendur, ikan kabur ke dalam air...') + '</div>';
        try {
          var res = await API.post('/api/arena/session/finish', {
            sessionId: sessionId,
            result: { caught: caught, spot: spot, suggestedSpecies: previewFish }
          });
          if (res.user) S.user = res.user;
          document.getElementById('ar-res').textContent = res.resultText;
          C.notify('Mas Raka', 'Mancing Galatama', res.resultText);
          await A.loadArenaState(true);
        } catch (err) {
          document.getElementById('ar-res').textContent = err.message;
        }
      }
    }, 50);
  }

  A.startFishingCast = async function (spot) {
    var stage = document.getElementById('fish-stage');
    var out = document.getElementById('ar-res');
    if (!stage) return;

    var pool = FISH_POOLS[spot] || FISH_POOLS.pinggir;
    var previewFish = pool[Math.floor(Math.random() * pool.length)];

    stage.innerHTML = '<div style="text-align:center"><div style="font-size:34px;margin:10px 0">🌊🪝</div><div>Melempar kail ke area <b>' + C.esc(spot.toUpperCase()) + '</b>...</div></div>';
    out.textContent = '';

    try {
      var ses = await API.post('/api/arena/session/start', { game: 'fish', mode: spot });
      stage.innerHTML =
        '<div style="text-align:center">' +
          '<div style="font-size:38px;animation:pulse 1s infinite">🔴</div>' +
          '<div style="margin-top:6px;font-weight:700">Pelampung bergetar...</div>' +
          '<small style="color:#BAE6FD">' + C.esc(ses.rarityHint || ('Aura tangkapan: ' + previewFish.rarity)) + '</small>' +
        '</div>';

      A.regTimeout(function () {
        startFishingTension(ses.sessionId, ses.tensionDifficulty || 0.5, spot, previewFish);
      }, ses.biteDelayMs || 1800);
    } catch (err) {
      stage.innerHTML = '<div style="color:#FCA5A5;text-align:center">' + C.esc(err.message) + '</div>';
    }
  };

  // ==========================================
  // GAME 2: GOSOK NASIB 2.0 (CANVAS SCRATCH)
  // ==========================================
  A.openScratch2 = async function () {
    A.clearGameLoops();
    if (A.state.scratchedToday) {
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
            await A.loadArenaState(true);
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
  };

  // ==========================================
  // GAME 3: MESIN RONGSOK 2.0 (3 TIER BOX)
  // ==========================================
  A.openClaw2 = function () {
    A.clearGameLoops();
    C.sheet(
      '<h2>🕹️ Mesin Rongsok 2.0</h2>' +
      '<p class="sub">Pilih mesin capit! Di <b>Brankas Boss</b>, kapsul hadiah ikut bergeser jadi butuh timing ekstra presisi.</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin:10px 0">' +
        '<button class="btn b2" style="margin:0;text-align:left;padding:10px 12px" data-act="claw-mode" data-box="rongsok">' +
          '<div style="display:flex;justify-content:space-between"><b>🟢 Box Rongsok (Mudah)</b><span style="color:#FFD633;font-size:12px">8–14 PSC</span></div>' +
          '<small style="display:block;opacity:.75;font-weight:400">Kapsul diam · Kaset Walkman, Pin Peniti, Komik Bekas</small>' +
        '</button>' +
        '<button class="btn b2" style="margin:0;text-align:left;padding:10px 12px" data-act="claw-mode" data-box="retro">' +
          '<div style="display:flex;justify-content:space-between"><b>🟡 Box Retro Y2K (Sedang)</b><span style="color:#FFD633;font-size:12px">16–26 PSC</span></div>' +
          '<small style="display:block;opacity:.75;font-weight:400">Kapsul goyang pelan · Tamagotchi, GameBoy Ungu, Walkman</small>' +
        '</button>' +
        '<button class="btn b2" style="margin:0;text-align:left;padding:10px 12px;border-color:rgba(248,113,113,.4)" data-act="claw-mode" data-box="boss">' +
          '<div style="display:flex;justify-content:space-between"><b>🔴 Brankas Boss (Sulit)</b><span style="color:#FFD633;font-size:12px">32–45 PSC</span></div>' +
          '<small style="display:block;opacity:.75;font-weight:400">Kapsul bergerak cepat · Jaket Kulit Tour, Gitar Gibson, Helm Chrome</small>' +
        '</button>' +
      '</div>'
    );
  };

  async function startClawBox(boxKey) {
    A.clearGameLoops();
    var box = CLAW_BOXES[boxKey] || CLAW_BOXES.rongsok;
    var prizeItem = box.items[Math.floor(Math.random() * box.items.length)];

    C.sheet(
      '<h2>🕹️ ' + C.esc(box.title) + '</h2>' +
      '<p class="sub">Sejajarkan capit tepat di atas <b>' + C.esc(prizeItem.icon + ' ' + prizeItem.name) + '</b> lalu tekan <b>CAPIT!</b></p>' +
      '<div style="position:relative;height:156px;background:linear-gradient(180deg,#1E293B,#090D16);border:2px solid #38BDF8;border-radius:16px;margin:10px 0;overflow:hidden">' +
        '<div id="claw-arm" style="position:absolute;top:0;left:50%;transform:translateX(-50%);transition:left .07s, height .35s;height:36px;display:flex;flex-direction:column;align-items:center;z-index:2">' +
          '<div style="width:4px;flex:1;background:#94A3B8"></div>' +
          '<div style="font-size:24px;line-height:1">🪝</div>' +
        '</div>' +
        '<div id="claw-target" style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);font-size:32px;transition:left .08s">' + prizeItem.icon + '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:8px">' +
        '<button id="claw-left" class="btn b2" style="margin:0">⬅️ KIRI</button>' +
        '<button id="claw-drop" class="btn" style="margin:0">⬇️ CAPIT!</button>' +
        '<button id="claw-right" class="btn b2" style="margin:0">KANAN ➡️</button>' +
      '</div>' +
      '<div id="ar-res" style="margin-top:10px;font-size:13px;font-weight:700;color:var(--yel)">Memanaskan mesin capit...</div>'
    );

    try {
      var ses = await API.post('/api/arena/session/start', { game: 'claw', mode: boxKey });
      var pos = 20 + Math.floor(Math.random() * 60);
      var targetPos = 50;
      var dropped = false;
      var arm = document.getElementById('claw-arm');
      var tgt = document.getElementById('claw-target');
      var out = document.getElementById('ar-res');

      if (arm) arm.style.left = pos + '%';
      if (out) out.textContent = 'Target: ' + prizeItem.name + ' [' + prizeItem.rarity + ' · ~' + prizeItem.price + ' PSC]';

      if (boxKey !== 'rongsok') {
        var tick = 0;
        var speed = boxKey === 'boss' ? 0.11 : 0.055;
        var amp = boxKey === 'boss' ? 32 : 18;
        A.regInterval(function () {
          if (dropped) return;
          tick++;
          targetPos = 50 + Math.sin(tick * speed) * amp;
          if (tgt) tgt.style.left = targetPos + '%';
        }, 50);
      }

      function move(delta) {
        if (dropped) return;
        pos = Math.max(12, Math.min(88, pos + delta));
        if (arm) arm.style.left = pos + '%';
      }

      document.getElementById('claw-left').onclick = function () { move(-8); };
      document.getElementById('claw-right').onclick = function () { move(8); };
      document.getElementById('claw-drop').onclick = async function () {
        if (dropped) return;
        dropped = true;
        A.clearGameLoops();
        if (arm) arm.style.height = '114px';
        out.textContent = 'Menurunkan capit...';
        var accuracy = Math.max(0, Math.round(100 - Math.abs(pos - targetPos) * 2.5));
        A.regTimeout(async function () {
          if (arm) arm.style.height = '36px';
          try {
            var res = await API.post('/api/arena/session/finish', {
              sessionId: ses.sessionId,
              result: { dropPos: pos, targetPos: Math.round(targetPos), accuracy: accuracy, box: boxKey, suggestedItem: prizeItem }
            });
            if (res.user) S.user = res.user;
            out.textContent = res.resultText;
            C.notify('Mas Raka', 'Mesin Rongsok', res.resultText);
            await A.loadArenaState(true);
          } catch (e) {
            out.textContent = e.message;
          }
        }, 450);
      };
    } catch (err) {
      document.getElementById('ar-res').textContent = err.message;
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act="claw-mode"]');
    if (!btn) return;
    startClawBox(btn.getAttribute('data-box') || 'rongsok');
  });
})();
