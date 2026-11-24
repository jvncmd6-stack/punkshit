(function () {
  var PREFIX = 'punk_gametour_v1_';

  var TOURS = {
    home: {
      badge: 'MISSION 01 · HOME OS',
      npc: '🎙️ MAS RAKA',
      steps: [
        {
          selector: '.wd .w:first-child',
          title: '💰 Dompet PSC & Streak',
          text: 'Ini nyawa ekonomimu. Tap widget ini buat absen harian dan jaga streak biar bonus PSC makin tebal.'
        },
        {
          selector: '.wd .w:last-child',
          title: '👀 Radar Warga Aktif',
          text: 'Cek siapa aja warga yang baru online. Tap buat intip profil atau nyapa mereka.'
        },
        {
          selector: '#grid',
          title: '🕹️ Launcher Modul',
          text: 'Setiap ikon adalah arena berbeda. Tiap kali kamu masuk ke salah satu app, gue bakal kasih briefing singkatnya!'
        },
        {
          selector: '.srch',
          title: '🔍 Quick Search',
          text: 'Cari username warga atau fitur tanpa perlu scroll satu-satu.'
        }
      ]
    },

    markas: {
      badge: 'STAGE · MARKAS BESAR',
      npc: '🎙️ MAS RAKA',
      steps: [
        {
          selector: '#bd .grp:first-child, #bd .card:first-child',
          title: '📡 Papan Pengumuman & Radar',
          text: 'Semua info penting tongkrongan, status server, dan aktivitas terbaru kumpul di layar utama Markas.'
        },
        {
          selector: '#bd .tabs, #bd .btn',
          title: '⚡ Aksi Cepat Warga',
          text: 'Gunakan menu di bawahnya buat interaksi cepat atau cek update komunitas.'
        }
      ]
    },

    punkid: {
      badge: 'STAGE · PUNK ID CARD',
      npc: '🪪 BIRO IDENTITAS',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '🪪 Kartu Identitas Warga',
          text: 'Ini KTP digital kamu di PUNKSHIT.OS—menampilkan level, role, bio, dan badge yang sudah terbuka.'
        },
        {
          selector: '#bd .btn, #bd .pill',
          title: '✏️ Kustomisasi Profil',
          text: 'Edit bio atau atur tampilan profilmu di sini biar warga lain gampang ngenalin.'
        }
      ]
    },

    kas: {
      badge: 'STAGE · KAS & DOMPET PSC',
      npc: '💰 BENDAHARA RAKA',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '🏦 Saldo & Multiplier Streak',
          text: 'Pantau total PSC kamu di sini. Makin panjang streak harian, makin gede bonus klaimnya.'
        },
        {
          selector: '#bd .btn',
          title: '🎁 Klaim Harian & Transfer',
          text: 'Jangan lupa pencet tombol klaim harian tiap 24 jam sebelum streak-mu reset!'
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
          text: 'Main game apa aja dapat XP. Tiap naik level, kamu bisa buka hadiah gratis di Arcade Pass.'
        },
        {
          selector: '#bd .tabs',
          title: '🧭 4 Zona Utama Arena',
          text: 'Games buat cari PSC, Quest buat misi harian, Koleksi buat buka Fishdex, dan Rank buat adu skor.'
        },
        {
          selector: '.lg-ticker',
          title: '⚖️ Fair Economy Harian',
          text: 'Ada batas hadiah PSC harian. Mode Sulit & skor tinggi kasih reward jauh lebih besar.'
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
          title: '🔎 Filter & Leaderboard Warga',
          text: 'Cari warga tertentu atau cek siapa yang paling tajir dan paling tinggi levelnya di tongkrongan.'
        },
        {
          selector: '#bd .grp, #bd .rw',
          title: '💬 Tap Profil Warga',
          text: 'Klik nama warga mana aja buat lihat kartu profil lengkap, koleksi, dan riwayat aktivitasnya.'
        }
      ]
    },

    kalender: {
      badge: 'STAGE · KALENDER & EVENT',
      npc: '📅 PENJAGA WAKTU',
      steps: [
        {
          selector: '#bd .card:first-child, #bd .grp:first-child',
          title: '🎂 Ulang Tahun & Agenda',
          text: 'Cek jadwal ulang tahun warga dan event komunitas biar nggak ketinggalan momen spesial.'
        }
      ]
    },

    lapak: {
      badge: 'STAGE · LAPAK RONGSOK',
      npc: '🛒 JURAGAN LAPAK',
      steps: [
        {
          selector: '#bd .tabs',
          title: '🏪 Etalase & Lapak Warga',
          text: 'Beli item langka, tiket, atau perlengkapan Spark Shield pakai PSC hasil main di Arena.'
        },
        {
          selector: '#bd .grp, #bd .card',
          title: '🎒 Stok & Jual Beli',
          text: 'Perhatikan rarity item sebelum beli—beberapa item langka bisa dipakai buat melindungi Spark Duo!'
        }
      ]
    },

    museum: {
      badge: 'STAGE · MUSEUM ARSIP',
      npc: '🏛️ KURATOR ARSIP',
      steps: [
        {
          selector: '#bd .grp, #bd .card',
          title: '📜 Jejak Sejarah Tongkrongan',
          text: 'Semua momen ikonik, relik lama, dan arsip legendaris PUNKSHIT.OS tersimpan abadi di sini.'
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
          text: 'Ajak satu partner buat nyalain Spark Duo. Kalau streak nyala, kalian dapat bonus +15% XP di Arena!'
        },
        {
          selector: '#bd .btn, #bd .pill',
          title: '🛡️ Spark Shield',
          text: 'Lagi sibuk dan takut api padam? Pasang Spark Shield dari item gudang biar streak tetap aman.'
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
      '#gt-spot{position:fixed;border-radius:18px;box-shadow:0 0 0 9999px rgba(4,7,20,.82),0 0 0 2px #5CE1FF,0 0 22px rgba(92,225,255,.55);transition:all .28s cubic-bezier(.22,1,.36,1);pointer-events:none}' +
      '#gt-box{position:fixed;left:14px;right:14px;max-width:360px;margin:0 auto;padding:14px 15px;border-radius:20px;background:linear-gradient(155deg,rgba(22,30,62,.96),rgba(10,14,32,.98));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(92,225,255,.35);box-shadow:0 18px 42px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.25);color:#F8FAFC;z-index:9992;font-family:"Fredoka",ui-rounded,-apple-system,sans-serif}' +
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

  function isDone(appId) {
    try {
      return localStorage.getItem(PREFIX + appId) === '1';
    } catch (_) {
      return false;
    }
  }

  function setDone(appId) {
    try {
      localStorage.setItem(PREFIX + appId, '1');
    } catch (_) {}
  }

  function closeTour(markComplete) {
    if (markComplete && activeApp) setDone(activeApp);
    if (ov) { ov.remove(); ov = null; }
    spot = null;
    box = null;
    activeApp = null;
  }

  function renderStep() {
    var cfg = TOURS[activeApp];
    if (!cfg) return closeTour(false);

    while (stepIdx < cfg.steps.length) {
      var candidate = document.querySelector(cfg.steps[stepIdx].selector);
      if (candidate && candidate.offsetParent !== null) break;
      stepIdx++;
    }

    if (stepIdx >= cfg.steps.length) {
      return closeTour(true);
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
          '<button type="button" class="gt-skip" id="gt-skip">Skip Tutorial</button>' +
          '<button type="button" class="gt-next" id="gt-next">' + (isLast ? 'Siap Main! ✅' : 'Next ▶') + '</button>' +
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

      document.getElementById('gt-skip').onclick = function () { closeTour(true); };
      document.getElementById('gt-next').onclick = function () {
        stepIdx++;
        renderStep();
      };
    }, 160);
  }

  function startTour(appId, force) {
    if (!TOURS[appId]) return;
    if (!force && isDone(appId)) return;

    closeTour(false);
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
    if (navExtra.querySelector('.gt-help-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gt-help-btn';
    btn.title = 'Panduan Fitur Ini';
    btn.textContent = '?';
    btn.onclick = function () { startTour(appId, true); };
    navExtra.appendChild(btn);
  }

  // Deteksi saat warga menekan ikon app di Home / Dock
  document.addEventListener('click', function (e) {
    var appBtn = e.target && e.target.closest ? e.target.closest('[data-act="app"]') : null;
    if (appBtn) {
      var id = appBtn.getAttribute('data-id');
      setTimeout(function () {
        injectHelpButton(id);
        startTour(id, false);
      }, 420);
      return;
    }

    var closeBtn = e.target && e.target.closest ? e.target.closest('[data-act="close"]') : null;
    if (closeBtn) {
      closeTour(false);
    }
  });

  // Expose API global supaya bisa dipanggil dari mana saja
  window.PunkTour = {
    start: startTour,
    resetAll: function () {
      Object.keys(TOURS).forEach(function (k) {
        try { localStorage.removeItem(PREFIX + k); } catch (_) {}
      });
    }
  };

  // Auto-jalan tour Home saat pertama kali load
  window.addEventListener('load', function () {
    setTimeout(function () {
      var av = document.getElementById('av');
      if (!av || !av.classList.contains('on')) {
        startTour('home', false);
      }
    }, 1100);
  });
})();
