(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var S = C.S;

  var reactState = { timer: null, startTime: 0, ready: false };

  function renderArena() {
    var games = [
      { id: 'fish', em: '🎣', title: 'Mancing Galatama', desc: 'Lempar kail cari Golden Punkfish. Maks 6x/hari.' },
      { id: 'scratch', em: '🎟️', title: 'Gosok Nasib', desc: '1 kartu gratis tiap hari berhadiah PSC & item.' },
      { id: 'claw', em: '🕹️', title: 'Mesin Rongsok', desc: 'Capit item koleksi langka dari tumpukan rongsok.' },
      { id: 'react', em: '⚡', title: 'Reaction Rush', desc: 'Uji kecepatan refleks jari lo dalam milidetik.' },
      { id: 'trivia', em: '🧠', title: 'Punk Trivia', desc: 'Jawab pertanyaan absurd tongkrongan berhadiah PSC.' }
    ];

    return (
      '<p class="bal">Semua game gratis & fair play · Reward divalidasi server</p>' +
      '<div class="game-grid">' +
        games.map(function (g) {
          return (
            '<button class="game-card" data-act="ar-open" data-game="' + g.id + '">' +
              '<em>' + g.em + '</em>' +
              '<b>' + C.esc(g.title) + '</b>' +
              '<small>' + C.esc(g.desc) + '</small>' +
            '</button>'
          );
        }).join('') +
      '</div>'
    );
  }

  // Sheet Mancing Galatama
  function openFishingSheet() {
    var left = Math.max(0, 6 - (Number(S.user.fishToday) || 0));
    C.sheet(
      '<div style="font-size:48px;margin-bottom:6px">🎣</div>' +
      '<h2>Mancing Galatama</h2>' +
      '<p class="sub">Sisa kesempatan hari ini: <i>' + left + ' / 6 kali</i> (Cooldown 4 jam).<br>Tangkapan Legendary otomatis diumumin Mas Raka ke Grup!</p>' +
      '<div id="ar-res" style="min-height:24px;margin:10px 0;font-weight:700;color:var(--yel)"></div>' +
      '<button class="btn" data-act="ar-play" data-game="fish"' + (left <= 0 ? ' disabled' : '') + '>LEMPAR KAIL SEKARANG</button>'
    );
  }

  // Sheet Gosok Nasib
  function openScratchSheet() {
    var done = Boolean(S.user.scratchedToday);
    C.sheet(
      '<div style="font-size:48px;margin-bottom:6px">🎟️</div>' +
      '<h2>Gosok Nasib</h2>' +
      '<p class="sub">Satu kartu keberuntungan gratis setiap hari. Nggak ada tombol beli ulang—murni nasib!</p>' +
      '<div id="ar-res" style="min-height:24px;margin:10px 0;font-weight:700;color:var(--yel)"></div>' +
      '<button class="btn" data-act="ar-play" data-game="scratch"' + (done ? ' disabled' : '') + '>' + (done ? 'SUDAH DIGOSOK HARI INI' : 'GOSOK KARTU SEKARANG') + '</button>'
    );
  }

  // Sheet Mesin Rongsok (Capit)
  function openClawSheet() {
    C.sheet(
      '<div style="font-size:48px;margin-bottom:6px">🕹️</div>' +
      '<h2>Mesin Rongsok</h2>' +
      '<p class="sub">Gerakin capit virtual buat ngambil boneka maskot atau stiker langka dari gudang.</p>' +
      '<div id="ar-res" style="min-height:24px;margin:10px 0;font-weight:700;color:var(--yel)"></div>' +
      '<button class="btn" data-act="ar-play" data-game="claw">TEKAN TOMBOL CAPIT</button>'
    );
  }

  // Sheet Reaction Rush (Interactive Mini-Game)
  function openReactionSheet() {
    clearTimeout(reactState.timer);
    reactState.ready = false;
    C.sheet(
      '<h2>⚡ Reaction Rush</h2>' +
      '<p class="sub">Tunggu kotak merah berubah jadi <i>HIJAU</i>, lalu tap secepat mungkin!</p>' +
      '<button id="rx-pad" data-act="ar-rx-tap" style="width:100%;height:150px;border-radius:20px;background:#FF453A;color:#fff;font-size:20px;font-weight:800;margin:10px 0;transition:background .1s">TUNGGU HIJAU...</button>' +
      '<div id="ar-res" style="font-size:13.5px;color:var(--mut)">Refleks di bawah 320ms dapet bonus PSC!</div>'
    );
    var delay = 1400 + Math.floor(Math.random() * 2400);
    reactState.timer = setTimeout(function () {
      var pad = document.getElementById('rx-pad');
      if (!pad) return;
      pad.style.background = '#34C759';
      pad.textContent = 'TAP SEKARANG!!';
      reactState.startTime = performance.now();
      reactState.ready = true;
    }, delay);
  }

  // Sheet Punk Trivia
  function openTriviaSheet() {
    var bank = [
      { q: 'Apa mata uang resmi di dalam ekosistem PUNKSHIT.OS?', opts: ['Punk Coins (PSC)', 'Robux', 'Doge'], ans: 0 },
      { q: 'Siapa nama bot asisten resmi yang jaga markas Punkshit?', opts: ['Mas Agung', 'Mas Raka', 'Bang Jago'], ans: 1 },
      { q: 'Pangkat tertinggi kalau streak absen tembus 60+ hari adalah...', opts: ['Sepuh Agung', 'Fosil Punkshit', 'Admin Pusat'], ans: 1 }
    ];
    var pick = bank[Math.floor(Math.random() * bank.length)];
    C.sheet(
      '<h2>🧠 Punk Trivia</h2>' +
      '<p class="sub" style="color:var(--ink);font-weight:600">' + C.esc(pick.q) + '</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' +
        pick.opts.map(function (o, idx) {
          return '<button class="btn b2" style="margin-top:0" data-act="ar-trivia-ans" data-ok="' + (idx === pick.ans ? '1' : '0') + '">' + C.esc(o) + '</button>';
        }).join('') +
      '</div>'
    );
  }

  C.Views.arena = renderArena;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'ar-open') {
      var gm = t.getAttribute('data-game');
      if (gm === 'fish') openFishingSheet();
      else if (gm === 'scratch') openScratchSheet();
      else if (gm === 'claw') openClawSheet();
      else if (gm === 'react') openReactionSheet();
      else if (gm === 'trivia') openTriviaSheet();
    } else if (act === 'ar-play') {
      var game = t.getAttribute('data-game');
      var box = document.getElementById('ar-res');
      t.disabled = true;
      box.textContent = 'Memproses hasil di server...';
      try {
        var res = await API.post('/api/game/play', { game: game });
        if (res.user) S.user = res.user;
        if (res.inv) S.inv = res.inv;
        box.textContent = res.resultText;
        C.notify('Mas Raka', 'Arena Gabut', res.resultText);
        C.refresh();
      } catch (err) {
        t.disabled = false;
        box.textContent = err.message;
        C.notify('Mas Raka', 'Info Arena', err.message);
      }
    } else if (act === 'ar-rx-tap') {
      var pad = document.getElementById('rx-pad');
      var out = document.getElementById('ar-res');
      if (!reactState.ready) {
        clearTimeout(reactState.timer);
        pad.style.background = '#8E8E93';
        pad.textContent = 'KECEPETAN BRO!';
        out.textContent = 'Belum hijau udah ditekan. Tutup & coba lagi.';
        return;
      }
      reactState.ready = false;
      var ms = Math.round(performance.now() - reactState.startTime);
      pad.style.background = '#176BFF';
      pad.textContent = ms + ' ms';
      out.textContent = 'Mengirim skor ' + ms + 'ms ke server...';
      try {
        var res = await API.post('/api/game/score', { game: 'react', score: ms });
        if (res.user) S.user = res.user;
        out.textContent = res.resultText || ('Tercatat: ' + ms + ' ms!');
        C.refresh();
      } catch (err) {
        out.textContent = err.message;
      }
    } else if (act === 'ar-trivia-ans') {
      var ok = t.getAttribute('data-ok') === '1';
      if (!ok) {
        C.shut();
        C.notify('Mas Raka', 'Salah Jawab', 'Waduh salah bro. Baca lagi dokumen markas!');
        return;
      }
      t.disabled = true;
      try {
        var res = await API.post('/api/game/score', { game: 'trivia', score: 100 });
        if (res.user) S.user = res.user;
        C.shut();
        C.refresh();
        C.notify('Mas Raka', 'Trivia Benar!', res.resultText || 'Jawaban tepat! +5 PSC masuk dompet.');
      } catch (err) {
        C.shut();
        C.notify('Mas Raka', 'Info', err.message);
      }
    }
  });
})();
