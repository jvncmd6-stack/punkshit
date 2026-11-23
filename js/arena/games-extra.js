(function () {
  var A = window.PunkArena = window.PunkArena || {};
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var OPTION_BTN_STYLE =
    'margin:0;height:auto;min-height:unset;width:100%;display:block;text-align:left;' +
    'padding:11px 13px;white-space:normal;line-height:1.35;overflow:visible;';

  function renderChoiceBtn(act, attrName, attrVal, titleText, priceText, descText, extraStyle) {
    return (
      '<button class="btn b2" style="' + OPTION_BTN_STYLE + (extraStyle || '') + '" data-act="' + act + '" ' + attrName + '="' + attrVal + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:3px">' +
          '<b style="font-size:13px;line-height:1.25">' + titleText + '</b>' +
          '<span style="color:#FFD633;font-size:11px;font-weight:800;white-space:nowrap;flex-shrink:0">' + priceText + '</span>' +
        '</div>' +
        '<div style="font-size:11px;opacity:.78;font-weight:400;line-height:1.35;white-space:normal">' + descText + '</div>' +
      '</button>'
    );
  }

  var LOCAL_TRIVIA_BANK = {
    easy: [
      { cat: 'Nusantara', q: 'Apa nama ibu kota Provinsi Jawa Barat?', opts: ['Bandung', 'Bogor', 'Cirebon', 'Bekasi'], ans: 0 },
      { cat: 'Budaya Pop', q: 'Platform musik dengan logo gelombang hijau yang sering dipakai dengar lagu indie adalah...', opts: ['SoundCloud', 'Spotify', 'Deezer', 'Bandcamp'], ans: 1 },
      { cat: 'Sains Dasar', q: 'Planet terdekat dengan Matahari di tata surya kita adalah...', opts: ['Venus', 'Mars', 'Merkurius', 'Bumi'], ans: 2 },
      { cat: 'Logika', q: 'Jika kemarin adalah hari Rabu, maka lusa adalah hari...', opts: ['Jumat', 'Sabtu', 'Minggu', 'Kamis'], ans: 1 },
      { cat: 'Umum', q: 'Simbol kimia untuk air murni adalah...', opts: ['CO2', 'H2O', 'O2', 'NaCl'], ans: 1 },
      { cat: 'Kuliner', q: 'Makanan khas Bandung berbahan dasar aci yang digoreng dan dibumbui pedas adalah...', opts: ['Pempek', 'Cireng', 'Gudeg', 'Rawon'], ans: 1 },
      { cat: 'Teknologi', q: 'Tombol pintasan keyboard untuk menyalin (Copy) teks di Windows adalah...', opts: ['Ctrl + V', 'Ctrl + X', 'Ctrl + C', 'Ctrl + Z'], ans: 2 },
      { cat: 'Musik', q: 'Berapa jumlah senar standar pada gitar akustik biasa?', opts: ['4 senar', '5 senar', '6 senar', '7 senar'], ans: 2 },
      { cat: 'Alam', q: 'Hewan mamalia terbesar yang hidup di lautan adalah...', opts: ['Hiu Paus', 'Paus Biru', 'Orca', 'Cumi Raksasa'], ans: 1 },
      { cat: 'Olahraga', q: 'Berapa jumlah pemain inti dalam satu tim sepak bola di lapangan?', opts: ['9 orang', '10 orang', '11 orang', '12 orang'], ans: 2 },
      { cat: 'Nusantara', q: 'Danau vulkanik terbesar di Indonesia yang berada di Sumatera Utara adalah...', opts: ['Danau Maninjau', 'Danau Toba', 'Danau Singkarak', 'Danau Poso'], ans: 1 },
      { cat: 'Logika', q: 'Bulan apa dalam kalender Masehi yang memiliki 28 atau 29 hari?', opts: ['Januari', 'Februari', 'April', 'September'], ans: 1 }
    ],
    medium: [
      { cat: 'Musik Indie', q: 'Lagu "Cincin" yang populer di skena indie Indonesia dinyanyikan oleh...', opts: ['Sal Priadi', 'Hindia', 'Pamungkas', 'Kunto Aji'], ans: 1 },
      { cat: 'Sains', q: 'Bagian mata manusia yang berfungsi mengatur banyak sedikitnya cahaya yang masuk adalah...', opts: ['Retina', 'Kornea', 'Pupil & Iris', 'Lensa'], ans: 2 },
      { cat: 'Sejarah', q: 'Konferensi Asia Afrika (KAA) pertama kali diselenggarakan di kota Bandung pada tahun...', opts: ['1950', '1955', '1960', '1965'], ans: 1 },
      { cat: 'Teknologi', q: 'Format gambar yang mendukung latar belakang transparan serta animasi ringan di web adalah...', opts: ['JPEG', 'BMP', 'WEBP', 'TIFF'], ans: 2 },
      { cat: 'Geografi', q: 'Selat yang memisahkan Pulau Jawa dan Pulau Sumatera adalah...', opts: ['Selat Bali', 'Selat Sunda', 'Selat Malaka', 'Selat Makassar'], ans: 1 },
      { cat: 'Logika', q: 'Lanjutkan deret angka berikut: 2, 6, 12, 20, 30, ...', opts: ['38', '40', '42', '44'], ans: 2 },
      { cat: 'Astronomi', q: 'Satelit alami terbesar yang mengorbit planet Saturnus bernama...', opts: ['Europa', 'Ganymede', 'Titan', 'Phobos'], ans: 2 },
      { cat: 'Budaya Pop', q: 'Istilah "Y2K" merujuk pada estetika dan budaya populer di sekitar pergantian tahun...', opts: ['1990', '2000', '2010', '1980'], ans: 1 },
      { cat: 'Sains', q: 'Gas yang paling banyak menyusun atmosfer Bumi (sekitar 78%) adalah...', opts: ['Oksigen', 'Karbon Dioksida', 'Nitrogen', 'Argon'], ans: 2 },
      { cat: 'Teknik', q: 'Satuan standar internasional (SI) untuk mengukur kuat arus listrik adalah...', opts: ['Volt', 'Watt', 'Ampere', 'Ohm'], ans: 2 },
      { cat: 'Nusantara', q: 'Alat musik tradisional Jawa Barat yang terbuat dari bambu dan dimainkan dengan digoyangkan adalah...', opts: ['Sasando', 'Angklung', 'Kolintang', 'Tifa'], ans: 1 },
      { cat: 'Logika', q: 'Sebuah jam dinding berbunyi 3 kali dalam 6 detik. Berapa detik waktu yang dibutuhkan untuk berbunyi 6 kali?', opts: ['12 detik', '15 detik', '18 detik', '10 detik'], ans: 1 }
    ],
    hard: [
      { cat: 'Fisika', q: 'Fenomena pembelokan cahaya saat melewati celah sempit atau tepi penghalang disebut...', opts: ['Refraksi', 'Difraksi', 'Polarisasi', 'Dispersi'], ans: 1 },
      { cat: 'Sejarah Dunia', q: 'Perpustakaan kuno paling terkenal di dunia Mediterania yang terletak di Mesir adalah Perpustakaan...', opts: ['Pergamum', 'Alexandria', 'Nineveh', 'Ephesus'], ans: 1 },
      { cat: 'Logika Ketat', q: 'Jika semua A adalah B, dan sebagian B adalah C, maka kesimpulan yang PASTI benar adalah...', opts: ['Semua A adalah C', 'Sebagian A adalah C', 'Semua B adalah A', 'Tidak dapat dipastikan A bagian dari C'], ans: 3 },
      { cat: 'Biologi', q: 'Organel sel yang dijuluki sebagai "powerhouse of the cell" penghasil energi ATP adalah...', opts: ['Ribosom', 'Mitokondria', 'Lisosom', 'Badan Golgi'], ans: 1 },
      { cat: 'Teknologi', q: 'Dalam protokol HTTP, kode status 403 memiliki arti...', opts: ['Not Found', 'Unauthorized', 'Forbidden', 'Bad Gateway'], ans: 2 },
      { cat: 'Geografi Dunia', q: 'Titik terdalam di samudra Bumi yang terletak di Samudra Pasifik adalah Palung...', opts: ['Tonga', 'Mariana', 'Java', 'Puerto Rico'], ans: 1 },
      { cat: 'Matematika', q: 'Berapa nilai dari 2^5 + 3^3?', opts: ['59', '57', '61', '55'], ans: 0 },
      { cat: 'Kimia', q: 'Unsur kimia dengan nomor atom 79 yang memiliki simbol Au adalah...', opts: ['Perak', 'Platinum', 'Emas', 'Raksa'], ans: 2 },
      { cat: 'Astronomi', q: 'Jarak rata-rata dari Bumi ke Matahari yang dijadikan satuan astronomi (1 AU) adalah sekitar...', opts: ['15 juta km', '150 juta km', '1,5 miliar km', '384 ribu km'], ans: 1 },
      { cat: 'Sejarah', q: 'Kerajaan maritim besar di Nusantara yang berpusat di Sumatera dan menguasai jalur Selat Malaka adalah...', opts: ['Majapahit', 'Singhasari', 'Sriwijaya', 'Tarumanegara'], ans: 2 },
      { cat: 'Logika', q: 'Ada 3 saklar di luar ruangan tertutup untuk 1 bohlam di dalam. Kamu hanya boleh masuk 1 kali untuk tahu saklar mana yang menyalakannya. Caranya?', opts: ['Nyalakan semua', 'Nyalakan 1 lama lalu matikan, nyalakan 1 lagi, cek panas & cahaya bohlam', 'Tebak acak', 'Nyalakan bergantian 1 detik'], ans: 1 },
      { cat: 'Sains', q: 'Kecepatan cahaya di ruang hampa mendekati angka...', opts: ['300.000 km/detik', '30.000 km/detik', '3.000 km/detik', '150.000 km/detik'], ans: 0 }
    ]
  };

  function pickQuestionsForTier(tier, serverQuestions) {
    var bank = (LOCAL_TRIVIA_BANK[tier] || LOCAL_TRIVIA_BANK.medium).slice();
    bank.sort(function () { return Math.random() - 0.5; });
    var count = tier === 'hard' ? 6 : 5;
    if (tier === 'medium' && Array.isArray(serverQuestions) && serverQuestions.length >= 5) {
      return { questions: serverQuestions, isLocalCheck: false };
    }
    return { questions: bank.slice(0, count), isLocalCheck: true };
  }

  // ==========================================
  // GAME 4: REACTION RUSH 2.0
  // ==========================================
  A.openReaction2 = function () {
    A.clearGameLoops();
    C.sheet(
      '<h2>⚡ Reaction Rush 2.0</h2>' +
      '<p class="sub">Pilih tingkat refleks! Di mode <b>Nightmare</b>, hati-hati terhadap sinyal jebakan <b>ORANYE</b>.</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">' +
        renderChoiceBtn('rx-start', 'data-mode', 'classic', '🟢 Classic · Mudah (1x)', '5–10 PSC', '1 ronde pemanasan · Tap begitu kotak berubah hijau') +
        renderChoiceBtn('rx-start', 'data-mode', 'bo5', '🟡 Best of Five · Sedang (5x)', '12–20 PSC', 'Uji konsistensi 5 ronde berturut-turut tanpa false start') +
        renderChoiceBtn('rx-start', 'data-mode', 'nightmare', '🔴 Nightmare Trap · Sulit (6x)', '20–32 PSC', '6 ronde cepat + umpan warna ORANYE palsu (jangan dipencet!)', 'border-color:rgba(248,113,113,.45);') +
      '</div>' +
      '<div id="rx-area"></div>' +
      '<div id="ar-res" style="margin-top:8px;font-size:13px;font-weight:700;color:var(--yel)"></div>'
    );
  };

  A.startReactionMode = async function (mode) {
    A.clearGameLoops();
    var totalRounds = mode === 'nightmare' ? 6 : mode === 'bo5' ? 5 : 1;
    var round = 0;
    var times = [];
    var ready = false;
    var startTime = 0;
    var sesId = '';

    var area = document.getElementById('rx-area');
    var out = document.getElementById('ar-res');
    area.innerHTML = '<div style="padding:20px;text-align:center">Menyiapkan sesi...</div>';

    try {
      var ses = await API.post('/api/arena/session/start', { game: 'react', mode: mode === 'nightmare' ? 'bo5' : mode });
      sesId = ses.sessionId;
    } catch (err) {
      area.innerHTML = '<div style="color:#FCA5A5">' + C.esc(err.message) + '</div>';
      return;
    }

    function nextRound() {
      round++;
      ready = false;
      area.innerHTML =
        '<button id="rx-pad" style="width:100%;height:145px;border-radius:18px;background:#EF4444;color:#fff;font-size:16px;font-weight:900;border:none;padding:12px">' +
          'Ronde ' + round + '/' + totalRounds + ' — TUNGGU HIJAU...' +
        '</button>';

      var pad = document.getElementById('rx-pad');
      var delay = 1100 + Math.floor(Math.random() * 2000);
      var hasFakeout = mode === 'nightmare' && Math.random() < 0.55;

      if (hasFakeout) {
        A.regTimeout(function () {
          if (!document.getElementById('rx-pad') || ready) return;
          pad.style.background = '#F97316';
          pad.textContent = '⚠️ JEBAKAN ORANYE! TAHAN!';
        }, Math.max(500, delay - 650));
      }

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
          out.textContent = 'Klik tingkat kesulitan di atas untuk mengulang.';
          return;
        }
        ready = false;
        var ms = Math.round(performance.now() - startTime);
        times.push(ms);
        pad.style.background = '#0284C7';
        pad.textContent = ms + ' ms!';

        if (round < totalRounds) {
          out.textContent = 'Skor ronde ' + round + ': ' + ms + ' ms. Bersiap ronde berikutnya...';
          A.regTimeout(nextRound, 700);
        } else {
          var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
          out.textContent = 'Menghitung rata-rata ' + avg + ' ms di server...';
          try {
            var res = await API.post('/api/arena/session/finish', {
              sessionId: sesId,
              result: { avgMs: avg, rounds: times, tier: mode }
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
  // GAME 5: PUNK TRIVIA 2.0
  // ==========================================
  A.openTrivia2 = function () {
    A.clearGameLoops();
    C.sheet(
      '<h2>🧠 Punk Trivia 2.0</h2>' +
      '<p class="sub">Pilih level pertanyaan! Makin tinggi levelnya, makin menantang soalnya & makin besar hadiahnya.</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' +
        renderChoiceBtn('triv-tier', 'data-tier', 'easy', '🟢 Santai · Mudah (5 Soal)', '6–12 PSC', 'Pengetahuan umum ringan, Nusantara, & budaya sehari-hari') +
        renderChoiceBtn('triv-tier', 'data-tier', 'medium', '🟡 Tongkrongan · Sedang (5 Soal)', '12–22 PSC', 'Musik indie, sejarah, sains populer, & logika dasar') +
        renderChoiceBtn('triv-tier', 'data-tier', 'hard', '🔴 Otak Encer · Sulit (6 Soal)', '20–35 PSC', 'Fisika, logika ketat, astronomi, & teka-teki tingkat tinggi', 'border-color:rgba(248,113,113,.45);') +
      '</div>'
    );
  };

  async function startTriviaTier(tier) {
    A.clearGameLoops();
    C.sheet(
      '<h2>🧠 Punk Trivia (' + C.esc(tier.toUpperCase()) + ')</h2>' +
      '<p class="sub">Jawab cepat dan tepat untuk menjaga combo!</p>' +
      '<div id="triv-box" style="margin-top:10px">Mengacak soal baru...</div>'
    );

    try {
      var ses = await API.post('/api/arena/session/start', { game: 'trivia', mode: tier });
      var picked = pickQuestionsForTier(tier, ses.questions);
      var questions = picked.questions;
      var idx = 0;
      var answers = [];
      var localCorrect = 0;

      function renderQ() {
        var box = document.getElementById('triv-box');
        if (!box) return;
        if (idx >= questions.length) {
          box.innerHTML = '<div style="padding:16px;text-align:center;font-weight:700">Memeriksa jawaban di server...</div>';
          API.post('/api/arena/session/finish', {
            sessionId: ses.sessionId,
            result: { answers: answers, tier: tier, localCorrect: localCorrect, total: questions.length }
          }).then(function (res) {
            if (res.user) S.user = res.user;
            var summary = picked.isLocalCheck
              ? ('Benar ' + localCorrect + '/' + questions.length + ' soal! ' + (res.resultText || ''))
              : res.resultText;
            box.innerHTML =
              '<div style="padding:14px;background:rgba(56,189,248,.14);border-radius:14px;text-align:center">' +
                '<div style="font-size:15px;font-weight:900;color:#FFD633;margin-bottom:8px;line-height:1.4">' + C.esc(summary) + '</div>' +
                '<button class="btn" data-act="shut">SELESAI</button>' +
              '</div>';
            C.notify('Mas Raka', 'Punk Trivia', summary);
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
            '<span>Kategori: ' + C.esc(q.cat || 'Umum') + '</span>' +
          '</div>' +
          '<div style="font-size:14px;font-weight:700;margin-bottom:10px;line-height:1.45">' + C.esc(q.q) + '</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
            q.opts.map(function (opt, optIdx) {
              return '<button class="btn b2 triv-opt" data-opt="' + optIdx + '" style="' + OPTION_BTN_STYLE + 'font-size:12.5px">' + C.esc(opt) + '</button>';
            }).join('') +
          '</div>';

        box.querySelectorAll('.triv-opt').forEach(function (b) {
          b.onclick = function () {
            var chosen = Number(b.getAttribute('data-opt'));
            answers.push(chosen);
            if (typeof q.ans === 'number' && chosen === q.ans) localCorrect++;
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
  // GAME 6: GEBUK SIAPA?
  // ==========================================
  A.openWhackGame = function () {
    A.clearGameLoops();
    C.sheet(
      '<h2>🔨 Gebuk Siapa?</h2>' +
      '<p class="sub">Pilih kecepatan arena! Target: 👾 (+15), 👑 Bos (+30), hindari 💣 Bom (-25)!</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' +
        renderChoiceBtn('wk-tier', 'data-tier', 'easy', '🟢 Santai · Mudah (3x3)', '5–10 PSC', 'Muncul pelan (800ms) · Sedikit bom') +
        renderChoiceBtn('wk-tier', 'data-tier', 'medium', '🟡 Rush · Sedang (3x3)', '10–18 PSC', 'Muncul cepat (600ms) · Ada Bos 👑 +30 poin') +
        renderChoiceBtn('wk-tier', 'data-tier', 'hard', '🔴 Brutal · Sulit (4x4)', '18–28 PSC', '16 lubang super kilat (460ms) · Bom 35%!', 'border-color:rgba(248,113,113,.45);') +
      '</div>'
    );
  };

  async function startWhackTier(tier) {
    A.clearGameLoops();
    var cols = tier === 'hard' ? 4 : 3;
    var totalCells = cols * cols;
    var speedMs = tier === 'hard' ? 460 : tier === 'medium' ? 600 : 800;
    var bombRate = tier === 'hard' ? 0.35 : tier === 'medium' ? 0.25 : 0.15;

    C.sheet(
      '<h2>🔨 Gebuk Siapa? (' + C.esc(tier.toUpperCase()) + ')</h2>' +
      '<p class="sub">👾 +15 · 👑 +30 · 💣 -25 · Waktu: <b>25 detik</b></p>' +
      '<div style="display:flex;justify-content:space-between;font-weight:800;margin:8px 0">' +
        '<span>Skor: <b id="wk-score" style="color:#FFD633">0</b></span>' +
        '<span>Sisa Waktu: <b id="wk-time" style="color:#38BDF8">25s</b></span>' +
      '</div>' +
      '<div id="wk-grid" style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:6px;margin:8px 0"></div>' +
      '<div id="ar-res" style="font-size:13px;font-weight:700;color:var(--yel)"></div>'
    );

    var ses;
    try {
      ses = await API.post('/api/arena/session/start', { game: 'whack', mode: tier });
    } catch (e) {
      document.getElementById('ar-res').textContent = e.message;
      return;
    }

    var score = 0;
    var timeLeft = 25;
    var activeIdx = -1;
    var activeKind = 'mob';
    var grid = document.getElementById('wk-grid');

    for (var i = 0; i < totalCells; i++) {
      var cell = document.createElement('button');
      cell.className = 'btn b2';
      cell.style.cssText = 'margin:0;height:' + (cols === 4 ? '54px' : '66px') + ';font-size:' + (cols === 4 ? '22px' : '28px') + ';display:grid;place-items:center;padding:0';
      cell.setAttribute('data-idx', i);
      cell.textContent = '🕳️';
      cell.onclick = function () {
        var idx = Number(this.getAttribute('data-idx'));
        if (idx !== activeIdx) return;
        activeIdx = -1;
        if (activeKind === 'bomb') {
          this.textContent = '💥';
          score = Math.max(0, score - 25);
        } else if (activeKind === 'boss') {
          this.textContent = '🌟';
          score += 30;
        } else {
          this.textContent = '✨';
          score += 15;
        }
        document.getElementById('wk-score').textContent = score;
      };
      grid.appendChild(cell);
    }

    A.regInterval(function () {
      var cells = grid.querySelectorAll('button');
      cells.forEach(function (c) { c.textContent = '🕳️'; });
      activeIdx = Math.floor(Math.random() * totalCells);
      var r = Math.random();
      if (r < bombRate) {
        activeKind = 'bomb';
        cells[activeIdx].textContent = '💣';
      } else if (r > 0.82 && tier !== 'easy') {
        activeKind = 'boss';
        cells[activeIdx].textContent = '👑';
      } else {
        activeKind = 'mob';
        cells[activeIdx].textContent = '👾';
      }
    }, speedMs);

    A.regInterval(async function () {
      timeLeft--;
      var tEl = document.getElementById('wk-time');
      if (tEl) tEl.textContent = timeLeft + 's';
      if (timeLeft <= 0) {
        A.clearGameLoops();
        grid.innerHTML = '<div style="grid-column:1/-1;padding:16px;text-align:center">Waktu habis! Menyimpan skor...</div>';
        try {
          var res = await API.post('/api/arena/session/finish', { sessionId: ses.sessionId, result: { score: score, tier: tier } });
          if (res.user) S.user = res.user;
          document.getElementById('ar-res').textContent = res.resultText;
          C.notify('Mas Raka', 'Gebuk Siapa?', res.resultText);
          await A.loadArenaState(true);
        } catch (err) {
          document.getElementById('ar-res').textContent = err.message;
        }
      }
    }, 1000);
  }

  // ==========================================
  // GAME 7: ADU INGATAN
  // ==========================================
  A.openMemoryGame = function () {
    A.clearGameLoops();
    C.sheet(
      '<h2>🃏 Adu Ingatan</h2>' +
      '<p class="sub">Pilih ukuran papan kartu! Makin sedikit langkah & makin besar papan, makin besar hadiahnya.</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' +
        renderChoiceBtn('mem-tier', 'data-tier', 'easy', '🟢 Papan 3x4 · Mudah (6 Pasang)', '5–10 PSC', '12 kartu pemanasan ingatan singkat') +
        renderChoiceBtn('mem-tier', 'data-tier', 'medium', '🟡 Papan 4x4 · Sedang (8 Pasang)', '10–18 PSC', '16 kartu standar arcade') +
        renderChoiceBtn('mem-tier', 'data-tier', 'hard', '🔴 Papan 4x5 · Sulit (10 Pasang)', '16–26 PSC', '20 kartu butuh memori tajam!', 'border-color:rgba(248,113,113,.45);') +
      '</div>'
    );
  };

  async function startMemoryTier(tier) {
    A.clearGameLoops();
    var pairCount = tier === 'hard' ? 10 : tier === 'medium' ? 8 : 6;
    var cols = tier === 'easy' ? 3 : 4;

    C.sheet(
      '<h2>🃏 Adu Ingatan (' + pairCount + ' Pasang)</h2>' +
      '<p class="sub">Cocokkan semua <b>' + pairCount + ' pasang</b> kartu sehemat langkah mungkin!</p>' +
      '<div style="display:flex;justify-content:space-between;font-weight:800;margin:6px 0">' +
        '<span>Langkah: <b id="mem-moves" style="color:#FFD633">0</b></span>' +
        '<span>Cocok: <b id="mem-pairs" style="color:#4ADE80">0 / ' + pairCount + '</b></span>' +
      '</div>' +
      '<div id="mem-grid" style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:6px;margin:8px 0"></div>' +
      '<div id="ar-res" style="font-size:13px;font-weight:700;color:var(--yel)"></div>'
    );

    var ses;
    try {
      ses = await API.post('/api/arena/session/start', { game: 'memory', mode: tier });
    } catch (e) {
      document.getElementById('ar-res').textContent = e.message;
      return;
    }

    var allIcons = ['🎸', '🔥', '👑', '⚡', '🎣', '🎟️', '🕹️', '💀', '🛹', '📼'];
    var icons = allIcons.slice(0, pairCount);
    var deck = icons.concat(icons).sort(function () { return Math.random() - 0.5; });
    var flipped = [];
    var matched = 0;
    var moves = 0;
    var lock = false;
    var grid = document.getElementById('mem-grid');

    deck.forEach(function (sym) {
      var card = document.createElement('button');
      card.className = 'btn b2';
      card.style.cssText = 'margin:0;height:52px;font-size:21px;padding:0;display:grid;place-items:center';
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
            document.getElementById('mem-pairs').textContent = matched + ' / ' + pairCount;
            flipped = [];
            if (matched === pairCount) {
              var baseScore = pairCount * 45;
              var score = Math.max(60, baseScore - moves * 9);
              document.getElementById('ar-res').textContent = 'Selesai dalam ' + moves + ' langkah! Mengirim skor...';
              try {
                var res = await API.post('/api/arena/session/finish', { sessionId: ses.sessionId, result: { score: score, moves: moves, tier: tier } });
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
            }, 500);
          }
        }
      };
      grid.appendChild(card);
    });
  }

  document.addEventListener('click', function (e) {
    var trivBtn = e.target.closest('[data-act="triv-tier"]');
    if (trivBtn) return startTriviaTier(trivBtn.getAttribute('data-tier') || 'medium');

    var wkBtn = e.target.closest('[data-act="wk-tier"]');
    if (wkBtn) return startWhackTier(wkBtn.getAttribute('data-tier') || 'medium');

    var memBtn = e.target.closest('[data-act="mem-tier"]');
    if (memBtn) return startMemoryTier(memBtn.getAttribute('data-tier') || 'medium');
  });
})();
