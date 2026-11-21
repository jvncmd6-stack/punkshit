window.PunkCore = (function () {
  var CFG = window.PUNK_CONFIG;
  var API = window.PunkAPI;
  var tg = window.Telegram && window.Telegram.WebApp;
  var $ = function (id) { return document.getElementById(id); };

  // State Global Tersinkronisasi dengan Railway
  var S = {
    user: null,
    inv: [],
    catalog: [],
    onlineUsers: [],
    feed: [],
    missions: [],
    events: [],
    wanted: [],
    polls: [],
    market: [],
    rulesHelp: { pasal: '', help: '' },
    adminStats: { totalUsers: 0, totalWaitingRadio: 0, users: [] },
    curApp: '',
    curTab: {}
  };

  var Views = {};
  var banTimer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return '&#' + c.charCodeAt(0) + ';';
    });
  }

  function rankInfo(streak) {
    var n = Number(streak) || 0;
    if (n >= 60) return { title: '👑 Fosil Punkshit', bonus: 15 };
    if (n >= 30) return { title: '⚡ Pentolan Punkshit', bonus: 10 };
    if (n >= 14) return { title: '🔥 Biang Kerok', bonus: 7 };
    if (n >= 7)  return { title: '☕ Tukang Nongki', bonus: 5 };
    if (n >= 4)  return { title: '🚬 Anak Titipan', bonus: 3 };
    return { title: '🌱 Anak Bawang', bonus: 2 };
  }

  function ico(id) {
    var i = (CFG.ICONS && CFG.ICONS[id]) || ['#8FC7FF', '#176BFF', 'M12 2L2 7l10 5 10-5-10-5z'];
    if (Array.isArray(i) && i.length >= 4) {
      return '<div class="ic" style="--a:' + i[1] + ';--b:' + i[2] + '"><svg viewBox="0 0 24 24"><path d="' + i[3] + '"/></svg></div>';
    }
    return '<div class="ic" style="--a:#8FC7FF;--b:#176BFF"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg></div>';
  }

  function findItem(id) {
    if (!id) return null;
    var all = (S.catalog && S.catalog.length) ? S.catalog : (CFG.DEFAULT_ITEMS || []);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function renderItemVisual(item, size, draggable) {
    if (!item) return '';
    var dragAttr = draggable ? ' data-d' : '';
    if (item.imageUrl) {
      var src = esc(API.assetUrl(item.imageUrl));
      return '<div class="g3"' + dragAttr + ' style="--s:' + size + 'px;--gl:#8FC7FF66"><div class="rot"><img src="' + src + '" alt="' + esc(item.name) + '"></div></div>';
    }
    var cols = item.colors || ['#cfeaff', '#176BFF'];
    var d = item.svgPath || (CFG.DEFAULT_ITEMS && CFG.DEFAULT_ITEMS[0] && CFG.DEFAULT_ITEMS[0].svgPath) || '';
    var layers = '';
    for (var i = 0; i < 10; i++) {
      var t = Math.round((i / 9) * 100);
      var z = ((i - 4.5) * 0.014).toFixed(3);
      var stroke = (i === 9) ? ' stroke="#fff" stroke-opacity=".75" stroke-width="2.5" stroke-linejoin="round"' : '';
      layers += '<svg viewBox="0 0 100 100" style="transform:translateZ(calc(var(--s)*' + z + '))"><path d="' + d + '" fill="color-mix(in srgb,' + cols[0] + ' ' + t + '%,' + cols[1] + ')"' + stroke + '/></svg>';
    }
    return '<div class="g3"' + dragAttr + ' style="--s:' + size + 'px;--gl:' + cols[1] + '99"><div class="rot">' + layers + '</div></div>';
  }

  function renderAvatar(u, mode) {
    if (!u) return '';
    var initial = esc((u.name || '?')[0].toUpperCase());
    var photoSrc = u.photoUrl || u.avatar || '';
    var photo = photoSrc
      ? '<img class="pfp" src="' + esc(API.assetUrl(photoSrc)) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'
      : '';
    var fallback = '<span style="' + (photoSrc ? 'display:none' : '') + '">' + initial + '</span>';

    var borderHtml = '';
    if (u.equippedBorderUrl) {
      borderHtml = '<img class="dc-border" src="' + esc(API.assetUrl(u.equippedBorderUrl)) + '" alt="">';
    }

    var pinHtml = '';
    if (u.pinnedGiftId && mode !== 'mini') {
      var giftItem = findItem(u.pinnedGiftId);
      if (giftItem) {
        pinHtml = '<div class="av-gift-pin" title="' + esc(giftItem.name) + '" style="position:absolute;right:-6px;bottom:-6px;z-index:5;background:rgba(15,23,42,.94);border:1.5px solid rgba(255,255,255,.24);border-radius:50%;padding:3px;box-shadow:0 4px 12px rgba(0,0,0,.55);pointer-events:none">' +
          renderItemVisual(giftItem, 26, false) +
        '</div>';
      }
    }

    if (mode === 'mini') {
      return '<div class="mini-av">' + photo + fallback + borderHtml + '</div>';
    }
    var ringCls = 'r' + (Number(u.ringStyle) || 0);
    return '<div class="av-wrap" style="position:relative">' +
      '<div class="ring ' + ringCls + '">' + photo + fallback + '</div>' +
      borderHtml +
      pinHtml +
    '</div>';
  }

  function bindDrag(root) {
    if (!root) return;
    root.querySelectorAll('.g3[data-d]').forEach(function (g) {
      var o = g.firstChild, x, y, ry = 0, rx = 0, on = 0, tm;
      g.onpointerdown = function (e) {
        on = 1; x = e.clientX; y = e.clientY;
        clearTimeout(tm); o.style.animation = 'none';
        g.setPointerCapture(e.pointerId);
      };
      g.onpointermove = function (e) {
        if (!on) return;
        ry += (e.clientX - x) * 0.9;
        rx -= (e.clientY - y) * 0.9;
        x = e.clientX; y = e.clientY;
        o.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      };
      g.onpointerup = g.onpointercancel = function () {
        on = 0;
        tm = setTimeout(function () { o.style.animation = ''; o.style.transform = ''; }, 2400);
      };
    });
  }

  function notify(who, tag, txt) {
    var b = $('ban');
    if (!b) return;
    b.innerHTML =
      '<div class="ic" style="--a:#FFD633;--b:#c28a00" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v3M5 9h14v9a2 2 0 01-2 2H7a2 2 0 01-2-2zM9 13h.01M15 13h.01M9 16.5h6"/></svg></div>' +
      '<div><b>' + esc(who) + '<em>' + esc(tag) + '</em></b><span>' + esc(txt) + '</span></div>';
    b.classList.add('on');
    clearTimeout(banTimer);
    banTimer = setTimeout(function () { b.classList.remove('on'); }, 4200);
  }

  function sheet(html) {
    $('sh').innerHTML = '<div class="grab"></div>' + html;
    $('sh').classList.add('open');
    $('scr').classList.add('open');
    bindDrag($('sh'));
  }

  function shut() {
    $('sh').classList.remove('open');
    $('scr').classList.remove('open');
  }

  function openExternalLink(url, label) {
    if (!url) {
      return notify('Mas Raka', 'Belum Diatur', 'Link ' + label + ' belum diisi di Railway Variables.');
    }
    if (tg && tg.openTelegramLink && url.indexOf('t.me/') !== -1) {
      tg.openTelegramLink(url);
    } else if (tg && tg.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }

  function renderHome() {
    var gridList = (CFG.BASE_GRID || []).slice();
    var role = S.user && S.user.role;
    if (role === 'owner' || role === 'admin' || role === 'moderator') {
      if (gridList.indexOf('dalang') === -1) gridList.push('dalang');
    }

    $('grid').innerHTML = gridList.map(function (id) {
      var label = (CFG.ICONS && CFG.ICONS[id] && CFG.ICONS[id][0]) || id;
      return '<button class="app" data-act="app" data-id="' + id + '">' + ico(id) + '<span>' + esc(label) + '</span></button>';
    }).join('');

    $('dock').innerHTML = (CFG.DOCK || []).map(function (id) {
      var label = (CFG.ICONS && CFG.ICONS[id] && CFG.ICONS[id][0]) || id;
      return '<button class="app" data-act="app" data-id="' + id + '" aria-label="' + esc(label) + '">' + ico(id) + '</button>';
    }).join('');

    if (S.user) {
      $('wp').textContent = S.user.psc || S.user.cred || 0;
      $('ws').textContent = 'Streak ' + (S.user.streak || 0) + ' hari';
    }

    var online = S.onlineUsers || [];
    $('wc').textContent = online.length + ' warga nongki di markas';
    var colors = ['#FFD633', '#8FC7FF', '#34C759', '#FF9ad5', '#c8b6ff'];
    $('wf').innerHTML = online.slice(0, 5).map(function (w, idx) {
      var pUrl = w.photoUrl || w.avatar || '';
      if (pUrl) {
        return '<img src="' + esc(API.assetUrl(pUrl)) + '" alt="">';
      }
      return '<i style="background:' + colors[idx % colors.length] + '">' + esc((w.name || '?')[0].toUpperCase()) + '</i>';
    }).join('') || '<i style="background:#FFD633">P</i>';
  }

  // Tampilan Lengkap untuk Modul Absen, Time Capsule (kapsul), Lapak Warga Shopee-style (lapakwarga), & Pasal/Help (rules)
  function getFallbackView(id) {
    if (id === 'absen') {
      var u = S.user || {};
      var rk = rankInfo(u.streak);
      return '<div class="card">' +
        '<h3>🔥 Absen Nyawa Harian</h3>' +
        '<p class="sub">Streak saat ini: <b>' + (u.streak || 0) + ' hari</b> (' + rk.title + ')</p>' +
        '<p class="sub">Bonus hari ini: <b>+' + rk.bonus + ' PSC</b> & +2 Street Cred.</p>' +
        '<button class="btn" data-act="core-absen">ABSEN NYAWA SEKARANG</button>' +
      '</div>';
    }

    if (id === 'kapsul' || id === 'capsule') {
      return '<div class="card">' +
        '<h3>⏳ Time Capsule</h3>' +
        '<p class="sub">Tulis pesan rahasia buat diri lu sendiri di masa depan. Bakal terkunci sampai tanggal yang lu tentuin.</p>' +
        '<label>TANGGAL BUKA KAPSUL</label>' +
        '<input id="cap-date" type="date">' +
        '<label>ISI PESAN KAPSUL</label>' +
        '<textarea id="cap-msg" rows="3" maxlength="300" placeholder="Pesan buat gue di masa depan..."></textarea>' +
        '<button class="btn" data-act="core-capsule">SEGEL TIME CAPSULE</button>' +
      '</div>';
    }

    if (id === 'lapakwarga') {
      var uShop = S.user || {};
      var items = S.market || [];
      var cardsHtml = items.map(function (m) {
        var mediaUrl = m.image_url || m.imageUrl || '';
        var isWebm = /\.webm$/i.test(mediaUrl);
        var mediaHtml = '';
        if (mediaUrl) {
          var fullSrc = esc(API.assetUrl(mediaUrl));
          mediaHtml = isWebm
            ? '<video src="' + fullSrc + '" autoplay loop muted playsinline style="width:100%;height:140px;object-fit:cover;border-radius:10px;background:#0f172a"></video>'
            : '<img src="' + fullSrc + '" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:10px;background:#0f172a">';
        } else {
          mediaHtml = '<div style="width:100%;height:110px;border-radius:10px;background:linear-gradient(135deg,#1e293b,#0f172a);display:grid;place-items:center;color:#64748b;font-size:12px">Tanpa Foto</div>';
        }

        return '<div class="card" style="padding:10px;display:flex;flex-direction:column;justify-content:space-between">' +
          mediaHtml +
          '<div style="margin-top:8px">' +
            '<span class="pill" style="font-size:10px;padding:2px 7px">' + esc(m.category || 'Etalase') + '</span>' +
            '<div style="font-weight:700;font-size:13px;margin-top:4px;line-height:1.25">' + esc(m.title) + '</div>' +
            '<div style="color:#FFD633;font-weight:800;font-size:14px;margin-top:4px">' + esc(m.price) + ' PSC</div>' +
            '<p class="sub" style="font-size:11px;margin:4px 0 8px;line-height:1.3">' + esc(m.description || '') + '</p>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;border-top:1px solid rgba(255,255,255,.08);padding-top:6px">' +
            '<div style="width:18px;height:18px;border-radius:50%;background:#334155;display:grid;place-items:center;font-size:10px;font-weight:700;overflow:hidden">' +
              (m.seller_avatar ? '<img src="' + esc(API.assetUrl(m.seller_avatar)) + '" style="width:100%;height:100%;object-fit:cover">' : esc((m.seller_name || 'W')[0])) +
            '</div>' +
            '<small style="font-size:10px;opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.seller_name || 'Warga') + '</small>' +
          '</div>' +
        '</div>';
      }).join('');

      return '<div class="card" style="background:linear-gradient(135deg,rgba(234,88,12,.22),rgba(15,23,42,.9));border:1px solid rgba(251,146,60,.3)">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          renderAvatar(uShop, 'mini') +
          '<div>' +
            '<div style="font-weight:800;font-size:15px">TOKO ' + esc((uShop.name || 'WARGA').toUpperCase()) + '</div>' +
            '<div style="font-size:11px;opacity:.8">Etalase Resmi • Support Gambar, Stiker, GIF & WebM</div>' +
          '</div>' +
        '</div>' +
        '<button class="btn" style="margin-top:12px" data-act="core-shop-modal">+ PAJANG PRODUK DI ETALASE</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">' +
        (cardsHtml || '<div class="card" style="grid-column:1/-1"><p class="sub">Etalase masih kosong. Jadi pelapak pertama di markas!</p></div>') +
      '</div>';
    }

    if (id === 'rules' || id === 'pasal' || id === 'help') {
      var rh = S.rulesHelp || {};
      var pasalTxt = esc(rh.pasal || '1. Saling hargai sesama warga markas.\n2. Dilarang spam link judi, scam, atau SARA.\n3. Gunakan fitur Radio Gang dengan tertib saat OS.').replace(/\n/g, '<br>');
      var helpTxt = esc(rh.help || '• Cetak PunkID di menu utama.\n• Request lagu Spotify lewat Radio Gang atau kirim file MP3 langsung ke PC Bot Mas Raka.').replace(/\n/g, '<br>');

      return '<div class="card">' +
        '<h3>📜 Pasal & Aturan Tongkrongan</h3>' +
        '<p class="sub" style="line-height:1.6;margin-top:8px">' + pasalTxt + '</p>' +
      '</div>' +
      '<div class="card" style="margin-top:12px">' +
        '<h3>🆘 Pusat Bantuan (Help)</h3>' +
        '<p class="sub" style="line-height:1.6;margin-top:8px">' + helpTxt + '</p>' +
      '</div>';
    }

    if (id === 'dalang') {
      var st = S.adminStats || { totalUsers: 0, totalWaitingRadio: 0, users: [] };
      var userRows = (st.users || []).map(function (usr) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)">' +
          '<div>' +
            '<b>' + esc(usr.name) + '</b> <small style="opacity:.7">(' + esc(usr.role || 'member') + ')</small>' +
            '<div style="font-size:11px;color:#FFD633">Saldo: ' + (usr.cred || 0) + ' PSC • ID: ' + esc(usr.id) + '</div>' +
          '</div>' +
          '<button class="pill" data-act="core-admin-coin-modal" data-uid="' + esc(usr.id) + '" data-uname="' + esc(usr.name) + '">+/- Koin</button>' +
        '</div>';
      }).join('') || '<p class="sub">Memuat daftar warga...</p>';

      return '<div class="card">' +
        '<h3>👑 Ruang Dalang (Admin Panel)</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">' +
          '<div style="background:rgba(255,255,255,.05);padding:10px;border-radius:10px"><small>TOTAL WARGA</small><div style="font-size:18px;font-weight:800">' + st.totalUsers + '</div></div>' +
          '<div style="background:rgba(255,255,255,.05);padding:10px;border-radius:10px"><small>ANTREAN RADIO</small><div style="font-size:18px;font-weight:800">' + st.totalWaitingRadio + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:12px">' +
        '<h3>💰 Kelola Saldo PSC & Warga</h3>' +
        userRows +
      '</div>';
    }

    return '<div class="emp">' + ico(id) + 'Modul dalam pengembangan.</div>';
  }

  function openApp(id, el) {
    if (id === 'grup' || id === 'group') {
      return openExternalLink(CFG.GROUP_URL, 'Grup Markas');
    }
    if (id === 'channel' || id === 'ch') {
      return openExternalLink(CFG.CHANNEL_URL, 'Channel Markas');
    }

    if (!S.user) {
      $('home').classList.remove('shake');
      void $('home').offsetWidth;
      $('home').classList.add('shake');
      return openWelcomeSheet();
    }

    S.curApp = id;
    var av = $('av');
    if (el) {
      var a = el.getBoundingClientRect(), p = $('ph').getBoundingClientRect();
      av.style.transformOrigin = (a.left + a.width / 2 - p.left) + 'px ' + (a.top + a.height / 2 - p.top) + 'px';
    }
    var meta = (CFG.ICONS && CFG.ICONS[id]) || [id];
    $('lt').textContent = $('nt').textContent = meta[0];
    $('nav-extra').innerHTML = '';

    if (id === 'lapakwarga') {
      API.get('/api/shop').then(function (r) {
        S.market = r.items || [];
        if (S.curApp === 'lapakwarga') refresh();
      }).catch(function () {});
    }

    if (id === 'rules' || id === 'pasal' || id === 'help') {
      API.get('/api/rules-help').then(function (r) {
        S.rulesHelp = r || {};
        if (S.curApp === id) refresh();
      }).catch(function () {});
    }

    if (id === 'dalang') {
      API.get('/api/admin/stats').then(function (r) {
        S.adminStats = r || { totalUsers: 0, totalWaitingRadio: 0, users: [] };
        if (S.curApp === 'dalang') refresh();
      }).catch(function () {});
    }

    $('bd').innerHTML = Views[id] ? Views[id]() : getFallbackView(id);
    bindDrag($('bd'));
    $('sc').scrollTop = 0;
    $('nav').classList.remove('s');
    av.classList.add('open');
    $('home').classList.add('bk');
  }

  function refresh() {
    if (S.curApp) {
      $('bd').innerHTML = Views[S.curApp] ? Views[S.curApp]() : getFallbackView(S.curApp);
      bindDrag($('bd'));
    }
    renderHome();
  }

  function openWelcomeSheet() {
    var tgUser = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
    var defName = ((tgUser.first_name || '') + ' ' + (tgUser.last_name || '')).trim() || 'Warga Baru';
    sheet(
      '<h1>NEW CHARACTER UNLOCKED!</h1>' +
      '<p class="sub">Akun Telegram lo otomatis terdeteksi. Konfirmasi nama tongkrongan buat cetak <i>PunkID</i> resmi.</p>' +
      '<label for="nk">NAMA TONGKRONGAN (AUTO-SYNC TELE)</label>' +
      '<input id="nk" maxlength="24" value="' + esc(defName.slice(0, 24)) + '" autocomplete="off">' +
      '<button class="btn" data-act="core-reg">AKTIFKAN PUNKID</button>'
    );
  }

  async function syncFromServer(silent) {
    var dot = $('sync-dot');
    try {
      var data = await API.get('/api/me');
      if (dot) dot.style.background = '#34C759';

      if (data.config) {
        CFG.GROUP_URL = data.config.groupUrl || CFG.GROUP_URL || '';
        CFG.CHANNEL_URL = data.config.channelUrl || CFG.CHANNEL_URL || '';
      }

      if (data.user) {
        S.user = data.user;
        S.inv = data.inv || [];
        S.catalog = data.catalog || CFG.DEFAULT_ITEMS || [];
        S.onlineUsers = data.onlineUsers || [];
        S.feed = data.feed || [];
        S.missions = data.missions || [];
        S.events = data.events || [];
        S.wanted = data.wanted || [];
        S.polls = data.polls || [];
        refresh();

        if (!silent) {
          var startParam = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
          if (startParam && (Views[startParam] || (CFG.ICONS && CFG.ICONS[startParam]))) {
            openApp(startParam);
          }
        }
      } else {
        S.catalog = data.catalog || CFG.DEFAULT_ITEMS || [];
        renderHome();
        openWelcomeSheet();
      }
    } catch (err) {
      if (dot) dot.style.background = '#FF453A';
      renderHome();
      if (!silent) {
        notify('Mas Raka', 'Offline Mode', 'Gagal terhubung ke Railway. Pastikan API_URL sudah benar.');
      }
    }
  }

  // Global Event Listeners
  document.addEventListener('click', async function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'app') {
      openApp(t.getAttribute('data-id'), t);
    } else if (act === 'close') {
      $('av').classList.remove('open');
      $('home').classList.remove('bk');
      S.curApp = '';
    } else if (act === 'shut') {
      shut();
    } else if (act === 'core-reg') {
      var name = ($('nk').value || '').trim();
      if (name.length < 2) return;
      t.disabled = true;
      try {
        var res = await API.post('/api/register', { name: name });
        S.user = res.user;
        S.inv = res.inv || [];
        shut();
        refresh();
        notify('Mas Raka', '→ Grup Punkshit', 'NEW CHARACTER UNLOCKED! ' + S.user.name + ' resmi jadi warga.');
        setTimeout(function () { openApp('gue'); }, 600);
      } catch (err) {
        t.disabled = false;
        notify('Mas Raka', 'Error', err.message);
      }
    } else if (act === 'core-absen') {
      t.disabled = true;
      try {
        var resAbs = await API.post('/api/absen', {});
        S.user = resAbs.user;
        if (resAbs.feed) S.feed = resAbs.feed;
        refresh();
        notify('Mas Raka', 'Absen Nyawa', resAbs.message || ('+' + resAbs.earned + ' PSC masuk!'));
      } catch (err) {
        t.disabled = false;
        notify('Mas Raka', 'Gagal Absen', err.message);
      }
    } else if (act === 'core-capsule') {
      var unlockDate = ($('cap-date').value || '').trim();
      var message = ($('cap-msg').value || '').trim();
      if (!unlockDate || message.length < 5) {
        return notify('Mas Raka', 'Lengkapi Data', 'Tanggal dan pesan minimal 5 karakter.');
      }
      t.disabled = true;
      try {
        await API.post('/api/capsule', { unlockDate: unlockDate, message: message });
        $('cap-msg').value = '';
        notify('Mas Raka', 'Time Capsule', 'Pesan berhasil disegel sampai ' + unlockDate + '!');
      } catch (err) {
        notify('Mas Raka', 'Error', err.message);
      } finally {
        t.disabled = false;
      }
    } else if (act === 'core-shop-modal') {
      sheet(
        '<h2>🛍️ Pajang Produk di Etalase</h2>' +
        '<label>NAMA PRODUK / JASA</label>' +
        '<input id="sh-title" maxlength="60" placeholder="Contoh: Stiker Pack / Akun / Jasa">' +
        '<label>HARGA (PSC)</label>' +
        '<input id="sh-price" type="number" min="0" placeholder="Contoh: 50">' +
        '<label>KATEGORI</label>' +
        '<select id="sh-cat"><option value="Barang">Barang</option><option value="Stiker / GIF">Stiker / GIF</option><option value="Jasa">Jasa</option></select>' +
        '<label>FOTO / GIF / WEBM PRODUK</label>' +
        '<input id="sh-file" type="file" accept="image/*,video/webm,.gif,.webm">' +
        '<label>DESKRIPSI</label>' +
        '<textarea id="sh-desc" rows="2" maxlength="200" placeholder="Keterangan produk..."></textarea>' +
        '<button class="btn" data-act="core-shop-submit">UPLOAD KE ETALASE</button>'
      );
    } else if (act === 'core-shop-submit') {
      var title = ($('sh-title').value || '').trim();
      var price = Number($('sh-price').value) || 0;
      var category = $('sh-cat').value;
      var description = ($('sh-desc').value || '').trim();
      var fileInput = $('sh-file');

      if (title.length < 3) return notify('Mas Raka', 'Lapak Warga', 'Nama produk minimal 3 karakter.');
      t.disabled = true;

      try {
        var fd = new FormData();
        fd.append('title', title);
        fd.append('price', String(price));
        fd.append('category', category);
        fd.append('description', description);
        if (fileInput && fileInput.files && fileInput.files[0]) {
          fd.append('media', fileInput.files[0]);
        }

        var token = (tg && tg.initData) || '';
        var resp = await fetch(CFG.API_URL + '/api/shop', {
          method: 'POST',
          headers: { 'x-telegram-init-data': token },
          body: fd
        });
        var json = await resp.json();
        if (!resp.ok) throw new Error(json.error || 'Gagal upload produk.');

        shut();
        var listRes = await API.get('/api/shop');
        S.market = listRes.items || [];
        refresh();
        notify('Mas Raka', 'Lapak Warga', 'Produk "' + title + '" berhasil dipajang di etalase!');
      } catch (err) {
        t.disabled = false;
        notify('Mas Raka', 'Gagal Upload', err.message);
      }
    } else if (act === 'core-admin-coin-modal') {
      var uid = t.getAttribute('data-uid');
      var uname = t.getAttribute('data-uname');
      sheet(
        '<h2>💰 Atur Koin PSC</h2>' +
        '<p class="sub">Warga: <b>' + esc(uname) + '</b></p>' +
        '<label>NOMINAL KOIN (Gunakan tanda minus - untuk mengurangi)</label>' +
        '<input id="adm-coin-amt" type="number" placeholder="Contoh: 100 atau -50">' +
        '<button class="btn" data-act="core-admin-coin-submit" data-uid="' + esc(uid) + '">SIMPAN PERUBAHAN KOIN</button>'
      );
    } else if (act === 'core-admin-coin-submit') {
      var targetUid = t.getAttribute('data-uid');
      var amt = Number($('adm-coin-amt').value);
      if (!amt) return notify('Mas Raka', 'Admin', 'Masukkan nominal koin dulu.');
      t.disabled = true;
      try {
        await API.post('/api/admin/add-coin', { targetUserId: targetUid, amount: amt });
        shut();
        var statsRes = await API.get('/api/admin/stats');
        S.adminStats = statsRes;
        refresh();
        notify('Mas Raka', 'Admin Panel', 'Saldo koin warga berhasil diperbarui!');
      } catch (err) {
        t.disabled = false;
        notify('Mas Raka', 'Error', err.message);
      }
    } else if (act === 'search') {
      openApp('warga');
    }
  });

  $('sc').onscroll = function () {
    $('nav').classList.toggle('s', $('sc').scrollTop > 34);
  };

  function tickClock() {
    var d = new Date();
    $('clk').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  tickClock();
  setInterval(tickClock, 20000);

  try {
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor('#0a0f1c');
    }
  } catch (e) {}

  renderHome();
  syncFromServer(false);

  return {
    S: S,
    Views: Views,
    esc: esc,
    ico: ico,
    rankInfo: rankInfo,
    findItem: findItem,
    renderItemVisual: renderItemVisual,
    renderAvatar: renderAvatar,
    bindDrag: bindDrag,
    notify: notify,
    sheet: sheet,
    shut: shut,
    openApp: openApp,
    refresh: refresh,
    sync: syncFromServer
  };
})();
