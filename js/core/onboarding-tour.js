(function () {
  var TOURS = {
    home: {
      badge: 'PROLOG · PUNKSHIT.OS',
      npc: '🎙️ MAS RAKA',
      onFinish: function () {
        if (!isDone('punkid')) {
          var punkBtn = document.querySelector('[data-act="app"][data-id="punkid"]');
          if (punkBtn) punkBtn.click();
        }
      },
      steps: [
        {
          selector: '.wd .w:first-child',
          title: '💰 Dompet PSC & Streak Harian',
          text: 'Di sini tempat pantau saldo PSC & streak harianmu. Kalau di-tap, kamu masuk ke Kas buat absen & klaim bonus.'
        },
        {
          selector: '.wd .w:last-child',
          title: '👀 Radar Warga Masih Hidup',
          text: 'Menampilkan warga yang baru aktif. Kamu bisa intip profil mereka atau kirim sapaan.'
        },
        {
          selector: '#grid',
          title: '📱 Semua Aplikasi Tongkrongan',
          text: 'Setiap ikon di sini punya fitur & misi berbeda. Tiap kamu masuk ke satu app pertama kali, gue bakal kasih briefing singkat fiturnya!'
        },
        {
          selector: '.srch',
          title: '🔍 Cari Warga & Fitur',
          text: 'Ketik @username warga atau nama fitur untuk lompat cepat tanpa scroll.'
        }
      ]
    },

    punkid: {
      badge: 'MISI 01 · PROFIL & PUNK ID',
      npc: '🪪 BIRO IDENTITAS',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '🪪 Kartu Identitas Resmi',
          text: 'Ini kartu profilmu: menampilkan nomor warga, level, role, border avatar, dan pin koleksi yang kamu pasang.'
        },
        {
          selector: '#bd input, #bd textarea, #bd .rw',
          title: '✍️ Bio, Spotify & Tanggal Lahir',
          text: 'Isi bio dan tanggal lahirmu supaya otomatis muncul di Kalender Ultah tongkrongan dan dirayain warga!'
        },
        {
          selector: '#bd .btn, #bd .pill',
          title: '🎨 Custom Border & Skin',
          text: 'Kamu bisa ganti tampilan kartu & simpan perubahan profilmu lewat tombol aksi di sini.'
        }
      ]
    },

    markas: {
      badge: 'BRIEFING · MARKAS BESAR',
      npc: '🎙️ MAS RAKA',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '📡 Papan Pengumuman & Feed',
          text: 'Semua kabar terbaru tongkrongan, pengumuman penting, dan aktivitas warga tercatat secara real-time di Markas.'
        },
        {
          selector: '#bd .tabs, #bd .btn',
          title: '📣 Sapa Warga & Interaksi',
          text: 'Gunakan fitur interaksi di bawah untuk menyapa warga atau ikut meramaikan papan markas.'
        }
      ]
    },

    kas: {
      badge: 'BRIEFING · KAS & DOMPET PSC',
      npc: '💰 BENDAHARA RAKA',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '🏦 Saldo PSC & Multiplier Streak',
          text: 'Semua PSC dari absen, game, dan jualan masuk ke sini. Jaga streak harian biar bonus PSC makin besar.'
        },
        {
          selector: '#bd .btn',
          title: '🎁 Absen Harian & Transfer',
          text: 'Pencet tombol absen tiap hari sebelum reset jam 00.00 WIB, atau kirim PSC ke warga lain.'
        }
      ]
    },

    arena: {
      badge: 'BRIEFING · ARENA GABUT 2.0',
      npc: '🕹️ GAME MASTER',
      steps: [
        {
          selector: '.lg-hero',
          title: '⭐ Level, XP & Arcade Pass',
          text: 'Main game apa aja dapat XP. Tiap naik level, kamu buka hadiah gratis di Arcade Pass.'
        },
        {
          selector: '#bd .tabs',
          title: '🧭 4 Zona Utama Arena',
          text: '• Games: 7 mini-game berhadiah PSC\n• Quest: Misi harian berhadiah XP\n• Koleksi: Buku Fishdex 15 ikan langka\n• Rank: Papan skor top player'
        },
        {
          selector: '.lg-ticker',
          title: '⚖️ Fair Economy Harian',
          text: 'Limit hadiah PSC harian di-reset tiap hari. Pilih tingkat kesulitan Sulit & skor tinggi biar hadiah maksimal.'
        },
        {
          selector: '.game-grid .game-card:first-child',
          title: '🎣 Pilih Mini-Game Favorit',
          text: 'Tap kartu game mana aja untuk mulai main. Tiap game punya mekanik & hadiah unik!'
        }
      ]
    },

    lapak: {
      badge: 'BRIEFING · LAPAK RONGSOK',
      npc: '🛒 JURAGAN LAPAK',
      steps: [
        {
          selector: '#bd .card:first-child',
          title: '💎 Toko Resmi & Pengajuan Collab',
          text: 'Di sini tempat beli Border Avatar, Card Skin, dan Gift Pin. Kamu juga bisa ajukan karya desainmu lewat tombol + Collab.'
        },
        {
          selector: '#bd .tabs',
          title: '🎒 Katalog Resmi vs Lemari Gue',
          text: 'Gunakan tab ini untuk pindah antara etalase belanja dan lemari koleksi barang yang sudah kamu miliki.'
        }
      ]
    },

    lapakwarga: {
      badge: 'BRIEFING · LAPAK WARGA',
      npc: '🏪 PASAR BEBAS',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .tabs',
          title: '🛍️ Jual Beli Antar Warga',
          text: 'Warga bisa buka lapak jual barang, stiker, GIF, atau jasa pakai PSC. Pembeli langsung diarahkan ke @username penjual via PM Bot!'
        },
        {
          selector: '#bd .btn, #bd .pill',
          title: '➕ Buka Lapak & Sundul Produk',
          text: 'Punya barang atau jasa? Pajang di etalase dan gunakan fitur Sundul biar produkmu naik ke paling atas.'
        }
      ]
    },

    warga: {
      badge: 'BRIEFING · DIREKTORI WARGA',
      npc: '👥 INTEL KAMPUNG',
      steps: [
        {
          selector: '#bd .tabs, #bd input',
          title: '🏆 Direktori & Leaderboard',
          text: 'Cari warga tertentu atau intip klasemen sultan PSC, level tertinggi, dan streak terpanjang.'
        },
        {
          selector: '#bd .grp, #bd .rw',
          title: '🪪 Intip Profil & Kirim Gift',
          text: 'Tap nama warga mana aja untuk melihat kartu PunkID lengkap, koleksi, dan kirim gift ke mereka.'
        }
      ]
    },

    kalender: {
      badge: 'BRIEFING · KALENDER & EVENT',
      npc: '📅 PENJAGA WAKTU',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '🎂 Radar Ulang Tahun & Agenda',
          text: 'Menampilkan countdown ulang tahun warga dan jadwal event resmi PUNKSHIT.OS biar nggak ketinggalan.'
        }
      ]
    },

    museum: {
      badge: 'BRIEFING · MUSEUM ARSIP',
      npc: '🏛️ KURATOR ARSIP',
      steps: [
        {
          selector: '#bd .grp, #bd .card',
          title: '📜 Arsip Sejarah & Relik',
          text: 'Catatan momen ikonik, sejarah tongkrongan, dan arsip legendaris warga tersimpan abadi di sini.'
        }
      ]
    },

    spark: {
      badge: 'BRIEFING · SPARK BUDDIES',
      npc: '🔥 PENJAGA API',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '🔥 Api Streak Berdua (+15% XP)',
          text: 'Pasangkan Spark Duo dengan satu partner. Kalau kalian aktif tiap hari, api menyala dan dapat bonus +15% XP di Arena!'
        },
        {
          selector: '#bd .btn, #bd .pill',
          title: '🛡️ Spark Shield & Misi Duo',
          text: 'Pasang Spark Shield saat lagi sibuk supaya streak nggak padam, dan selesaikan misi mingguan berdua.'
        }
      ]
    },

    dalang: {
      badge: 'BRIEFING · RUANG DALANG',
      npc: '🎛️ PANEL KONTROL',
      steps: [
        {
          selector: '#bd .grp:first-child, #bd .card:first-child',
          title: '⚙️ Kontrol Pengurus & Admin',
          text: 'Panel khusus pengurus untuk moderasi warga, atur event, dan kelola ekosistem PUNKSHIT.OS.'
        }
      ]
    }
  };

  var activeApp = null;
  var stepIdx = 0;
  var ov = null;
  var cutRect = null;
  var ring = null;
  var box = null;

  function getUserObj() {
    return (window.PunkCore && window.PunkCore.S && window.PunkCore.S.user) || null;
  }

  function getUserKey() {
    var u = getUserObj() || {};
    var uid = u.id || u.username;
    if (uid) return 'u_' + String(uid).toLowerCase();
    var tgUser = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
    if (tgUser && tgUser.id) return 'tg_' + tgUser.id;
    return null;
  }

  function storageKey(appId) {
    var uk = getUserKey();
    return uk ? ('punk_gt_v4_' + uk + '_' + appId) : null;
  }

  function markAllDone() {
    Object.keys(TOURS).forEach(function (k) {
      var sk = storageKey(k);
      if (sk) {
        try { localStorage.setItem(sk, '1'); } catch (_) {}
      }
    });
  }

  // Deteksi warga lama: jika sudah punya riwayat aktivitas apa pun, langsung anggap warga lama & matikan auto-tutor
  function isVeteranCitizen(u) {
    if (!u) return true;
    if (u.tour_completed === true || u.tourCompleted === true) return true;
    if ((Number(u.streak) || 0) > 0) return true;
    if ((Number(u.fishCount) || 0) > 0) return true;
    if ((Number(u.cred) || 0) > 0) return true;
    if (u.absenToday === true || u.scratchedToday === true || u.hasShared === true) return true;
    if (u.bio && String(u.bio).trim().length > 0) return true;
    if (u.birthday && String(u.birthday).trim().length > 0) return true;
    if (u.equippedBorderId || u.equippedSkinId || u.pinnedGiftId) return true;
    var inv = (window.PunkCore && window.PunkCore.S && window.PunkCore.S.inv) || [];
    if (Array.isArray(inv) && inv.length > 0) return true;
    return false;
  }

  function isDone(appId) {
    var u = getUserObj();
    if (!u) return true; // Jangan jalankan tutor sebelum data user benar-benar siap
    if (isVeteranCitizen(u)) {
      markAllDone();
      return true;
    }
    var sk = storageKey(appId);
    if (!sk) return true;
    try {
      return localStorage.getItem(sk) === '1';
    } catch (_) {
      return true;
    }
  }

  function markDone(appId) {
    var sk = storageKey(appId);
    if (!sk) return;
    try {
      localStorage.setItem(sk, '1');
    } catch (_) {}
  }

  function injectStyles() {
    if (document.getElementById('punk-gt-v4-css')) return;
    var s = document.createElement('style');
    s.id = 'punk-gt-v4-css';
    s.textContent =
      '.sb{z-index:10050 !important}' +
      '.isl{z-index:10051 !important}' +
      '.hi{z-index:10050 !important}' +
      '#gt-ov{position:absolute;inset:0;z-index:9980;pointer-events:auto}' +
      '#gt-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}' +
      '#gt-ring{position:absolute;border-radius:18px;border:2px solid #5CE1FF;box-shadow:0 0 18px rgba(92,225,255,.55),inset 0 0 10px rgba(92,225,255,.25);transition:all .26s cubic-bezier(.22,1,.36,1);pointer-events:none}' +
      '#gt-box{position:absolute;left:14px;right:14px;padding:13px 15px;border-radius:20px;background:linear-gradient(160deg,rgba(20,28,58,.97),rgba(9,13,30,.98));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(92,225,255,.38);box-shadow:0 16px 36px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.22);color:#F8FAFC;z-index:9985;font-family:"Fredoka",ui-rounded,-apple-system,sans-serif}' +
      '#gt-box .gt-hud{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:5px}' +
      '#gt-box .gt-badge{font-size:9.5px;font-weight:800;letter-spacing:.06em;padding:3px 8px;border-radius:99px;background:rgba(92,225,255,.16);color:#5CE1FF;border:1px solid rgba(92,225,255,.3)}' +
      '#gt-box .gt-step{font-size:10.5px;font-weight:700;color:#FFD633}' +
      '#gt-box .gt-npc{font-size:10px;font-weight:700;color:rgba(226,232,240,.65);margin-bottom:2px}' +
      '#gt-box h4{margin:0 0 4px;font-size:14.5px;font-weight:700;color:#fff}' +
      '#gt-box p{margin:0 0 10px;font-size:12px;line-height:1.45;color:rgba(226,232,240,.9);white-space:pre-line}' +
      '#gt-box .gt-bar{height:4px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin-bottom:10px}' +
      '#gt-box .gt-bar i{display:block;height:100%;background:linear-gradient(90deg,#22C1F2,#6DF0A0,#FFD633);transition:width .25s ease}' +
      '#gt-box .gt-act{display:flex;justify-content:space-between;align-items:center;gap:8px}' +
      '#gt-box .gt-skip{background:transparent;border:0;color:rgba(226,232,240,.6);font-size:11.5px;font-weight:600;padding:6px 4px;cursor:pointer}' +
      '#gt-box .gt-next{background:linear-gradient(135deg,#22C1F2,#3B82F6 70%,#7C5CFF);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:12px;font-weight:700;padding:7px 15px;border-radius:99px;cursor:pointer;box-shadow:0 5px 14px -4px rgba(59,130,246,.7)}' +
      '.gt-help-btn{width:28px;height:28px;border-radius:99px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:#fff;font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}';
    document.head.appendChild(s);
  }

  function closeTour(markComplete, runCallback) {
    var finishedApp = activeApp;
    var cfg = finishedApp ? TOURS[finishedApp] : null;
    if (markComplete && finishedApp) markDone(finishedApp);
    if (ov) { ov.remove(); ov = null; }
    cutRect = null;
    ring = null;
    box = null;
    activeApp = null;

    if (runCallback && cfg && typeof cfg.onFinish === 'function') {
      setTimeout(cfg.onFinish, 250);
    }
  }

  function renderStep() {
    var cfg = TOURS[activeApp];
    var host = document.getElementById('ph') || document.body;
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
      if (!cutRect || !ring || !box || !el) return;
      var hr = host.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      var pad = 5;

      var x = Math.max(6, (r.left - hr.left) - pad);
      var y = Math.max(54, (r.top - hr.top) - pad);
      var w = Math.min(hr.width - 12, r.width + pad * 2);
      var h = Math.min(hr.height - y - 16, r.height + pad * 2);

      cutRect.setAttribute('x', x);
      cutRect.setAttribute('y', y);
      cutRect.setAttribute('width', Math.max(20, w));
      cutRect.setAttribute('height', Math.max(20, h));

      ring.style.left = x + 'px';
      ring.style.top = y + 'px';
      ring.style.width = Math.max(20, w) + 'px';
      ring.style.height = Math.max(20, h) + 'px';

      var total = cfg.steps.length;
      var pct = Math.round(((stepIdx + 1) / total) * 100);
      var isLast = stepIdx === total - 1;
      var nextLabel = isLast
        ? (activeApp === 'home' ? 'Setup Profil ▶' : 'Paham! ✅')
        : 'Lanjut ▶';

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

      var spaceBelow = hr.height - (y + h);
      if (spaceBelow > 210) {
        box.style.top = (y + h + 10) + 'px';
        box.style.bottom = 'auto';
      } else if (y > 235) {
        box.style.top = 'auto';
        box.style.bottom = (hr.height - y + 10) + 'px';
      } else {
        box.style.top = 'auto';
        box.style.bottom = '24px';
      }

      document.getElementById('gt-skip').onclick = function () {
        if (activeApp === 'home') markAllDone(); // Jika warga skip prolog awal, jangan ganggu lagi di app lain
        closeTour(true, false);
      };
      document.getElementById('gt-next').onclick = function () {
        stepIdx++;
        renderStep();
      };
    }, 160);
  }

  function startTour(appId, force) {
    if (!TOURS[appId]) return;
    if (!force && isDone(appId)) return;

    markDone(appId);
    closeTour(false, false);
    injectStyles();

    var host = document.getElementById('ph') || document.body;
    activeApp = appId;
    stepIdx = 0;

    ov = document.createElement('div');
    ov.id = 'gt-ov';

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.id = 'gt-svg';

    var defs = document.createElementNS(svgNS, 'defs');
    var mask = document.createElementNS(svgNS, 'mask');
    mask.id = 'gt-hole-mask';

    var bgWhite = document.createElementNS(svgNS, 'rect');
    bgWhite.setAttribute('x', '0');
    bgWhite.setAttribute('y', '48');
    bgWhite.setAttribute('width', '100%');
    bgWhite.setAttribute('height', '100%');
    bgWhite.setAttribute('fill', 'white');

    cutRect = document.createElementNS(svgNS, 'rect');
    cutRect.setAttribute('rx', '18');
    cutRect.setAttribute('ry', '18');
    cutRect.setAttribute('fill', 'black');

    mask.appendChild(bgWhite);
    mask.appendChild(cutRect);
    defs.appendChild(mask);

    var dim = document.createElementNS(svgNS, 'rect');
    dim.setAttribute('x', '0');
    dim.setAttribute('y', '48');
    dim.setAttribute('width', '100%');
    dim.setAttribute('height', '100%');
    dim.setAttribute('fill', 'rgba(5, 8, 22, 0.78)');
    dim.setAttribute('mask', 'url(#gt-hole-mask)');

    svg.appendChild(defs);
    svg.appendChild(dim);

    ring = document.createElement('div');
    ring.id = 'gt-ring';

    box = document.createElement('div');
    box.id = 'gt-box';

    ov.appendChild(svg);
    ov.appendChild(ring);
    ov.appendChild(box);
    host.appendChild(ov);

    renderStep();
  }

  function injectHelpButton(appId) {
    var navExtra = document.getElementById('nav-extra');
    if (!navExtra || !TOURS[appId]) return;
    navExtra.innerHTML = '';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gt-help-btn';
    btn.title = 'Panduan Fitur Ini';
    btn.textContent = '?';
    btn.onclick = function () { startTour(appId, true); };
    navExtra.appendChild(btn);
  }

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
        var sk = storageKey(k);
        if (sk) {
          try { localStorage.removeItem(sk); } catch (_) {}
        }
      });
    }
  };

  function bootNewCitizenTour(attempt) {
    var u = getUserObj();
    if (!u) {
      if (attempt < 20) return setTimeout(function () { bootNewCitizenTour(attempt + 1); }, 300);
      return;
    }
    var av = document.getElementById('av');
    if (!av || !av.classList.contains('on')) {
      startTour('home', false);
    }
  }

  window.addEventListener('load', function () {
    setTimeout(function () { bootNewCitizenTour(0); }, 700);
  });
})();
