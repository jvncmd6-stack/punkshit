(function () {
  var A = window.PunkArena = window.PunkArena || {};
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  // ==========================================
  // GAME 4: REACTION RUSH 2.0 (CLASSIC & BEST OF 5)
  // ==========================================
  A.openReaction2 = function () {
    A.clearGameLoops();
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
  };

  A.startReactionMode = async function (mode) {
    A.clearGameLoops();
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
      A.regTimeout(function () {
        if (!document.getElementById('rx-pad')) return;
        pad.style.background = '#22C55E';
        pad.textContent = 'TAP SEKARANG!!';
        startTime = performance.now();
        ready = true;
      }, delay);

      pad.onclick = async function () {
        if (!ready) {
          A.clearGameLoops();
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
          A.regTimeout(nextRound, 800);
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
            await A.loadArenaState(true);
          } catch (e) {
            out.textContent = e.message;
          }
        }
      };
    }

    nextRound();
  };

  // ==========================================
  // GAME 5: PUNK TRIVIA 2.0 (SERVER SESSION + COMBO)
  // ==========================================
  A.openTrivia2 = async function () {
    A.clearGameLoops();
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
            A.loadArenaState(true);
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
  };

  // ==========================================
  // EKSPANSI FASE 5: GEBUK SIAPA & ADU INGATAN
  // ==========================================
  A.openWhackGame = async function () {
    A.clearGameLoops();
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

    A.regInterval(function () {
      var cells = grid.querySelectorAll('button');
      cells.forEach(function (c) { c.textContent = '🕳️'; });
      activeIdx = Math.floor(Math.random() * 9);
      isBomb = Math.random() < 0.25;
      cells[activeIdx].textContent = isBomb ? '💣' : '👾';
    }, 650);

    A.regInterval(async function () {
      timeLeft--;
      var tEl = document.getElementById('wk-time');
      if (tEl) tEl.textContent = timeLeft + 's';
      if (timeLeft <= 0) {
        A.clearGameLoops();
        grid.innerHTML = '<div style="grid-column:1/-1;padding:16px;text-align:center">Waktu habis! Menyimpan skor...</div>';
        try {
          var res = await API.post('/api/arena/session/finish', { sessionId: ses.sessionId, result: { score: score } });
          if (res.user) S.user = res.user;
          document.getElementById('ar-res').textContent = res.resultText;
          C.notify('Mas Raka', 'Gebuk Siapa?', res.resultText);
          await A.loadArenaState(true);
        } catch (err) {
          document.getElementById('ar-res').textContent = err.message;
        }
      }
    }, 1000);
  };

  A.openMemoryGame = async function () {
    A.clearGameLoops();
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

    deck.forEach(function (sym) {
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
                await A.loadArenaState(true);
              } catch (err) {
                document.getElementById('ar-res').textContent = err.message;
              }
            }
          } else {
            lock = true;
            A.regTimeout(function () {
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
  };
})();
