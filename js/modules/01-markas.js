(function () {
  var C = window.PunkCore;
  var API = window.PunkAPI;
  var CFG = window.PUNK_CONFIG;
  var S = C.S;

  var MOODS = [
    '☕ Nongki Santai',
    '🔥 On Fire',
    '🎮 Push Arena',
    '🎨 Lagi Berkarya',
    '🛌 Mode Rebahan'
  ];

  function timeAgo(ts) {
    var diff = Math.max(1, Math.floor((Date.now() - (Number(ts) || Date.now())) / 1000));
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return Math.floor(diff / 60) + ' mnt lalu';
    if (diff < 86400) return Math.floor(diff / 3600) + ' jam lalu';
    return Math.floor(diff / 86400) + ' hr lalu';
  }

  function classifyFeed(text) {
    var low = String(text || '').toLowerCase();
    if (low.indexOf('absen') !== -1 || low.indexOf('streak') !== -1) {
      return { cat: 'absen', badge: 'ABSEN', icon: '🔥', bg: 'rgba(251,146,60,.18)', color: '#FDBA74' };
    }
    if (low.indexOf('lapak') !== -1 || low.indexOf('beli') !== -1 || low.indexOf('sawer') !== -1 || low.indexOf('psc') !== -1) {
      return { cat: 'lapak', badge: 'EKONOMI', icon: '💸', bg: 'rgba(250,204,21,.18)', color: '#FDE047' };
    }
    if (low.indexOf('spark') !== -1 || low.indexOf('sapa') !== -1 || low.indexOf('menfess') !== -1 || low.indexOf('gabung') !== -1) {
      return { cat: 'sosial', badge: 'WARGA', icon: '⚡', bg: 'rgba(56,189,248,.18)', color: '#7DD3FC' };
    }
    return { cat: 'umum', badge: 'MARKAS', icon: '📢', bg: 'rgba(167,139,250,.18)', color: '#C4B5FD' };
  }

  function updateDynamicIsland() {
    var txtEl = document.getElementById('isl-txt');
    if (!txtEl) return;
    var onlineCount = (S.onlineUsers && S.onlineUsers.length) || 0;
    var latest = (S.feed && S.feed[0] && (S.feed[0].text || S.feed[0].x)) || '';
    if (latest) {
      txtEl.textContent = '📢 ' + latest;
    } else if (onlineCount > 0) {
      txtEl.textContent = onlineCount + ' Warga Nongki';
    } else {
      txtEl.textContent = 'PUNKSHIT.OS';
    }
  }

  function renderMarkas() {
    var u = S.user || {};
    var rk = C.rankInfo(u.streak || 0);
    var done = Boolean(u.absenToday);
    var curMood = u.presence || '☕ Nongki Santai';
    var hasShield = Number(u.streakShield || u.streak_shield || 0) > 0;
    var onlineList = S.onlineUsers || [];

    // Misi Kolektif Satu Markas (Anti-CDC: semua warga gabung dalam 1 target markas)
    var totalOnlineCred = onlineList.reduce(function (acc, w) {
      return acc + (Number(w.cred) || 0);
    }, Number(u.cred) || 0);
    var collectiveTarget = Math.max(500, Math.ceil((totalOnlineCred + 120) / 500) * 500);
    var pct = Math.min(100, Math.round((totalOnlineCred / collectiveTarget) * 100));

    // Avatar strip warga aktif
    var onlineStrip = '';
    if (onlineList.length) {
      onlineStrip =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)">' +
          '<div style="display:flex;align-items:center;gap:6px;overflow-x:auto">' +
            onlineList.slice(0, 6).map(function (w) {
              var p = w.photoUrl || w.avatar || '';
              return p
                ? '<img src="' + C.esc(API.assetUrl(p)) + '" title="' + C.esc(w.name) + '" style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:1.5px solid #34C759;flex:none">'
                : '<span title="' + C.esc(w.name) + '" style="width:26px;height:26px;border-radius:50%;background:#1e293b;border:1.5px solid #34C759;display:grid;place-items:center;font-size:11px;font-weight:800;flex:none">' + C.esc((w.name || '?')[0].toUpperCase()) + '</span>';
            }).join('') +
            '<span style="font-size:11.5px;color:#94a3b8;margin-left:2px">' + onlineList.length + ' aktif</span>' +
          '</div>' +
          '<button class="pill" style="background:rgba(56,189,248,.18);color:#7DD3FC;font-size:11px;font-weight:700" data-act="mk-greet">👋 Sapa Markas</button>' +
        '</div>';
    }

    var moodChips =
      '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-top:10px">' +
        MOODS.map(function (m) {
          var active = curMood === m;
          return (
            '<button class="pill" style="white-space:nowrap;background:' + (active ? '#FFD633' : 'rgba(255,255,255,.08)') + ';color:' + (active ? '#000' : '#fff') + ';font-weight:' + (active ? '800' : '600') + '" data-act="mk-mood" data-mood="' + C.esc(m) + '">' +
              C.esc(m) +
            '</button>'
          );
        }).join('') +
      '</div>';

    // Filter Kabar Tongkrongan
    var feedFilter = S.curTab.markasFeed || 'all';
    var allFeed = Array.isArray(S.feed) ? S.feed : [];
    var filteredFeed = allFeed.filter(function (f) {
      if (feedFilter === 'all') return true;
      var meta = classifyFeed(f.text || f.x);
      return meta.cat === feedFilter;
    });

    var feedListHtml = filteredFeed.length
      ? filteredFeed.map(function (f, idx) {
          var rawTxt = f.text || f.x || '';
          var meta = classifyFeed(rawTxt);
          var relTime = timeAgo(f.createdAt || f.t);
          var isLast = idx === filteredFeed.length - 1;
          return (
            '<div style="display:flex;gap:11px;padding:12px 14px;' + (isLast ? '' : 'border-bottom:1px solid rgba(255,255,255,.07)') + '">' +
              '<div style="display:flex;flex-direction:column;align-items:center;flex:none">' +
                '<div style="width:32px;height:32px;border-radius:10px;background:' + meta.bg + ';color:' + meta.color + ';display:grid;place-items:center;font-size:15px">' +
                  meta.icon +
                '</div>' +
                (isLast ? '' : '<div style="width:1.5px;flex:1;background:rgba(255,255,255,.08);margin-top:6px"></div>') +
              '</div>' +
              '<div style="flex:1;min-width:0">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px">' +
                  '<span style="font-size:10px;font-weight:800;letter-spacing:.05em;padding:2px 7px;border-radius:999px;background:' + meta.bg + ';color:' + meta.color + '">' + meta.badge + '</span>' +
                  '<small style="color:#64748b;font-size:11px">' + relTime + '</small>' +
                '</div>' +
                '<div style="font-size:13px;line-height:1.45;color:#f1f5f9;word-break:break-word">' + C.esc(rawTxt) + '</div>' +
              '</div>' +
            '</div>'
          );
        }).join('')
      : '<div class="rw"><small>Belum ada kabar di kategori ini cuy. Yuk bikin keramaian di markas!</small></div>';

    return (
      // Hero Card Markas
      '<div class="grp" style="margin-bottom:14px;background:radial-gradient(circle at 90% 10%,rgba(56,189,248,.22),transparent 55%),linear-gradient(145deg,#132240,#0b1222);border:1px solid rgba(96,165,250,.28)">' +
        '<div style="padding:14px">' +
          '<div class="rw" style="padding:0;border:none">' +
            '<div>' +
              '<small style="color:#4ade80;font-weight:800;letter-spacing:.06em">● MARKAS LIVE</small>' +
              '<div style="font-size:18px;font-weight:800;margin-top:2px">Halo, ' + C.esc(u.name || 'Warga') + '! 👋</div>' +
              '<small style="color:#cbd5e1">' + C.esc(rk.title) + ' · ' + C.esc(curMood) + '</small>' +
            '</div>' +
            C.renderAvatar(u, 'mini') +
          '</div>' +
          moodChips +
          onlineStrip +
        '</div>' +
      '</div>' +

      // Absen Harian Banner
      '<div class="grp" style="margin-bottom:14px;border:1px solid ' + (done ? 'rgba(255,255,255,.08)' : 'rgba(52,199,89,.35)') + '">' +
        '<div class="rw">' +
          '<div>' +
            '<b>' + (done ? '✅ Absen Hari Ini Beres' : '🔥 Klaim Absen Harian') + '</b>' +
            '<small>Bonus hari ini: +' + rk.bonus + ' PSC · Rekor: ' + (u.best || 0) + ' hari</small>' +
          '</div>' +
          '<button class="pill" style="' + (done ? '' : 'background:#34C759;color:#000;font-weight:800') + '" data-act="mk-absen"' + (done ? ' disabled' : '') + '>' + (done ? 'SELESAI' : 'ABSEN') + '</button>' +
        '</div>' +
      '</div>' +

      // Quick Stats Grid (2x2)
      '<div class="gg" style="margin-bottom:14px">' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px;cursor:pointer" data-act="app" data-id="kas">' +
          '<small>SALDO PSC</small><b style="font-size:20px;color:var(--yel)">' + (u.psc || 0) + '</b>' +
        '</div>' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px">' +
          '<small>STREAK AKTIF</small><b style="font-size:20px">' + (u.streak || 0) + ' Hari ' + (hasShield ? '🛡️' : '') + '</b>' +
        '</div>' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px;cursor:pointer" data-act="app" data-id="misi">' +
          '<small>STREET CRED</small><b style="font-size:20px;color:#8FC7FF">' + (u.cred || 0) + '</b>' +
        '</div>' +
        '<div class="gc" style="align-items:flex-start;padding:12px 14px;cursor:pointer" data-act="app" data-id="warga">' +
          '<small>WARGA HIDUP</small><b style="font-size:20px;color:#34C759">' + (onlineList.length || 1) + '</b>' +
        '</div>' +
      '</div>' +

      // Soliditas Satu Markas (Anti-CDC: Semua warga patungan dalam satu bar)
      '<div class="grp" style="margin-bottom:14px;padding:12px 14px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
          '<b style="font-size:13px">🤝 Soliditas Satu Markas</b>' +
          '<span style="font-size:11.5px;font-weight:700;color:#38BDF8">' + totalOnlineCred + ' / ' + collectiveTarget + ' Cred</span>' +
        '</div>' +
        '<div style="height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden">' +
          '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#176BFF,#38BDF8,#34C759);border-radius:999px;transition:width .4s ease"></div>' +
        '</div>' +
        '<small style="display:block;margin-top:6px;color:#94a3b8">Satu tongkrongan satu barisan—kumpulin Street Cred barengan buat naikin pamor markas!</small>' +
      '</div>' +

      // Pintasan Cepat Markas
      '<h3 class="gh">PINTASAN CEPAT</h3>' +
      '<div class="chips" style="margin-bottom:14px">' +
        '<button class="chip" data-act="app" data-id="lapakwarga">🏪 Lapak Warga</button>' +
        '<button class="chip" data-act="app" data-id="lapak">🛍️ Lapak Rongsok</button>' +
        '<button class="chip" data-act="app" data-id="museum">🏛️ Museum</button>' +
        '<button class="chip" data-act="app" data-id="arena">🎮 Arena Gabut</button>' +
        '<button class="chip" data-act="app" data-id="spark">🔥 Spark Buddies</button>' +
        '<a class="chip" href="' + C.esc(CFG.GROUP_URL) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;text-decoration:none">💬 Grup Tele</a>' +
      '</div>' +

      // Live Activity Feed Timeline dari Mas Raka
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
        '<h3 class="gh" style="margin:0">KABAR TONGKRONGAN</h3>' +
        '<button class="pill" style="font-size:11px" data-act="mk-refresh-feed">🔄 Segarkan</button>' +
      '</div>' +
      '<div class="chips" style="margin-bottom:10px">' +
        '<button class="chip' + (feedFilter === 'all' ? ' on' : '') + '" data-act="mk-feed-tab" data-tab="all">Semua</button>' +
        '<button class="chip' + (feedFilter === 'absen' ? ' on' : '') + '" data-act="mk-feed-tab" data-tab="absen">🔥 Absen</button>' +
        '<button class="chip' + (feedFilter === 'lapak' ? ' on' : '') + '" data-act="mk-feed-tab" data-tab="lapak">💸 Ekonomi</button>' +
        '<button class="chip' + (feedFilter === 'sosial' ? ' on' : '') + '" data-act="mk-feed-tab" data-tab="sosial">⚡ Warga</button>' +
      '</div>' +
      '<div class="grp" style="padding:0;overflow:hidden">' +
        feedListHtml +
      '</div>'
    );
  }

  C.Views.markas = function () {
    updateDynamicIsland();
    return renderMarkas();
  };

  setInterval(updateDynamicIsland, 5000);
  setTimeout(updateDynamicIsland, 800);

  if (window.__punkMarkasBound) return;
  window.__punkMarkasBound = true;

  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    var act = t.getAttribute('data-act');

    if (act === 'mk-absen') {
      t.disabled = true;
      t.textContent = 'Mencatat...';
      try {
        var res = await API.post('/api/absen');
        S.user = res.user;
        if (res.feed) S.feed = res.feed;
        updateDynamicIsland();
        C.notify('Mas Raka', 'Absen Tercatat 🔥', res.message || ('Mantap cuy! Absen hari ke-' + S.user.streak + ' (+' + res.earned + ' PSC) berhasil dicatat.'));
        C.refresh();
      } catch (err) {
        t.disabled = false;
        t.textContent = 'ABSEN';
        C.notify('Mas Raka', 'Info Absen', err.message);
      }
    } else if (act === 'mk-mood') {
      var mood = t.getAttribute('data-mood');
      if (!mood || S.user.presence === mood) return;
      S.user.presence = mood;
      C.refresh();
      try {
        var pRes = await API.post('/api/profile/presence', { presence: mood });
        if (pRes && pRes.user) S.user = pRes.user;
        C.notify('Mas Raka', 'Status Nongkrong', 'Sip, status lo sekarang: ' + mood);
      } catch (_) {}
    } else if (act === 'mk-greet') {
      t.disabled = true;
      try {
        await API.post('/api/social/greet', {});
        C.notify('Mas Raka', '→ Grup Markas 👋', 'Sapaan hangat lo udah dikirim ke tongkrongan!');
      } catch (err) {
        C.notify('Mas Raka', 'Sabar Cuy', err.message);
      } finally {
        setTimeout(function () { t.disabled = false; }, 3000);
      }
    } else if (act === 'mk-feed-tab') {
      S.curTab.markasFeed = t.getAttribute('data-tab') || 'all';
      C.refresh();
    } else if (act === 'mk-refresh-feed') {
      t.disabled = true;
      try {
        await C.sync(true);
        updateDynamicIsland();
        C.notify('Mas Raka', 'Kabar Diperbarui', 'Timeline tongkrongan udah paling baru!');
      } catch (_) {} finally {
        t.disabled = false;
      }
    }
  });
})();
