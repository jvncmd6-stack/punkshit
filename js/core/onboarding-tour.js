(function () {
  var C = window.PunkCore || {};
  var API = window.PunkAPI;
  var S = C.S || {};

  // Identitas unik per warga agar 1 warga hanya menjalani tutor 1x selamanya
  function getUserKey() {
    var u = (window.PunkCore && window.PunkCore.S && window.PunkCore.S.user) || {};
    var uid = u.id || u.telegram_id || u.username;
    if (uid) return 'u_' + String(uid).toLowerCase();
    var tgUser = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
    if (tgUser && tgUser.id) return 'tg_' + tgUser.id;
    return 'guest';
  }

  function storageKey(appId) {
    return 'punk_gt_v2_' + getUserKey() + '_' + appId;
  }

  function isDone(appId) {
    // Jika server sudah menandai warga lama / tour selesai, langsung skip
    var u = (window.PunkCore && window.PunkCore.S && window.PunkCore.S.user) || {};
    if (u.tour_completed === true || u.tourCompleted === true) return true;
    try {
      return localStorage.getItem(storageKey(appId)) === '1';
    } catch (_) {
      return false;
    }
  }

  function markDone(appId) {
    try {
      localStorage.setItem(storageKey(appId), '1');
    } catch (_) {}

    // Opsional: simpan status ke backend jika endpoint tersedia
    if (API && typeof API.post === 'function') {
      try {
        API.post('/api/user/tour-done', { appId: appId }).catch(function () {});
      } catch (_) {}
    }
  }

  var TOURS = {
    home: {
      badge: 'PROLOG · SELAMAT DATANG',
      npc: '🎙️ MAS RAKA',
      onFinish: function () {
        // Setelah briefing Home selesai, otomatis masuk ke Profil (PunkID) untuk setup warga baru
        if (!isDone('punkid')) {
          var punkBtn = document.querySelector('[data-act="app"][data-id="punkid"]');
          if (punkBtn) {
            punkBtn.click();
          } else if (window.PunkCore && typeof window.PunkCore.open === 'function') {
            window.PunkCore.open('punkid');
            setTimeout(function () { startTour('punkid', false); }, 450);
          }
        }
      },
      steps: [
        {
          selector: '.wd .w:first-child',
          title: '💰 Dompet PSC & Streak',
          text: 'Ini saldo PSC dan streak harianmu. Tap di sini buat absen tiap hari biar bonus PSC makin tebal.'
        },
        {
          selector: '.wd .w:last-child',
          title: '👀 Radar Warga Aktif',
          text: 'Lihat siapa aja warga yang lagi aktif, intip profil mereka, dan kirim interaksi.'
        },
        {
          selector: '#grid',
          title: '🕹️ Launcher Modul OS',
          text: 'Semua fitur nongkrong ada di grid ini. Tiap kamu masuk ke app baru pertama kali, gue bakal kasih briefing singkatnya.'
        },
        {
          selector: '.srch',
          title: '🔍 Quick Search',
          text: 'Cari username warga atau nama fitur langsung dari kolom ini. Sekarang ayo kita masuk ke Profil kamu dulu!'
        }
      ]
    },

    punkid: {
      badge: 'STAGE 01 · PROFIL & PUNK ID',
      npc: '🪪 BIRO IDENTITAS WARGA',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '🪪 Kartu Identitas (PunkID)',
          text: 'Ini kartu identitas resmimu di PUNKSHIT.OS—menampilkan nama, username, level, role, dan statusmu.'
        },
        {
          selector: '#bd input, #bd textarea, #bd .rw',
          title: '✍️ Lengkapi Bio & Data Diri',
          text: 'Isi bio, tanggal lahir (biar dirayain pas ultah!), dan info profilmu biar warga lain gampang ngenalin.'
        },
        {
          selector: '#bd .btn, #bd .pill',
          title: '💾 Simpan & Pamerkan Profil',
          text: 'Jangan lupa simpan perubahan profilmu. Kamu juga bisa cek koleksi badge dan statistikmu di sini.'
        }
      ]
    },

    markas: {
      badge: 'STAGE · MARKAS BESAR',
      npc: '🎙️ MAS RAKA',
      steps: [
        {
          selector: '#bd .grp:first-child, #bd .card:first-child',
          title: '📡 Papan Info Tongkrongan',
          text: 'Semua pengumuman penting, status aktivitas server, dan berita terbaru kumpul di Markas.'
        },
        {
          selector: '#bd .tabs, #bd .btn',
          title: '⚡ Menu Interaksi Markas',
          text: 'Gunakan tab atau tombol aksi di bawah untuk berinteraksi dengan warga lainnya.'
        }
      ]
    },

    kas: {
      badge: 'STAGE · KAS & DOMPET PSC',
      npc: '💰 BENDAHARA RAKA',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '🏦 Brankas PSC & Multiplier',
          text: 'Pantau saldo PSC dan riwayat keluar-masuk koinmu. Makin panjang streak, makin gede bonus hariannya.'
        },
        {
          selector: '#bd .btn',
          title: '🎁 Klaim Harian & Transfer',
          text: 'Tap tombol klaim setiap hari sebelum streak reset, atau kirim PSC ke sesama warga.'
        }
      ]
    },

    arena: {
      badge: 'STAGE · ARENA GABUT 2.0',
      npc: '🕹️ GAME MASTER',
      steps: [
        {
          selector: '.lg-hero',
          title: '⭐ Level & XP Arcade',
          text: 'Main mini-game apa aja dapat XP. Tiap naik level, buka hadiah gratis di Arcade Pass.'
        },
        {
          selector: '#bd .tabs',
          title: '🧭 4 Zona Utama Arena',
          text: 'Games buat cari PSC, Quest buat misi harian, Koleksi buat buku Fishdex, dan Rank buat adu skor.'
        },
        {
          selector: '.lg-ticker',
          title: '⚖️ Fair Economy Harian',
          text: 'Batas hadiah PSC harian di-reset tiap hari. Mode Sulit & skor tinggi kasih hadiah jauh lebih besar.'
        },
        {
          selector: '.game-grid .game-card:first-child',
          title: '🎮 Pilih Mini-Game',
          text: 'Tap salah satu kartu game buat mulai main. Coba Mancing Galatama atau Gosok Nasib dulu!'
        }
      ]
    },

    warga: {
      badge: 'STAGE · DIREKTORI WARGA',
      npc: '👥 INTEL KAMPUNG',
      steps: [
        {
          selector: '#bd .tabs, #bd input',
          title: '🔎 Cari & Leaderboard Warga',
          text: 'Filter warga atau cek peringkat sultan dan level tertinggi di tongkrongan.'
        },
        {
          selector: '#bd .grp, #bd .rw',
          title: '💬 Intip Kartu Profil Warga',
          text: 'Tap nama warga mana aja buat lihat PunkID, koleksi barang, dan aktivitas mereka.'
        }
      ]
    },

    kalender: {
      badge: 'STAGE · KALENDER & EVENT',
      npc: '📅 PENJAGA WAKTU',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '🎂 Radar Ultah & Event',
          text: 'Lihat jadwal ulang tahun warga yang sudah isi tanggal lahir di PunkID dan agenda tongkrongan.'
        }
      ]
    },

    lapak: {
      badge: 'STAGE · LAPAK RONGSOK',
      npc: '🛒 JURAGAN LAPAK',
      steps: [
        {
          selector: '#bd .tabs',
          title: '🏪 Toko Resmi & Lapak Warga',
          text: 'Belanja item langka, koleksi, atau item pelindung Spark Shield pakai PSC hasil main game.'
        },
        {
          selector: '#bd .grp, #bd .card',
          title: '🎒 Cek Rarity Sebelum Beli',
          text: 'Item dengan rarity tinggi punya fungsi khusus, termasuk buat melindungi api Spark Duo!'
        }
      ]
    },

    museum: {
      badge: 'STAGE · MUSEUM ARSIP',
      npc: '🏛️ KURATOR ARSIP',
      steps: [
        {
          selector: '#bd .grp, #bd .card',
          title: '📜 Arsip Sejarah PUNKSHIT.OS',
          text: 'Jejak momen bersejarah, relik lama, dan kenangan tongkrongan tersimpan abadi di sini.'
        }
      ]
    },

    spark: {
      badge: 'STAGE · SPARK BUDDIES',
      npc: '🔥 PENJAGA API',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '🔥 Api Streak Berdua',
          text: 'Jalin Spark Duo bareng partner. Kalau api terus menyala, kalian dapat bonus +15% XP di Arena!'
        },
        {
          selector: '#bd .btn, #bd .pill',
          title: '🛡️ Pasang Spark Shield',
          text: 'Takut api padam pas lagi sibuk? Pakai item gudang sebagai Spark Shield biar streak aman.'
        }
      ]
    }
  };

  var activeApp = null;
  var stepIdx = 0;
  var ov = null;
  var spot = null;
  var box = null;

  function injectStyles() {
    if (document.getElementById('punk-gametour-css')) return;
    var s = document.createElement('style');
    s.id = 'punk-gametour-css';
    s.textContent =
      '#gt-ov{position:fixed;inset:0;z-index:9990;pointer-events:auto}' +
      '#gt-spot{position:fixed;border-radius:18px;box-shadow:0 0 0 9999px rgba(4,7,20,.82),0 0 0 2px #5CE1FF,0 0 22px rgba(92,225,255,.55);transition:all .26s cubic-bezier(.22,1,.36,1);pointer-events:none}' +
      '#gt-box{position:fixed;left:14px;right:14px;max-width:360px;margin:0 auto;padding:14px 15px;border-radius:20px;background:linear-gradient(155deg,rgba(22,30,62,.97),rgba(10,14,32,.98));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(92,225,255,.35);box-shadow:0 18px 42px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.25);color:#F8FAFC;z-index:9992;font-family:"Fredoka",ui-rounded,-apple-system,sans-serif}' +
      '#gt-box .gt-hud{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}' +
      '#gt-box .gt-badge{font-size:10px;font-weight:800;letter-spacing:.06em;padding:3px 8px;border-radius:99px;background:rgba(92,225,255,.16);color:#5CE1FF;border:1px solid rgba(92,225,255,.3)}' +
      '#gt-box .gt-step{font-size:11px;font-weight:700;color:#FFD633}' +
      '#gt-box .gt-npc{font-size:10.5px;font-weight:700;color:rgba(226,232,240,.65);margin-bottom:2px}' +
      '#gt-box h4{margin:0 0 5px;font-size:15px;font-weight:700;color:#fff}' +
      '#gt-box p{margin:0 0 12px;font-size:12.5px;line-height:1.45;color:rgba(226,232,240,.88)}' +
      '#gt-box .gt-bar{height:4px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin-bottom:12px}' +
      '#gt-box .gt-bar i{display:block;height:100%;background:linear-gradient(90deg,#22C1F2,#6DF0A0,#FFD633);transition:width .25s ease}' +
      '#gt-box .gt-act{display:flex;justify-content:space-between;align-items:center;gap:8px}' +
      '#gt-box .gt-skip{background:transparent;border:0;color:rgba(226,232,240,.6);font-size:12px;font-weight:600;padding:6px 4px;cursor:pointer}' +
      '#gt-box .gt-next{background:linear-gradient(135deg,#22C1F2,#3B82F6 70%,#7C5CFF);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:12.5px;font-weight:700;padding:8px 16px;border-radius:99px;cursor:pointer;box-shadow:0 6px 16px -4px rgba(59,130,246,.7)}' +
      '.gt-help-btn{width:28px;height:28px;border-radius:99px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:#fff;font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}';
    document.head.appendChild(s);
  }

  function closeTour(markComplete, runCallback) {
    var finishedApp = activeApp;
    var cfg = finishedApp ? TOURS[finishedApp] : null;
    if (markComplete && finishedApp) markDone(finishedApp);
    if (ov) { ov.remove(); ov = null; }
    spot = null;
    box = null;
    activeApp = null;

    if (runCallback && cfg && typeof cfg.onFinish === 'function') {
      setTimeout(cfg.onFinish, 250);
    }
  }

  function renderStep() {
    var cfg = TOURS[activeApp];
    if (!cfg) return closeTour(false, false);

    while (stepIdx < cfg.steps.length) {
      var candidate = document.querySelector(cfg.steps[stepIdx].selector);
      if (candidate && candidate.offsetParent !== null) break;
      stepIdx++;
    }

    if (stepIdx >= cfg.steps.length) {
      return closeTour(true, true);
    }

    var st = cfg.steps[stepIdx];
    var el = document.querySelector(st.selector);
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setTimeout(function () {
      if (!spot || !box || !el) return;
      var r = el.getBoundingClientRect();
      var pad = 5;
      spot.style.left = Math.max(4, r.left - pad) + 'px';
      spot.style.top = Math.max(4, r.top - pad) + 'px';
      spot.style.width = Math.min(window.innerWidth - 8, r.width + pad * 2) + 'px';
      spot.style.height = (r.height + pad * 2) + 'px';

      var total = cfg.steps.length;
      var pct = Math.round(((stepIdx + 1) / total) * 100);
      var isLast = stepIdx === total - 1;
      var nextLabel = isLast
        ? (activeApp === 'home' ? 'Masuk ke Profil ▶' : 'Paham! ✅')
        : 'Next ▶';

      box.innerHTML =
        '<div class="gt-hud">' +
          '<span class="gt-badge">' + cfg.badge + '</span>' +
          '<span class="gt-step">STEP ' + (stepIdx + 1) + '/' + total + '</span>' +
        '</div>' +
        '<div class="gt-npc">' + cfg.npc + '</div>' +
        '<h4>' + st.title + '</h4>' +
        '<p>' + st.text + '</p>' +
        '<div class="gt-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="gt-act">' +
          '<button type="button" class="gt-skip" id="gt-skip">Lewati</button>' +
          '<button type="button" class="gt-next" id="gt-next">' + nextLabel + '</button>' +
        '</div>';

      var spaceBelow = window.innerHeight - r.bottom;
      if (spaceBelow > 210) {
        box.style.top = (r.bottom + 12) + 'px';
        box.style.bottom = 'auto';
      } else if (r.top > 210) {
        box.style.top = 'auto';
        box.style.bottom = (window.innerHeight - r.top + 12) + 'px';
      } else {
        box.style.top = 'auto';
        box.style.bottom = '18px';
      }

      // Lewati tetap menandai selesai agar tidak muncul lagi saat refresh
      document.getElementById('gt-skip').onclick = function () { closeTour(true, false); };
      document.getElementById('gt-next').onclick = function () {
        stepIdx++;
        renderStep();
      };
    }, 160);
  }

  function startTour(appId, force) {
    if (!TOURS[appId]) return;
    if (!force && isDone(appId)) return;

    // Langsung tandai done sejak mulai agar jika user refresh di tengah jalan tidak diulang terus
    markDone(appId);

    closeTour(false, false);
    injectStyles();
    activeApp = appId;
    stepIdx = 0;

    ov = document.createElement('div');
    ov.id = 'gt-ov';
    spot = document.createElement('div');
    spot.id = 'gt-spot';
    box = document.createElement('div');
    box.id = 'gt-box';

    ov.appendChild(spot);
    ov.appendChild(box);
    document.body.appendChild(ov);
    renderStep();
  }

  function injectHelpButton(appId) {
    var navExtra = document.getElementById('nav-extra');
    if (!navExtra || !TOURS[appId]) return;
    navExtra.innerHTML = '';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gt-help-btn';
    btn.title = 'Ulangi Panduan App';
    btn.textContent = '?';
    btn.onclick = function () { startTour(appId, true); };
    navExtra.appendChild(btn);
  }

  // Pantau saat user membuka app lewat ikon Home, Dock, atau Search
  document.addEventListener('click', function (e) {
    var appBtn = e.target && e.target.closest ? e.target.closest('[data-act="app"]') : null;
    if (appBtn) {
      var id = appBtn.getAttribute('data-id');
      setTimeout(function () {
        injectHelpButton(id);
        startTour(id, false);
      }, 450);
      return;
    }

    var closeBtn = e.target && e.target.closest ? e.target.closest('[data-act="close"]') : null;
    if (closeBtn) {
      closeTour(true, false);
    }
  });

  window.PunkTour = {
    start: startTour,
    resetMyTour: function () {
      Object.keys(TOURS).forEach(function (k) {
        try { localStorage.removeItem(storageKey(k)); } catch (_) {}
      });
    }
  };

  // Tunggu data user selesai dimuat agar key userId sudah tersedia, baru jalankan 1x untuk warga baru
  function bootNewCitizenTour(attempt) {
    var u = window.PunkCore && window.PunkCore.S && window.PunkCore.S.user;
    if (!u && attempt < 15) {
      return setTimeout(function () { bootNewCitizenTour(attempt + 1); }, 300);
    }

    var av = document.getElementById('av');
    if (!av || !av.classList.contains('on')) {
      startTour('home', false);
    }
  }

  window.addEventListener('load', function () {
    setTimeout(function () { bootNewCitizenTour(0); }, 600);
  });
})();
