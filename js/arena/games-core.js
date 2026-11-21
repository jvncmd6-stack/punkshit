(function () {
  var A = window.PunkArena = window.PunkArena || {};
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  // ==========================================
  // GAME 1: MANCING GALATAMA 2.0 (TENSION METER)
  // ==========================================
  A.openFishing2 = function () {
    A.clearGameLoops();
    var left = A.state.fishQuota.left;
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
  };

  function startFishingTension(sessionId, difficulty) {
    var stage = document.getElementById('fish-stage');
    if (!stage) return;

    var barPos = 45;
    var zoneCenter = 50;
    var zoneWidth = Math.max(22, Math.round(42 - difficulty * 20));
    var catchProg = 25;
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
    A.regInterval(async function () {
      if (finished) return;
      tick++;

      zoneCenter = 50 + Math.sin(tick * (0.06 + difficulty * 0.05)) * 24;
      var zoneLeft = Math.max(0, Math.min(100 - zoneWidth, zoneCenter - zoneWidth / 2));

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
        A.clearGameLoops();
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
    stage.innerHTML = '<div style="font-size:34px;margin:10px 0">🌊🪝</div><div>Melempar kail ke area <b>' + C.esc(spot) + '</b>...</div>';
    out.textContent = '';

    try {
      var ses = await API.post('/api/arena/session/start', { game: 'fish', mode: spot });
      stage.innerHTML =
        '<div style="font-size:38px;animation:pulse 1s infinite">🔴</div>' +
        '<div style="margin-top:6px;font-weight:700">Menunggu sambaran ikan...</div>' +
        '<small style="color:#BAE6FD">' + C.esc(ses.rarityHint || 'Siapkan jari kamu!') + '</small>';

      A.regTimeout(function () {
        startFishingTension(ses.sessionId, ses.tensionDifficulty || 0.5);
      }, ses.biteDelayMs || 2000);
    } catch (err) {
      stage.innerHTML = '<div style="color:#FCA5A5">' + C.esc(err.message) + '</div>';
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
  // GAME 3: MESIN RONGSOK 2.0 (INTERACTIVE CLAW)
  // ==========================================
  A.openClaw2 = async function () {
    A.clearGameLoops();
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
        A.regTimeout(async function () {
          if (arm) arm.style.height = '36px';
          try {
            var res = await API.post('/api/arena/session/finish', {
              sessionId: ses.sessionId,
              result: { dropPos: pos }
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
  };
})();
